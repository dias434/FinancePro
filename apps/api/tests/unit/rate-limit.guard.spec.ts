import * as assert from "node:assert/strict"
import { describe, it } from "node:test"

import { HttpException, HttpStatus } from "@nestjs/common"

import { RateLimitGuard } from "../../src/common/guards/rate-limit.guard"

function createConfigMock(values: Record<string, unknown>) {
  return {
    get(key: string) {
      return values[key]
    },
  }
}

function createJwtMock(verifyFn?: (token: string) => unknown) {
  return {
    verify(token: string) {
      if (!verifyFn) throw new Error("Invalid token")
      return verifyFn(token)
    },
  }
}

function createResponseMock() {
  const headers = new Map<string, string>()
  return {
    setHeader(name: string, value: string) {
      headers.set(name, String(value))
    },
    getHeader(name: string) {
      return headers.get(name)
    },
  }
}

function createHttpContext(input: {
  path: string
  ip?: string
  authHeader?: string
  response?: any
}) {
  const req = {
    path: input.path,
    url: input.path,
    ip: input.ip ?? "127.0.0.1",
    headers: {
      ...(input.authHeader ? { authorization: input.authHeader } : null),
    },
    socket: { remoteAddress: input.ip ?? "127.0.0.1" },
  }

  const res = input.response ?? createResponseMock()

  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as any,
    response: res,
  }
}

describe("RateLimitGuard", () => {
  const isTooManyRequests = (error: unknown) =>
    error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS

  it("ignora /health no contador global", () => {
    const guard = new RateLimitGuard(
      createConfigMock({
        JWT_ACCESS_SECRET: "test-secret",
        RATE_LIMIT_IP_WINDOW_MS: 60_000,
        RATE_LIMIT_IP_MAX_REQUESTS: 1,
      }) as any,
      createJwtMock() as any,
    )

    const health = createHttpContext({ path: "/health", ip: "1.1.1.1" })
    assert.equal(guard.canActivate(health.context), true)

    const firstApi = createHttpContext({ path: "/transactions", ip: "1.1.1.1" })
    assert.equal(guard.canActivate(firstApi.context), true)

    const secondApi = createHttpContext({ path: "/transactions", ip: "1.1.1.1" })
    assert.throws(
      () => guard.canActivate(secondApi.context),
      (error) => isTooManyRequests(error),
    )
  })

  it("aplica limite por IP", () => {
    const guard = new RateLimitGuard(
      createConfigMock({
        JWT_ACCESS_SECRET: "test-secret",
        RATE_LIMIT_IP_WINDOW_MS: 60_000,
        RATE_LIMIT_IP_MAX_REQUESTS: 2,
      }) as any,
      createJwtMock() as any,
    )

    assert.equal(guard.canActivate(createHttpContext({ path: "/accounts", ip: "2.2.2.2" }).context), true)
    assert.equal(guard.canActivate(createHttpContext({ path: "/accounts", ip: "2.2.2.2" }).context), true)

    const third = createHttpContext({ path: "/accounts", ip: "2.2.2.2" })
    assert.throws(
      () => guard.canActivate(third.context),
      (error) => isTooManyRequests(error),
    )
    assert.equal(typeof third.response.getHeader("Retry-After"), "string")
  })

  it("aplica limite por usuario autenticado mesmo com IPs diferentes", () => {
    const guard = new RateLimitGuard(
      createConfigMock({
        JWT_ACCESS_SECRET: "test-secret",
        RATE_LIMIT_IP_WINDOW_MS: 60_000,
        RATE_LIMIT_IP_MAX_REQUESTS: 100,
        RATE_LIMIT_USER_WINDOW_MS: 60_000,
        RATE_LIMIT_USER_MAX_REQUESTS: 2,
      }) as any,
      createJwtMock((token) => {
        if (token === "valid-user-token") return { sub: "user-1" }
        throw new Error("Invalid token")
      }) as any,
    )

    assert.equal(
      guard.canActivate(
        createHttpContext({
          path: "/transactions",
          ip: "10.0.0.1",
          authHeader: "Bearer valid-user-token",
        }).context,
      ),
      true,
    )

    assert.equal(
      guard.canActivate(
        createHttpContext({
          path: "/transactions",
          ip: "10.0.0.2",
          authHeader: "Bearer valid-user-token",
        }).context,
      ),
      true,
    )

    const third = createHttpContext({
      path: "/transactions",
      ip: "10.0.0.3",
      authHeader: "Bearer valid-user-token",
    })
    assert.throws(
      () => guard.canActivate(third.context),
      (error) => isTooManyRequests(error),
    )
  })

  it("aplica limite mais restrito para rotas de autenticacao por IP", () => {
    const guard = new RateLimitGuard(
      createConfigMock({
        JWT_ACCESS_SECRET: "test-secret",
        RATE_LIMIT_IP_WINDOW_MS: 60_000,
        RATE_LIMIT_IP_MAX_REQUESTS: 100,
        RATE_LIMIT_AUTH_IP_WINDOW_MS: 60_000,
        RATE_LIMIT_AUTH_IP_MAX_REQUESTS: 1,
      }) as any,
      createJwtMock() as any,
    )

    assert.equal(guard.canActivate(createHttpContext({ path: "/auth/login", ip: "3.3.3.3" }).context), true)

    const second = createHttpContext({ path: "/auth/login", ip: "3.3.3.3" })
    assert.throws(
      () => guard.canActivate(second.context),
      (error) => isTooManyRequests(error),
    )
  })
})
