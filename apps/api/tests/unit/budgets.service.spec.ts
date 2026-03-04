import * as assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common"

import { BudgetsService } from "../../src/budgets/budgets.service"

describe("BudgetsService", () => {
  it("list calcula consumo, restante e alertas", async () => {
    const queryResponses: any[] = [
      [{ total: 1 }],
      [
        {
          id: "budget-1",
          month: new Date("2026-03-01T00:00:00.000Z"),
          limit_cents: 10_000,
          alert_percent: 40,
          created_at: new Date("2026-03-01T00:00:00.000Z"),
          updated_at: new Date("2026-03-05T00:00:00.000Z"),
          category_id: "cat-1",
          category_name: "Alimentacao",
          category_type: "EXPENSE",
          category_icon: "utensils",
          category_color: "#ff6600",
        },
      ],
      [
        {
          category_id: "cat-1",
          month_start: new Date("2026-03-01T00:00:00.000Z"),
          consumed_cents: 4_300,
        },
      ],
    ]

    const prisma = {
      $queryRaw: async () => queryResponses.shift() ?? [],
      category: {
        findFirst: async () => null,
      },
      $executeRaw: async () => 0,
    }

    const service = new BudgetsService(prisma as any)
    const result = await service.list("user-1", {
      year: 2026,
      month: 3,
      page: 1,
      pageSize: 20,
    })

    assert.equal(result.total, 1)
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].consumedCents, 4300)
    assert.equal(result.items[0].remainingCents, 5700)
    assert.equal(result.items[0].usedPercent, 43)
    assert.equal(result.items[0].alertReached, true)
    assert.equal(result.items[0].overLimit, false)
    assert.equal(result.items[0].category.id, "cat-1")
  })

  it("create rejeita categoria que nao e EXPENSE", async () => {
    const prisma = {
      category: {
        findFirst: async () => ({
          id: "cat-1",
          name: "Salario",
          type: "INCOME",
          icon: null,
          color: null,
        }),
      },
      $queryRaw: async () => [],
      $executeRaw: async () => 0,
    }

    const service = new BudgetsService(prisma as any)

    await assert.rejects(
      () =>
        service.create("user-1", {
          categoryId: "cat-1",
          year: 2026,
          month: 3,
          limitCents: 10_000,
        }),
      (error) => error instanceof BadRequestException,
    )
  })

  it("create converte erro 23505 para conflict", async () => {
    const prisma = {
      category: {
        findFirst: async () => ({
          id: "cat-1",
          name: "Alimentacao",
          type: "EXPENSE",
          icon: null,
          color: null,
        }),
      },
      $queryRaw: async () => {
        throw { code: "23505" }
      },
      $executeRaw: async () => 0,
    }

    const service = new BudgetsService(prisma as any)

    await assert.rejects(
      () =>
        service.create("user-1", {
          categoryId: "cat-1",
          year: 2026,
          month: 3,
          limitCents: 10_000,
        }),
      (error) => error instanceof ConflictException,
    )
  })

  it("update retorna not found quando budget nao existe", async () => {
    const prisma = {
      $queryRaw: async () => [],
      category: {
        findFirst: async () => null,
      },
      $executeRaw: async () => 0,
    }

    const service = new BudgetsService(prisma as any)

    await assert.rejects(
      () =>
        service.update("user-1", "budget-missing", {
          limitCents: 20_000,
        }),
      (error) => error instanceof NotFoundException,
    )
  })

  it("remove falha com not found quando nao deleta linhas", async () => {
    const prisma = {
      $executeRaw: async () => 0,
      $queryRaw: async () => [],
      category: {
        findFirst: async () => null,
      },
    }

    const service = new BudgetsService(prisma as any)

    await assert.rejects(
      () => service.remove("user-1", "budget-missing"),
      (error) => error instanceof NotFoundException,
    )
  })

  it("remove retorna ok quando exclusao acontece", async () => {
    const prisma = {
      $executeRaw: async () => 1,
      $queryRaw: async () => [],
      category: {
        findFirst: async () => null,
      },
    }

    const service = new BudgetsService(prisma as any)
    const result = await service.remove("user-1", "budget-1")

    assert.deepEqual(result, { ok: true })
  })
})
