import * as assert from "node:assert/strict"
import { describe, it } from "node:test"

import { BadRequestException, RequestTimeoutException } from "@nestjs/common"

import { ImportsService } from "../../src/imports/imports.service"

describe("ImportsService", () => {
  it("previewImport exige arquivo", async () => {
    const service = new ImportsService({} as any)

    await assert.rejects(
      () => service.previewImport("user-1", undefined, {} as any),
      (error) => error instanceof BadRequestException,
    )
  })

  it("previewImport parseia CSV e separa linhas validas/invalidas", async () => {
    const prisma = {
      $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
      account: {
        findMany: async () => [{ id: "acc-1", name: "Carteira" }],
      },
      category: {
        findMany: async () => [{ id: "cat-1", name: "Alimentacao" }],
      },
    }

    const service = new ImportsService(prisma as any)

    const file = {
      originalname: "import.csv",
      mimetype: "text/csv",
      size: 999,
      buffer: Buffer.from(
        "date,amount,description,account\n2026-02-01,10.50,Padaria,Carteira\n2026-02-02,abc,Linha invalida,Carteira",
        "utf8",
      ),
    }

    const result = await service.previewImport("user-1", file as any, {} as any)

    assert.equal(result.format, "CSV")
    assert.equal(result.totalRows, 2)
    assert.equal(result.validRows, 1)
    assert.equal(result.invalidRows, 1)
    assert.equal(result.sample.length, 2)
    assert.equal(result.sample[0]?.normalized?.amountCents, 1050)
    assert.equal(result.sample[0]?.normalized?.accountId, "acc-1")
    assert.equal(result.sample[1]?.normalized, null)
  })

  it("previewImport rejeita delimiter fora da lista permitida", async () => {
    const prisma = {
      $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
      account: {
        findMany: async () => [{ id: "acc-1", name: "Carteira" }],
      },
      category: {
        findMany: async () => [],
      },
    }

    const service = new ImportsService(prisma as any)

    const file = {
      originalname: "import.csv",
      mimetype: "text/csv",
      size: 999,
      buffer: Buffer.from("date,amount,account\n2026-02-01,10.00,Carteira", "utf8"),
    }

    await assert.rejects(
      () => service.previewImport("user-1", file as any, { format: "CSV", delimiter: ":" } as any),
      (error) => error instanceof BadRequestException,
    )
  })

  it("runImport deduplica linhas repetidas no mesmo arquivo", async () => {
    const calls: Record<string, any[]> = {
      transactionCreate: [],
      importLogItemCreateMany: [],
      importLogUpdate: [],
    }

    const prisma = {
      $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
      account: {
        findMany: async () => [{ id: "acc-1", name: "Carteira" }],
      },
      category: {
        findMany: async () => [],
      },
      transaction: {
        findMany: async () => [],
        create: async (args: any) => {
          calls.transactionCreate.push(args)
          return { id: "tx-1" }
        },
      },
      importLog: {
        create: async () => ({ id: "log-1" }),
        update: async (args: any) => {
          calls.importLogUpdate.push(args)

          const items = calls.importLogItemCreateMany.flatMap((call) => call.data)

          return {
            id: "log-1",
            status: args.data.status,
            totalRows: args.data.totalRows,
            importedRows: args.data.importedRows,
            duplicateRows: args.data.duplicateRows,
            errorRows: args.data.errorRows,
            completedAt: new Date("2026-02-26T00:00:00.000Z"),
            items,
          }
        },
      },
      importLogItem: {
        createMany: async (args: any) => {
          calls.importLogItemCreateMany.push(args)
          return { count: args.data.length }
        },
      },
    }

    const service = new ImportsService(prisma as any)

    const file = {
      originalname: "import.csv",
      mimetype: "text/csv",
      size: 999,
      buffer: Buffer.from(
        "date,amount,description,account\n2026-02-01,10.00,Cafe,Carteira\n2026-02-01,10.00,Cafe,Carteira",
        "utf8",
      ),
    }

    const result = await service.runImport("user-1", file as any, { format: "CSV" } as any)

    assert.equal(result.status, "COMPLETED")
    assert.equal(result.totals.totalRows, 2)
    assert.equal(result.totals.importedRows, 1)
    assert.equal(result.totals.duplicateRows, 1)
    assert.equal(result.totals.errorRows, 0)
    assert.equal(calls.transactionCreate.length, 1)
    assert.equal(calls.importLogItemCreateMany.length, 1)
    assert.equal(calls.importLogUpdate.length, 1)

    const statuses = calls.importLogItemCreateMany[0].data.map((item: any) => item.status)
    assert.deepEqual(statuses, ["IMPORTED", "DUPLICATE"])
  })

  it("runImport valida mime-type conforme formato informado", async () => {
    const prisma = {
      $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
      account: {
        findMany: async () => [{ id: "acc-1", name: "Carteira" }],
      },
      category: {
        findMany: async () => [],
      },
    }

    const service = new ImportsService(prisma as any)
    const file = {
      originalname: "import.ofx",
      mimetype: "text/csv",
      size: 999,
      buffer: Buffer.from("<OFX></OFX>", "utf8"),
    }

    await assert.rejects(
      () => service.runImport("user-1", file as any, { format: "OFX" } as any),
      (error) => error instanceof BadRequestException,
    )
  })

  it("rollbackLog retorna sem efeitos quando log ja esta ROLLED_BACK", async () => {
    let deleteManyCalls = 0
    let updateManyCalls = 0
    let updateLogCalls = 0

    const prisma = {
      importLog: {
        findFirst: async () => ({
          id: "log-1",
          status: "ROLLED_BACK",
          items: [],
        }),
        update: async () => {
          updateLogCalls += 1
          return { id: "log-1", status: "ROLLED_BACK", rolledBackAt: new Date() }
        },
      },
      importLogItem: {
        updateMany: async () => {
          updateManyCalls += 1
          return { count: 0 }
        },
      },
      transaction: {
        deleteMany: async () => {
          deleteManyCalls += 1
          return { count: 0 }
        },
      },
    }

    const service = new ImportsService(prisma as any)
    const result = await service.rollbackLog("user-1", "log-1")

    assert.equal(result.status, "ROLLED_BACK")
    assert.equal(result.deletedTransactions, 0)
    assert.equal(result.affectedRows, 0)
    assert.equal(deleteManyCalls, 0)
    assert.equal(updateManyCalls, 0)
    assert.equal(updateLogCalls, 0)
  })

  it("runImport respeita timeout de processamento configurado", async () => {
    const previousTimeout = process.env.IMPORT_PROCESSING_TIMEOUT_MS
    process.env.IMPORT_PROCESSING_TIMEOUT_MS = "5"

    try {
      const never = new Promise<unknown>(() => {})
      const prisma = {
        $transaction: async () => never,
        account: {
          findMany: async () => [{ id: "acc-1", name: "Carteira" }],
        },
        category: {
          findMany: async () => [],
        },
      }

      const service = new ImportsService(prisma as any)

      const file = {
        originalname: "import.csv",
        mimetype: "text/csv",
        size: 999,
        buffer: Buffer.from("date,amount,account\n2026-02-01,10.00,Carteira", "utf8"),
      }

      await assert.rejects(
        () => service.runImport("user-1", file as any, { format: "CSV" } as any),
        (error) => error instanceof RequestTimeoutException,
      )
    } finally {
      if (previousTimeout === undefined) {
        delete process.env.IMPORT_PROCESSING_TIMEOUT_MS
      } else {
        process.env.IMPORT_PROCESSING_TIMEOUT_MS = previousTimeout
      }
    }
  })

  it("exportTransactions falha para parametro from invalido", async () => {
    const prisma = {
      transaction: {
        findMany: async () => [],
      },
    }

    const service = new ImportsService(prisma as any)

    await assert.rejects(
      () =>
        service.exportTransactions("user-1", {
          format: "csv",
          from: "not-a-date",
        } as any),
      (error) => error instanceof BadRequestException,
    )
  })

  it("exportTransactions retorna CSV com delimitador ';' e dados formatados", async () => {
    const prisma = {
      transaction: {
        findMany: async () => [
          {
            occurredAt: new Date("2026-02-10T00:00:00.000Z"),
            createdAt: new Date("2026-02-10T00:00:00.000Z"),
            type: "EXPENSE",
            amountCents: 2599,
            accountId: "acc-1",
            description: "  Mercado   semana  ",
            account: { id: "acc-1", name: "Conta Principal" },
            category: { id: "cat-1", name: "Alimentacao" },
          },
        ],
      },
    }

    const service = new ImportsService(prisma as any)
    const result = await service.exportTransactions("user-1", { format: "csv" } as any)

    assert.equal(result.format, "csv")
    assert.equal(result.count, 1)
    assert.equal(result.mimeType, "text/csv; charset=utf-8")
    assert.ok(result.fileName.endsWith(".csv"))
    assert.ok(
      result.content.includes("date;type;amount;amountCents;currency;account;category;description;tags;costCenter;notes"),
    )
    assert.ok(
      result.content.includes("2026-02-10;EXPENSE;25.99;2599;BRL;Conta Principal;Alimentacao;Mercado semana"),
    )
  })

  it("exportTransactions retorna excel tab-delimited quando format=excel", async () => {
    const prisma = {
      transaction: {
        findMany: async () => [],
      },
    }

    const service = new ImportsService(prisma as any)
    const result = await service.exportTransactions("user-1", { format: "excel" } as any)

    assert.equal(result.format, "excel")
    assert.equal(result.count, 0)
    assert.equal(result.mimeType, "application/vnd.ms-excel; charset=utf-8")
    assert.ok(result.fileName.endsWith(".xls"))
    assert.ok(
      result.content.includes("date\ttype\tamount\tamountCents\tcurrency\taccount\tcategory\tdescription\ttags\tcostCenter\tnotes"),
    )
  })
})
