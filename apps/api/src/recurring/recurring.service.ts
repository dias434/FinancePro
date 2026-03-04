import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { Prisma, RecurringFrequency, RecurringStatus, TransactionType } from "@prisma/client"

import { getSkipTake } from "../common/dto/pagination.query"
import { PrismaService } from "../prisma/prisma.service"

function toIso(date: Date) {
  return date.toISOString()
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

function nextRunFrom(start: Date, lastRun: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case "WEEKLY":
      return addDays(lastRun, 7)
    case "MONTHLY":
      return addMonths(lastRun, 1)
    case "ANNUAL":
      return addYears(lastRun, 1)
    default:
      return addMonths(lastRun, 1)
  }
}

@Injectable()
export class RecurringService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, input: {
    page?: number
    pageSize?: number
    status?: "ACTIVE" | "PAUSED" | "CANCELLED"
  }) {
    const { skip, take } = getSkipTake({
      page: input.page,
      pageSize: input.pageSize,
      defaultPage: 1,
      defaultPageSize: 20,
      maxPageSize: 100,
    })

    const where: Prisma.RecurringTransactionWhereInput = {
      userId,
      ...(input.status ? { status: input.status as RecurringStatus } : null),
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.recurringTransaction.count({ where }),
      this.prisma.recurringTransaction.findMany({
        where,
        orderBy: { nextRunAt: "asc" },
        skip,
        take,
        include: {
          account: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, type: true } },
        },
      }),
    ])

    return {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total,
      items: items.map((r) => ({
        id: r.id,
        accountId: r.accountId,
        categoryId: r.categoryId ?? null,
        type: r.type,
        amountCents: r.amountCents,
        description: r.description ?? undefined,
        frequency: r.frequency,
        startDate: toIso(r.startDate),
        endDate: r.endDate ? toIso(r.endDate) : null,
        nextRunAt: toIso(r.nextRunAt),
        status: r.status,
        account: r.account,
        category: r.category ?? undefined,
        createdAt: toIso(r.createdAt),
      })),
    }
  }

  async create(userId: string, input: {
    accountId: string
    categoryId?: string | null
    type: "INCOME" | "EXPENSE"
    amountCents: number
    description?: string
    frequency: "WEEKLY" | "MONTHLY" | "ANNUAL"
    startDate: Date
    endDate?: Date | null
  }) {
    await this.assertAccountOwned(userId, input.accountId)
    if (input.categoryId) {
      await this.assertCategoryOwned(userId, input.categoryId)
    }

    const startDate = new Date(input.startDate)
    const nextRunAt = new Date(startDate)

    if (input.endDate && new Date(input.endDate) < nextRunAt) {
      throw new BadRequestException({
        code: "RECURRING_END_BEFORE_START",
        message: "Data fim deve ser posterior à data início",
      })
    }

    try {
      const created = await this.prisma.recurringTransaction.create({
        data: {
          userId,
          accountId: input.accountId,
          categoryId: input.categoryId ?? null,
          type: input.type as TransactionType,
          amountCents: input.amountCents,
          description: input.description?.trim() || null,
          frequency: input.frequency as RecurringFrequency,
          startDate,
          endDate: input.endDate ?? null,
          nextRunAt,
          status: RecurringStatus.ACTIVE,
        },
      })

      return {
        id: created.id,
        accountId: created.accountId,
        categoryId: created.categoryId ?? null,
        type: created.type,
        amountCents: created.amountCents,
        description: created.description ?? undefined,
        frequency: created.frequency,
        startDate: toIso(created.startDate),
        endDate: created.endDate ? toIso(created.endDate) : null,
        nextRunAt: toIso(created.nextRunAt),
        status: created.status,
        createdAt: toIso(created.createdAt),
      }
    } catch (error) {
      const prismaCode = (error as any)?.code
      if (prismaCode === "P2003") {
        throw new ConflictException({
          code: "RECURRING_REFERENCE_INVALID",
          message: "Conta ou categoria inválida",
        })
      }
      throw error
    }
  }

  async update(userId: string, id: string, input: {
    accountId?: string
    categoryId?: string | null
    type?: "INCOME" | "EXPENSE"
    amountCents?: number
    description?: string | null
    frequency?: "WEEKLY" | "MONTHLY" | "ANNUAL"
    startDate?: Date
    endDate?: Date | null
    status?: "ACTIVE" | "PAUSED" | "CANCELLED"
  }) {
    const existing = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } })
    if (!existing) {
      throw new NotFoundException({
        code: "RECURRING_NOT_FOUND",
        message: "Lançamento recorrente não encontrado",
      })
    }

    if (input.accountId) await this.assertAccountOwned(userId, input.accountId)
    if (input.categoryId) await this.assertCategoryOwned(userId, input.categoryId)

    const updated = await this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(input.accountId !== undefined ? { accountId: input.accountId } : null),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : null),
        ...(input.type !== undefined ? { type: input.type as TransactionType } : null),
        ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : null),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : null),
        ...(input.frequency !== undefined ? { frequency: input.frequency as RecurringFrequency } : null),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : null),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : null),
        ...(input.status !== undefined ? { status: input.status as RecurringStatus } : null),
      },
    })

    return {
      id: updated.id,
      accountId: updated.accountId,
      categoryId: updated.categoryId ?? null,
      type: updated.type,
      amountCents: updated.amountCents,
      description: updated.description ?? undefined,
      frequency: updated.frequency,
      startDate: toIso(updated.startDate),
      endDate: updated.endDate ? toIso(updated.endDate) : null,
      nextRunAt: toIso(updated.nextRunAt),
      status: updated.status,
      updatedAt: toIso(updated.updatedAt),
    }
  }

  async pause(userId: string, id: string) {
    return this.update(userId, id, { status: "PAUSED" })
  }

  async resume(userId: string, id: string) {
    return this.update(userId, id, { status: "ACTIVE" })
  }

  async cancel(userId: string, id: string) {
    return this.update(userId, id, { status: "CANCELLED" })
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } })
    if (!existing) {
      throw new NotFoundException({
        code: "RECURRING_NOT_FOUND",
        message: "Lançamento recorrente não encontrado",
      })
    }
    await this.prisma.recurringTransaction.delete({ where: { id } })
    return { ok: true }
  }

  async processDueRecurring(userId?: string): Promise<{ processed: number }> {
    const now = new Date()
    const where: Prisma.RecurringTransactionWhereInput = {
      status: RecurringStatus.ACTIVE,
      nextRunAt: { lte: now },
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
      ...(userId ? { userId } : null),
    }

    const due = await this.prisma.recurringTransaction.findMany({ where })
    let processed = 0

    for (const r of due) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const occurredAt = new Date(r.nextRunAt)
          await tx.transaction.create({
            data: {
              userId: r.userId,
              accountId: r.accountId,
              categoryId: r.categoryId,
              type: r.type,
              amountCents: r.amountCents,
              occurredAt,
              description: r.description,
              recurringTransactionId: r.id,
            },
          })
          const nextRun = nextRunFrom(r.startDate, occurredAt, r.frequency)
          await tx.recurringTransaction.update({
            where: { id: r.id },
            data: { nextRunAt: nextRun, updatedAt: now },
          })
        })
        processed++
      } catch (err) {
        // Log but continue - don't block other recurring
        console.error(`[recurring] Failed to process ${r.id}:`, err)
      }
    }

    return { processed }
  }

  private async assertAccountOwned(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } })
    if (!account) {
      throw new NotFoundException({
        code: "ACCOUNT_NOT_FOUND",
        message: "Conta não encontrada",
      })
    }
  }

  private async assertCategoryOwned(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } })
    if (!category) {
      throw new NotFoundException({
        code: "CATEGORY_NOT_FOUND",
        message: "Categoria não encontrada",
      })
    }
  }
}
