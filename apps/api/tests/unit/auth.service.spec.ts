import * as assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { describe, it } from "node:test"

import { ConflictException, UnauthorizedException } from "@nestjs/common"

import { AuthService } from "../../src/auth/auth.service"

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex")
}

function createConfigMock(overrides?: Record<string, unknown>) {
  const values: Record<string, unknown> = {
    JWT_ACCESS_SECRET: "unit-access-secret",
    JWT_ACCESS_EXPIRES_IN: "15m",
    REFRESH_TOKEN_TTL_DAYS: 30,
    ...overrides,
  }

  return {
    get(key: string) {
      return values[key]
    },
  }
}

describe("AuthService", () => {
  it("register normaliza email/nome, hash de senha e emite tokens", async () => {
    const calls: Record<string, any[]> = {
      userCreate: [],
      refreshCreate: [],
      jwtSign: [],
    }

    const prisma = {
      user: {
        findUnique: async () => null,
        create: async (args: any) => {
          calls.userCreate.push(args)
          return { id: "u-1", email: args.data.email, name: args.data.name }
        },
      },
      refreshToken: {
        create: async (args: any) => {
          calls.refreshCreate.push(args)
          return { id: "rt-1" }
        },
      },
    }

    const jwt = {
      signAsync: async (...args: any[]) => {
        calls.jwtSign.push(args)
        return "access-token-1"
      },
    }

    const service = new AuthService(prisma as any, jwt as any, createConfigMock() as any)

    const result = await service.register({
      email: "  USER@Example.COM ",
      password: "123456",
      name: "  Dias  ",
    })

    assert.equal(result.user.email, "user@example.com")
    assert.equal(result.user.name, "Dias")
    assert.equal(result.accessToken, "access-token-1")
    assert.equal(typeof result.refreshToken, "string")
    assert.ok(result.refreshToken.length > 20)

    assert.equal(calls.userCreate.length, 1)
    assert.equal(calls.userCreate[0].data.email, "user@example.com")
    assert.equal(calls.userCreate[0].data.name, "Dias")
    assert.notEqual(calls.userCreate[0].data.passwordHash, "123456")

    assert.equal(calls.refreshCreate.length, 1)
    assert.equal(calls.refreshCreate[0].data.userId, "u-1")
    assert.equal(typeof calls.refreshCreate[0].data.tokenHash, "string")
    assert.equal(calls.refreshCreate[0].data.tokenHash.length, 64)
    assert.ok(calls.refreshCreate[0].data.expiresAt instanceof Date)
    assert.equal(calls.jwtSign.length, 1)
  })

  it("register retorna conflito quando email ja existe", async () => {
    const prisma = {
      user: {
        findUnique: async () => ({ id: "existing-user" }),
      },
      refreshToken: {
        create: async () => ({ id: "unused" }),
      },
    }

    const jwt = {
      signAsync: async () => "unused",
    }

    const service = new AuthService(prisma as any, jwt as any, createConfigMock() as any)

    await assert.rejects(
      () => service.register({ email: "a@b.com", password: "123456" }),
      (error) => error instanceof ConflictException,
    )
  })

  it("refresh valida hash, rotaciona token e revoga token anterior", async () => {
    const oldRawToken = "refresh-token-old"
    const calls: Record<string, any[]> = {
      refreshFindUnique: [],
      refreshCreate: [],
      refreshUpdate: [],
      jwtSign: [],
    }

    const prisma = {
      refreshToken: {
        findUnique: async (args: any) => {
          calls.refreshFindUnique.push(args)
          return {
            id: "rt-old",
            userId: "u-1",
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            user: { id: "u-1", email: "user@example.com", name: "Dias" },
          }
        },
        create: async (args: any) => {
          calls.refreshCreate.push(args)
          return { id: "rt-new" }
        },
        update: async (args: any) => {
          calls.refreshUpdate.push(args)
          return { id: "rt-old" }
        },
      },
      user: {
        findUnique: async () => null,
      },
    }

    const jwt = {
      signAsync: async (...args: any[]) => {
        calls.jwtSign.push(args)
        return "access-token-rotated"
      },
    }

    const service = new AuthService(prisma as any, jwt as any, createConfigMock() as any)
    const result = await service.refresh(oldRawToken)

    assert.equal(result.accessToken, "access-token-rotated")
    assert.equal(typeof result.refreshToken, "string")
    assert.notEqual(result.refreshToken, oldRawToken)
    assert.ok(result.refreshToken.length > 20)

    assert.equal(calls.refreshFindUnique.length, 1)
    assert.equal(calls.refreshFindUnique[0].where.tokenHash, sha256(oldRawToken))
    assert.equal(calls.refreshCreate.length, 1)
    assert.equal(calls.refreshCreate[0].data.userId, "u-1")
    assert.equal(calls.refreshUpdate.length, 1)
    assert.equal(calls.refreshUpdate[0].where.id, "rt-old")
    assert.equal(calls.refreshUpdate[0].data.replacedByTokenId, "rt-new")
    assert.ok(calls.refreshUpdate[0].data.revokedAt instanceof Date)
    assert.equal(calls.jwtSign.length, 1)
  })

  it("refresh falha para token expirado", async () => {
    const prisma = {
      refreshToken: {
        findUnique: async () => ({
          id: "rt-old",
          userId: "u-1",
          revokedAt: null,
          expiresAt: new Date(Date.now() - 1_000),
          user: { id: "u-1", email: "user@example.com", name: "Dias" },
        }),
      },
      user: {
        findUnique: async () => null,
      },
    }

    const jwt = {
      signAsync: async () => "unused",
    }

    const service = new AuthService(prisma as any, jwt as any, createConfigMock() as any)

    await assert.rejects(
      () => service.refresh("expired-refresh"),
      (error) => error instanceof UnauthorizedException,
    )
  })
})
