import * as assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common"

import { TransactionsService } from "../../src/transactions/transactions.service"

describe("TransactionsService", () => {
  it("list falha com data invalida no filtro", async () => {
    const prisma = {
      $transaction: async () => [0, []],
      transaction: {
        count: async () => 0,
        findMany: async () => [],
      },
    }

    const service = new TransactionsService(prisma as any)

    await assert.rejects(
      () => service.list("user-1", { from: "not-a-date" }),
      (error) => error instanceof BadRequestException,
    )
  })

  it("list monta filtro de accountId para origem e destino", async () => {
    const calls: Record<string, any[]> = { count: [], findMany: [] }

    const prisma = {
      $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
      transaction: {
        count: async (args: any) => {
          calls.count.push(args)
          return 1
        },
        findMany: async (args: any) => {
          calls.findMany.push(args)
          return [
            {
              id: "tx-1",
              type: "TRANSFER",
              occurredAt: new Date("2026-02-01T00:00:00.000Z"),
              amountCents: 1200,
              accountId: "acc-1",
              transferAccountId: "acc-2",
              categoryId: null,
              description: "Transferencia",
              createdAt: new Date("2026-02-01T00:00:00.000Z"),
              updatedAt: new Date("2026-02-01T00:00:00.000Z"),
              account: { id: "acc-1", name: "Carteira", type: "CASH", currency: "BRL" },
              transferAccount: { id: "acc-2", name: "Banco", type: "BANK", currency: "BRL" },
              category: null,
            },
          ]
        },
      },
    }

    const service = new TransactionsService(prisma as any)
    const result = await service.list("user-1", { accountId: "acc-1", page: 1, pageSize: 10 })

    assert.equal(result.total, 1)
    assert.equal(result.items.length, 1)
    assert.equal(calls.count.length, 1)
    assert.deepEqual(calls.count[0].where.OR, [{ accountId: "acc-1" }, { transferAccountId: "acc-1" }])
    assert.equal(calls.findMany[0].take, 10)
  })

  it("create exige conta de destino em transferencias", async () => {
    const prisma = {
      account: {
        findFirst: async () => ({ id: "acc-1", userId: "user-1" }),
      },
      category: {
        findFirst: async () => null,
      },
      transaction: {
        create: async () => ({ id: "should-not-run" }),
      },
    }

    const service = new TransactionsService(prisma as any)

    await assert.rejects(
      () =>
        service.create("user-1", {
          type: "TRANSFER",
          occurredAt: new Date("2026-02-01T00:00:00.000Z"),
          amountCents: 1000,
          accountId: "acc-1",
        }),
      (error) => error instanceof UnprocessableEntityException,
    )
  })

  it("create bloqueia transferAccountId em INCOME/EXPENSE", async () => {
    const prisma = {
      account: {
        findFirst: async () => ({ id: "acc-1", userId: "user-1" }),
      },
      category: {
        findFirst: async () => null,
      },
      transaction: {
        create: async () => ({ id: "should-not-run" }),
      },
    }

    const service = new TransactionsService(prisma as any)

    await assert.rejects(
      () =>
        service.create("user-1", {
          type: "INCOME",
          occurredAt: new Date("2026-02-01T00:00:00.000Z"),
          amountCents: 1000,
          accountId: "acc-1",
          transferAccountId: "acc-2",
        }),
      (error) => error instanceof UnprocessableEntityException,
    )
  })

  it("update retorna not found para transacao inexistente", async () => {
    const prisma = {
      transaction: {
        findFirst: async () => null,
      },
      account: {
        findFirst: async () => ({ id: "acc-1", userId: "user-1" }),
      },
      category: {
        findFirst: async () => ({ id: "cat-1", userId: "user-1" }),
      },
    }

    const service = new TransactionsService(prisma as any)

    await assert.rejects(
      () =>
        service.update("user-1", "tx-missing", {
          amountCents: 2000,
        }),
      (error) => error instanceof NotFoundException,
    )
  })

  it("create persiste INCOME com categoria e descricao sanitizada", async () => {
    const calls: Record<string, any[]> = { categoryFindFirst: [], transactionCreate: [] }

    const prisma = {
      account: {
        findFirst: async () => ({ id: "acc-1", userId: "user-1" }),
      },
      category: {
        findFirst: async (args: any) => {
          calls.categoryFindFirst.push(args)
          return { id: "cat-1", userId: "user-1" }
        },
      },
      transaction: {
        create: async (args: any) => {
          calls.transactionCreate.push(args)
          return {
            id: "tx-1",
            type: "INCOME",
            occurredAt: new Date("2026-02-10T00:00:00.000Z"),
            amountCents: 5500,
            accountId: "acc-1",
            categoryId: "cat-1",
            transferAccountId: null,
            description: "Salario",
            createdAt: new Date("2026-02-10T00:00:00.000Z"),
            updatedAt: new Date("2026-02-10T00:00:00.000Z"),
          }
        },
      },
    }

    const service = new TransactionsService(prisma as any)
    const result = (await service.create("user-1", {
      type: "INCOME",
      occurredAt: new Date("2026-02-10T00:00:00.000Z"),
      amountCents: 5500,
      accountId: "acc-1",
      categoryId: "cat-1",
      description: "  Salario  ",
    })) as any

    assert.equal(result.id, "tx-1")
    assert.equal(result.categoryId, "cat-1")
    assert.equal(result.description, "Salario")
    assert.equal(calls.categoryFindFirst.length, 1)
    assert.equal(calls.transactionCreate.length, 1)
    assert.equal(calls.transactionCreate[0].data.transferAccountId, null)
    assert.equal(calls.transactionCreate[0].data.description, "Salario")
  })

  it("create sanitiza campos customizados", async () => {
    const calls: Record<string, any[]> = { transactionCreate: [] }

    const prisma = {
      account: {
        findFirst: async () => ({ id: "acc-1", userId: "user-1", currency: "BRL" }),
      },
      category: {
        findFirst: async () => null,
      },
      transaction: {
        create: async (args: any) => {
          calls.transactionCreate.push(args)
          return {
            id: "tx-2",
            type: "EXPENSE",
            occurredAt: new Date("2026-02-11T00:00:00.000Z"),
            amountCents: 1234,
            accountId: "acc-1",
            categoryId: null,
            transferAccountId: null,
            description: "Almoco",
            tags: ["Trabalho", "Urgente"],
            costCenter: "Operacoes",
            notes: "Linha 1\nLinha 2",
            createdAt: new Date("2026-02-11T00:00:00.000Z"),
            updatedAt: new Date("2026-02-11T00:00:00.000Z"),
          }
        },
      },
    }

    const service = new TransactionsService(prisma as any)
    const result = (await service.create("user-1", {
      type: "EXPENSE",
      occurredAt: new Date("2026-02-11T00:00:00.000Z"),
      amountCents: 1234,
      accountId: "acc-1",
      description: "  Almoco  ",
      tags: [" Trabalho ", "trabalho", "Urgente"],
      costCenter: "  Operacoes  ",
      notes: " \nLinha 1\nLinha 2\n ",
    })) as any

    assert.deepEqual(result.tags, ["Trabalho", "Urgente"])
    assert.equal(result.costCenter, "Operacoes")
    assert.equal(result.notes, "Linha 1\nLinha 2")
    assert.equal(calls.transactionCreate[0].data.description, "Almoco")
    assert.deepEqual(calls.transactionCreate[0].data.tags, ["Trabalho", "Urgente"])
    assert.equal(calls.transactionCreate[0].data.costCenter, "Operacoes")
    assert.equal(calls.transactionCreate[0].data.notes, "Linha 1\nLinha 2")
  })

  it("create bloqueia transferencia entre moedas diferentes", async () => {
    const prisma = {
      account: {
        findFirst: async (args: any) =>
          args.where.id === "acc-1"
            ? { id: "acc-1", userId: "user-1", currency: "BRL" }
            : { id: "acc-2", userId: "user-1", currency: "USD" },
      },
      category: {
        findFirst: async () => null,
      },
      transaction: {
        create: async () => ({ id: "should-not-run" }),
      },
    }

    const service = new TransactionsService(prisma as any)

    await assert.rejects(
      () =>
        service.create("user-1", {
          type: "TRANSFER",
          occurredAt: new Date("2026-02-11T00:00:00.000Z"),
          amountCents: 1000,
          accountId: "acc-1",
          transferAccountId: "acc-2",
        }),
      (error) => error instanceof UnprocessableEntityException,
    )
  })
})
