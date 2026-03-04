import * as assert from "node:assert/strict"
import { describe, it } from "node:test"

import { NotFoundException } from "@nestjs/common"

import { GoalsService } from "../../src/goals/goals.service"

describe("GoalsService", () => {
  it("list retorna paginacao e metricas de progresso", async () => {
    const now = Date.now()
    const targetDate = new Date(now + 10 * 24 * 60 * 60 * 1000)

    const queryResponses: any[] = [
      [{ total: 1 }],
      [
        {
          id: "goal-1",
          name: "Reserva de emergencia",
          target_cents: 100_000,
          current_cents: 25_000,
          target_date: targetDate,
          created_at: new Date("2026-02-01T00:00:00.000Z"),
          updated_at: new Date("2026-02-01T00:00:00.000Z"),
        },
      ],
    ]

    const prisma = {
      $queryRaw: async () => queryResponses.shift() ?? [],
      $executeRaw: async () => 0,
    }

    const service = new GoalsService(prisma as any)
    const result = await service.list("user-1", { page: 1, pageSize: 10 })

    assert.equal(result.total, 1)
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].progressPercent, 25)
    assert.equal(result.items[0].remainingCents, 75_000)
    assert.equal(result.items[0].completed, false)
    assert.equal(typeof result.items[0].daysRemaining, "number")
    assert.ok(result.items[0].daysRemaining >= 9)
    assert.ok(result.items[0].daysRemaining <= 10)
  })

  it("create aplica trim no nome", async () => {
    const targetDate = new Date("2026-12-31T00:00:00.000Z")

    const capturedSqlArgs: any[] = []
    const prisma = {
      $queryRaw: async (...args: any[]) => {
        capturedSqlArgs.push(args)
        const sqlInput = args[0] as any
        const values: unknown[] = Array.isArray(sqlInput?.values) ? sqlInput.values : []
        const insertedName = typeof values[2] === "string" ? values[2] : ""

        return [
          {
            id: "goal-1",
            name: insertedName,
            targetCents: 150_000,
            currentCents: 0,
            targetDate,
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
            updatedAt: new Date("2026-02-01T00:00:00.000Z"),
          },
        ]
      },
      $executeRaw: async () => 0,
    }

    const service = new GoalsService(prisma as any)
    const result = await service.create("user-1", {
      name: "  Reserva  ",
      targetCents: 150_000,
      targetDate,
    })

    assert.equal(result.name, "Reserva")
    assert.equal(result.currentCents, 0)
    assert.equal(capturedSqlArgs.length, 1)
  })

  it("update retorna not found quando meta nao existe", async () => {
    const prisma = {
      $queryRaw: async () => [],
      $executeRaw: async () => 0,
    }

    const service = new GoalsService(prisma as any)

    await assert.rejects(
      () =>
        service.update("user-1", "goal-missing", {
          currentCents: 10_000,
        }),
      (error) => error instanceof NotFoundException,
    )
  })

  it("remove retorna not found quando nenhuma linha e removida", async () => {
    const prisma = {
      $queryRaw: async () => [],
      $executeRaw: async () => 0,
    }

    const service = new GoalsService(prisma as any)

    await assert.rejects(
      () => service.remove("user-1", "goal-missing"),
      (error) => error instanceof NotFoundException,
    )
  })

  it("remove retorna ok quando deleta com sucesso", async () => {
    const prisma = {
      $queryRaw: async () => [],
      $executeRaw: async () => 1,
    }

    const service = new GoalsService(prisma as any)
    const result = await service.remove("user-1", "goal-1")

    assert.deepEqual(result, { ok: true })
  })
})
