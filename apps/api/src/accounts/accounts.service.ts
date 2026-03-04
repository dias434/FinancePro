import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { AccountType, Prisma } from "@prisma/client"

import { assertSupportedCurrency } from "../common/currency"
import { getSkipTake } from "../common/dto/pagination.query"
import { PrismaService } from "../prisma/prisma.service"
import type { ApiAccountType } from "./dto/create-account.dto"

function toDbAccountType(type: ApiAccountType | undefined): AccountType | undefined {
  if (!type) return undefined
  if (type === "CREDIT_CARD") return AccountType.CREDIT
  return type as unknown as AccountType
}

function toApiAccountType(type: AccountType): ApiAccountType {
  if (type === AccountType.CREDIT) return "CREDIT_CARD"
  return type as unknown as ApiAccountType
}

function toIso(date: Date) {
  return date.toISOString()
}

function toAccountOutput(
  a: { id: string; name: string; type: AccountType; currency: string; limitCents: number | null; closingDay: number | null; dueDay: number | null; createdAt: Date; updatedAt: Date },
  balanceCents: number,
) {
  const isCredit = a.type === AccountType.CREDIT
  const debtCents = isCredit && balanceCents < 0 ? Math.abs(balanceCents) : 0
  const availableCents = isCredit && a.limitCents != null ? Math.max(0, a.limitCents - debtCents) : undefined
  return {
    id: a.id,
    name: a.name,
    type: toApiAccountType(a.type),
    currency: a.currency,
    limitCents: a.limitCents ?? undefined,
    closingDay: a.closingDay ?? undefined,
    dueDay: a.dueDay ?? undefined,
    balanceCents,
    debtCents: isCredit ? debtCents : undefined,
    availableCents,
    createdAt: toIso(a.createdAt),
    updatedAt: toIso(a.updatedAt),
  }
}

@Injectable()
export class AccountsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, input: {
    page?: number
    pageSize?: number
    q?: string
    sortBy?: "name" | "createdAt"
    sortDir?: "asc" | "desc"
  }) {
    const { skip, take } = getSkipTake({
      page: input.page,
      pageSize: input.pageSize,
      defaultPage: 1,
      defaultPageSize: 20,
      maxPageSize: 100,
    })

    const where: Prisma.AccountWhereInput = {
      userId,
      ...(input.q
        ? { name: { contains: input.q, mode: "insensitive" } }
        : null),
    }

    const sortBy = input.sortBy ?? "createdAt"
    const sortDir = input.sortDir ?? "desc"

    const [total, accounts, balances] = await this.prisma.$transaction([
      this.prisma.account.count({ where }),
      this.prisma.account.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip,
        take,
      }),
      this.prisma.$queryRaw<Array<{ account_id: string; balance_cents: number }>>(Prisma.sql`
        SELECT
          a."id" AS account_id,
          COALESCE(SUM(
            CASE
              WHEN t."accountId" = a."id" AND t."type" = 'INCOME' THEN t."amountCents"
              WHEN t."accountId" = a."id" AND t."type" = 'EXPENSE' THEN -t."amountCents"
              WHEN t."accountId" = a."id" AND t."type" = 'TRANSFER' THEN -t."amountCents"
              WHEN t."transferAccountId" = a."id" AND t."type" = 'TRANSFER' THEN t."amountCents"
              ELSE 0
            END
          ), 0)::int AS balance_cents
        FROM "Account" a
        LEFT JOIN "Transaction" t ON (t."accountId" = a."id" OR t."transferAccountId" = a."id")
        WHERE a."userId" = ${userId}
        GROUP BY a."id"
      `),
    ])

    const balanceByAccountId = new Map<string, number>()
    for (const row of balances) {
      balanceByAccountId.set(row.account_id, row.balance_cents ?? 0)
    }

    return {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total,
      items: accounts.map((a) => toAccountOutput(a, balanceByAccountId.get(a.id) ?? 0)),
    }
  }

  async create(userId: string, input: {
    name: string
    type?: ApiAccountType
    currency?: string
    limitCents?: number
    closingDay?: number
    dueDay?: number
  }) {
    const currency = assertSupportedCurrency(input.currency, {
      code: "ACCOUNT_CURRENCY_INVALID",
      message: "Moeda da conta invalida.",
    })

    try {
      const created = await this.prisma.account.create({
        data: {
          userId,
          name: input.name.trim(),
          type: toDbAccountType(input.type) ?? AccountType.CHECKING,
          currency,
          limitCents: input.limitCents ?? null,
          closingDay: input.closingDay ?? null,
          dueDay: input.dueDay ?? null,
        },
      })

      return toAccountOutput(created, 0)
    } catch (error) {
      const prismaCode = (error as any)?.code
      if (prismaCode === "P2002") {
        throw new ConflictException("JÇ­ existe uma conta com esse nome", {
          cause: error as any,
          description: "UNIQUE_ACCOUNT_NAME",
        } as any)
      }
      throw error
    }
  }

  async get(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({ where: { id, userId } })
    if (!account) throw new NotFoundException("Conta nao encontrada")

    const [balanceRow] = await this.prisma.$queryRaw<Array<{ balance_cents: number }>>(Prisma.sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN t."accountId" = a."id" AND t."type" = 'INCOME' THEN t."amountCents"
          WHEN t."accountId" = a."id" AND t."type" = 'EXPENSE' THEN -t."amountCents"
          WHEN t."accountId" = a."id" AND t."type" = 'TRANSFER' THEN -t."amountCents"
          WHEN t."transferAccountId" = a."id" AND t."type" = 'TRANSFER' THEN t."amountCents"
          ELSE 0
        END
      ), 0)::int AS balance_cents
      FROM "Account" a
      LEFT JOIN "Transaction" t ON (t."accountId" = a."id" OR t."transferAccountId" = a."id")
      WHERE a."id" = ${id} AND a."userId" = ${userId}
      GROUP BY a."id"
    `)
    const balanceCents = balanceRow?.balance_cents ?? 0
    return toAccountOutput(account, balanceCents)
  }

  async update(userId: string, id: string, input: {
    name?: string
    type?: ApiAccountType
    currency?: string
    limitCents?: number
    closingDay?: number
    dueDay?: number
  }) {
    const existing = await this.prisma.account.findFirst({ where: { id, userId } })
    if (!existing) throw new NotFoundException("Conta nao encontrada")

    const currency =
      input.currency !== undefined
        ? assertSupportedCurrency(input.currency, {
            code: "ACCOUNT_CURRENCY_INVALID",
            message: "Moeda da conta invalida.",
          })
        : undefined

    try {
      const updated = await this.prisma.account.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : null),
          ...(input.type !== undefined ? { type: toDbAccountType(input.type)! } : null),
          ...(currency !== undefined ? { currency } : null),
          ...(input.limitCents !== undefined ? { limitCents: input.limitCents } : null),
          ...(input.closingDay !== undefined ? { closingDay: input.closingDay } : null),
          ...(input.dueDay !== undefined ? { dueDay: input.dueDay } : null),
        },
      })

      const [balanceRow] = await this.prisma.$queryRaw<Array<{ balance_cents: number }>>(Prisma.sql`
        SELECT COALESCE(SUM(
          CASE
            WHEN t."accountId" = a."id" AND t."type" = 'INCOME' THEN t."amountCents"
            WHEN t."accountId" = a."id" AND t."type" = 'EXPENSE' THEN -t."amountCents"
            WHEN t."accountId" = a."id" AND t."type" = 'TRANSFER' THEN -t."amountCents"
            WHEN t."transferAccountId" = a."id" AND t."type" = 'TRANSFER' THEN t."amountCents"
            ELSE 0
          END
        ), 0)::int AS balance_cents
        FROM "Account" a
        LEFT JOIN "Transaction" t ON (t."accountId" = a."id" OR t."transferAccountId" = a."id")
        WHERE a."id" = ${id} AND a."userId" = ${userId}
        GROUP BY a."id"
      `)
      return toAccountOutput(updated, balanceRow?.balance_cents ?? 0)
    } catch (error) {
      const prismaCode = (error as any)?.code
      if (prismaCode === "P2002") {
        throw new ConflictException("JÇ­ existe uma conta com esse nome", {
          cause: error as any,
          description: "UNIQUE_ACCOUNT_NAME",
        } as any)
      }
      throw error
    }
  }

  async remove(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({ where: { id, userId } })
    if (!account) throw new NotFoundException("Conta nÇœo encontrada")

    const transferRefs = await this.prisma.transaction.count({
      where: { userId, transferAccountId: id },
    })
    if (transferRefs > 0) {
      throw new ConflictException(
        "Essa conta estÇ­ sendo usada como destino de transferÇ¦ncias. Remova/edite essas transferÇ¦ncias antes de apagar a conta.",
      )
    }

    await this.prisma.account.delete({ where: { id } })
    return { ok: true }
  }

  async reconcile(
    userId: string,
    accountId: string,
    input: { expectedBalanceCents: number; actualBalanceCents: number; note?: string },
  ) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } })
    if (!account) throw new NotFoundException("Conta nao encontrada")

    const recorded = await this.prisma.reconciliationRecord.create({
      data: {
        accountId,
        userId,
        recordedAt: new Date(),
        expectedBalanceCents: input.expectedBalanceCents,
        actualBalanceCents: input.actualBalanceCents,
        note: input.note?.trim() || null,
      },
    })

    return {
      id: recorded.id,
      accountId,
      recordedAt: toIso(recorded.recordedAt),
      expectedBalanceCents: recorded.expectedBalanceCents,
      actualBalanceCents: recorded.actualBalanceCents,
      diffCents: recorded.actualBalanceCents - recorded.expectedBalanceCents,
      note: recorded.note ?? undefined,
    }
  }

  async listBills(userId: string, accountId: string, input: { limit?: number }) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    })
    if (!account) throw new NotFoundException("Conta nao encontrada")
    if (account.type !== AccountType.CREDIT) {
      throw new BadRequestException({
        code: "ACCOUNT_NOT_CREDIT",
        message: "Listagem de faturas so disponivel para contas do tipo cartao de credito",
      })
    }

    const closingDay = account.closingDay ?? 10
    const dueDay = account.dueDay ?? 15
    const limit = Math.min(input.limit ?? 12, 24)

    const bills: Array<{
      month: string
      dueDate: string
      totalCents: number
      paidCents: number
      remainingCents: number
      periodStart: string
      periodEnd: string
    }> = []

    const now = new Date()
    for (let i = 0; i < limit; i++) {
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - i, closingDay, 23, 59, 59)
      const periodStart = new Date(periodEnd)
      periodStart.setMonth(periodStart.getMonth() - 1)
      periodStart.setDate(periodStart.getDate() + 1)
      periodStart.setHours(0, 0, 0, 0)

      const dueDate = new Date(periodEnd)
      if (dueDay >= closingDay) {
        dueDate.setDate(dueDay)
      } else {
        dueDate.setMonth(dueDate.getMonth() + 1)
        dueDate.setDate(dueDay)
      }

      const [totals] = await this.prisma.$queryRaw<Array<{ expense_cents: number; payment_cents: number }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN t."accountId" = ${accountId} AND t."type" = 'EXPENSE' THEN t."amountCents" ELSE 0 END), 0)::int AS expense_cents,
          COALESCE(SUM(CASE WHEN t."transferAccountId" = ${accountId} AND t."type" = 'TRANSFER' THEN t."amountCents" ELSE 0 END), 0)::int AS payment_cents
        FROM "Transaction" t
        WHERE (t."accountId" = ${accountId} OR t."transferAccountId" = ${accountId})
          AND t."occurredAt" >= ${periodStart}
          AND t."occurredAt" <= ${periodEnd}
      `)

      const expenseCents = totals?.expense_cents ?? 0
      const paymentCents = totals?.payment_cents ?? 0
      const totalCents = expenseCents
      const paidCents = paymentCents
      const remainingCents = Math.max(0, totalCents - paidCents)

      bills.push({
        month: `${periodEnd.getFullYear()}-${String(periodEnd.getMonth() + 1).padStart(2, "0")}`,
        dueDate: dueDate.toISOString().slice(0, 10),
        totalCents,
        paidCents,
        remainingCents,
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
      })
    }

    return { bills }
  }

  async listReconciliations(userId: string, accountId: string, input: { page?: number; pageSize?: number }) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } })
    if (!account) throw new NotFoundException("Conta nao encontrada")

    const { skip, take } = getSkipTake({
      page: input.page,
      pageSize: input.pageSize,
      defaultPage: 1,
      defaultPageSize: 20,
      maxPageSize: 50,
    })

    const [total, items] = await this.prisma.$transaction([
      this.prisma.reconciliationRecord.count({ where: { accountId } }),
      this.prisma.reconciliationRecord.findMany({
        where: { accountId },
        orderBy: { recordedAt: "desc" },
        skip,
        take,
      }),
    ])

    return {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total,
      items: items.map((r) => ({
        id: r.id,
        recordedAt: toIso(r.recordedAt),
        expectedBalanceCents: r.expectedBalanceCents,
        actualBalanceCents: r.actualBalanceCents,
        diffCents: r.actualBalanceCents - r.expectedBalanceCents,
        note: r.note ?? undefined,
      })),
    }
  }
}
