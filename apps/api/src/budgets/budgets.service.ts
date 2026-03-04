import { randomUUID } from "crypto"

import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { CategoryType, Prisma } from "@prisma/client"

import { getSkipTake } from "../common/dto/pagination.query"
import { PrismaService } from "../prisma/prisma.service"

function toIso(date: Date) {
  return date.toISOString()
}

function startOfMonthUtc(year: number, month1To12: number) {
  return new Date(Date.UTC(year, month1To12 - 1, 1, 0, 0, 0, 0))
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0))
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

type BudgetCategory = {
  id: string
  name: string
  type: CategoryType
  icon: string | null
  color: string | null
}

type BudgetRecord = {
  id: string
  month: Date
  limitCents: number
  alertPercent: number
  createdAt: Date
  updatedAt: Date
  category: BudgetCategory
}

type BudgetRow = {
  id: string
  month: Date
  limit_cents: number
  alert_percent: number
  created_at: Date
  updated_at: Date
  category_id: string
  category_name: string
  category_type: CategoryType
  category_icon: string | null
  category_color: string | null
}

type BudgetWriteRow = {
  id: string
  month: Date
  limitCents: number
  alertPercent: number
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class BudgetsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private rowToRecord(row: BudgetRow): BudgetRecord {
    return {
      id: row.id,
      month: row.month,
      limitCents: row.limit_cents,
      alertPercent: row.alert_percent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      category: {
        id: row.category_id,
        name: row.category_name,
        type: row.category_type,
        icon: row.category_icon,
        color: row.category_color,
      },
    }
  }

  private async getBudgetRowById(userId: string, id: string) {
    const rows = await this.prisma.$queryRaw<BudgetRow[]>(Prisma.sql`
      SELECT
        b."id" AS id,
        b."month" AS month,
        b."limitCents" AS limit_cents,
        b."alertPercent" AS alert_percent,
        b."createdAt" AS created_at,
        b."updatedAt" AS updated_at,
        c."id" AS category_id,
        c."name" AS category_name,
        c."type" AS category_type,
        c."icon" AS category_icon,
        c."color" AS category_color
      FROM "Budget" b
      INNER JOIN "Category" c ON c."id" = b."categoryId"
      WHERE b."id" = ${id}
        AND b."userId" = ${userId}
      LIMIT 1
    `)

    return rows[0] ?? null
  }

  private async assertExpenseCategoryOwned(userId: string, categoryId: string): Promise<BudgetCategory> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true, name: true, type: true, icon: true, color: true },
    })

    if (!category) throw new NotFoundException("Category not found")
    if (category.type !== CategoryType.EXPENSE) {
      throw new BadRequestException("Budget category must be EXPENSE")
    }

    return category
  }

  private async getConsumedMap(userId: string, budgets: BudgetRecord[]) {
    if (budgets.length === 0) return new Map<string, number>()

    const categoryIds = Array.from(new Set(budgets.map((b) => b.category.id)))
    const minStart = new Date(Math.min(...budgets.map((b) => b.month.getTime())))
    const maxEnd = addMonthsUtc(new Date(Math.max(...budgets.map((b) => b.month.getTime()))), 1)

    const rows = await this.prisma.$queryRaw<
      Array<{ category_id: string; month_start: Date; consumed_cents: number }>
    >(Prisma.sql`
      SELECT
        t."categoryId" AS category_id,
        date_trunc('month', t."occurredAt") AS month_start,
        COALESCE(SUM(t."amountCents"), 0)::int AS consumed_cents
      FROM "Transaction" t
      WHERE t."userId" = ${userId}
        AND t."type" = 'EXPENSE'
        AND t."categoryId" IN (${Prisma.join(categoryIds)})
        AND t."occurredAt" >= ${minStart}
        AND t."occurredAt" < ${maxEnd}
      GROUP BY 1, 2
    `)

    const map = new Map<string, number>()
    for (const row of rows) {
      map.set(`${row.category_id}|${monthKey(row.month_start)}`, row.consumed_cents ?? 0)
    }

    return map
  }

  private mapBudgetOutput(record: BudgetRecord, consumedMap: Map<string, number>) {
    const consumedCents = consumedMap.get(`${record.category.id}|${monthKey(record.month)}`) ?? 0
    const remainingCents = record.limitCents - consumedCents
    const usedPercent =
      record.limitCents > 0
        ? Math.round((consumedCents / record.limitCents) * 10000) / 100
        : 0
    const alertReached = usedPercent >= record.alertPercent
    const overLimit = consumedCents > record.limitCents

    return {
      id: record.id,
      year: record.month.getUTCFullYear(),
      month: record.month.getUTCMonth() + 1,
      monthStart: toIso(record.month),
      monthEnd: toIso(addMonthsUtc(record.month, 1)),
      limitCents: record.limitCents,
      consumedCents,
      remainingCents,
      usedPercent,
      alertPercent: record.alertPercent,
      alertReached,
      overLimit,
      category: {
        id: record.category.id,
        name: record.category.name,
        type: record.category.type,
        icon: record.category.icon ?? undefined,
        color: record.category.color ?? undefined,
      },
      createdAt: toIso(record.createdAt),
      updatedAt: toIso(record.updatedAt),
    }
  }

  async list(userId: string, input: {
    page?: number
    pageSize?: number
    q?: string
    categoryId?: string
    year?: number
    month?: number
    sortBy?: "month" | "limitCents" | "createdAt"
    sortDir?: "asc" | "desc"
  }) {
    const now = new Date()
    const selectedYear = input.year ?? now.getUTCFullYear()

    const rangeStart = input.month
      ? startOfMonthUtc(selectedYear, input.month)
      : startOfMonthUtc(selectedYear, 1)

    const rangeEnd = input.month
      ? addMonthsUtc(rangeStart, 1)
      : startOfMonthUtc(selectedYear + 1, 1)

    const conditions: Prisma.Sql[] = [
      Prisma.sql`b."userId" = ${userId}`,
      Prisma.sql`b."month" >= ${rangeStart}`,
      Prisma.sql`b."month" < ${rangeEnd}`,
    ]

    if (input.categoryId) {
      conditions.push(Prisma.sql`b."categoryId" = ${input.categoryId}`)
    }

    if (input.q?.trim()) {
      conditions.push(Prisma.sql`c."name" ILIKE ${`%${input.q.trim()}%`}`)
    }

    const whereSql = Prisma.join(conditions, " AND ")

    const { skip, take } = getSkipTake({
      page: input.page,
      pageSize: input.pageSize,
      defaultPage: 1,
      defaultPageSize: 50,
      maxPageSize: 200,
    })

    const sortBy = input.sortBy ?? "month"
    const sortDir = input.sortDir ?? "desc"

    const orderBySql =
      sortBy === "limitCents"
        ? Prisma.raw(`b."limitCents"`)
        : sortBy === "createdAt"
          ? Prisma.raw(`b."createdAt"`)
          : Prisma.raw(`b."month"`)

    const orderDirSql = sortDir === "asc" ? Prisma.raw(`ASC`) : Prisma.raw(`DESC`)

    const [countRow] = await this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM "Budget" b
      INNER JOIN "Category" c ON c."id" = b."categoryId"
      WHERE ${whereSql}
    `)

    const rows = await this.prisma.$queryRaw<BudgetRow[]>(Prisma.sql`
      SELECT
        b."id" AS id,
        b."month" AS month,
        b."limitCents" AS limit_cents,
        b."alertPercent" AS alert_percent,
        b."createdAt" AS created_at,
        b."updatedAt" AS updated_at,
        c."id" AS category_id,
        c."name" AS category_name,
        c."type" AS category_type,
        c."icon" AS category_icon,
        c."color" AS category_color
      FROM "Budget" b
      INNER JOIN "Category" c ON c."id" = b."categoryId"
      WHERE ${whereSql}
      ORDER BY ${orderBySql} ${orderDirSql}
      LIMIT ${take}
      OFFSET ${skip}
    `)

    const budgets = rows.map((row) => this.rowToRecord(row))
    const consumedMap = await this.getConsumedMap(userId, budgets)

    return {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total: countRow?.total ?? 0,
      items: budgets.map((budget) => this.mapBudgetOutput(budget, consumedMap)),
    }
  }

  async create(userId: string, input: {
    categoryId: string
    year: number
    month: number
    limitCents: number
    alertPercent?: number
  }) {
    const category = await this.assertExpenseCategoryOwned(userId, input.categoryId)
    const month = startOfMonthUtc(input.year, input.month)
    const id = randomUUID()

    let created: BudgetWriteRow
    try {
      const rows = await this.prisma.$queryRaw<BudgetWriteRow[]>(Prisma.sql`
        INSERT INTO "Budget" ("id", "userId", "categoryId", "month", "limitCents", "alertPercent", "createdAt", "updatedAt")
        VALUES (
          ${id},
          ${userId},
          ${input.categoryId},
          ${month},
          ${input.limitCents},
          ${input.alertPercent ?? 80},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING "id", "month", "limitCents", "alertPercent", "createdAt", "updatedAt"
      `)

      created = rows[0]
    } catch (error) {
      if ((error as any)?.code === "23505") {
        throw new ConflictException("Budget for this category/month already exists")
      }
      throw error
    }

    const record: BudgetRecord = {
      id: created.id,
      month: created.month,
      limitCents: created.limitCents,
      alertPercent: created.alertPercent,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      category,
    }

    const consumedMap = await this.getConsumedMap(userId, [record])
    return this.mapBudgetOutput(record, consumedMap)
  }

  async update(userId: string, id: string, input: {
    categoryId?: string
    year?: number
    month?: number
    limitCents?: number
    alertPercent?: number
  }) {
    const existingRow = await this.getBudgetRowById(userId, id)
    if (!existingRow) throw new NotFoundException("Budget not found")

    const existing = this.rowToRecord(existingRow)

    const nextCategoryId = input.categoryId ?? existing.category.id
    const nextCategory = await this.assertExpenseCategoryOwned(userId, nextCategoryId)

    const nextYear = input.year ?? existing.month.getUTCFullYear()
    const nextMonth = input.month ?? existing.month.getUTCMonth() + 1
    const nextMonthDate = startOfMonthUtc(nextYear, nextMonth)

    let updated: BudgetWriteRow
    try {
      const rows = await this.prisma.$queryRaw<BudgetWriteRow[]>(Prisma.sql`
        UPDATE "Budget"
        SET
          "categoryId" = ${nextCategoryId},
          "month" = ${nextMonthDate},
          "limitCents" = ${input.limitCents ?? existing.limitCents},
          "alertPercent" = ${input.alertPercent ?? existing.alertPercent},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
          AND "userId" = ${userId}
        RETURNING "id", "month", "limitCents", "alertPercent", "createdAt", "updatedAt"
      `)

      updated = rows[0]
    } catch (error) {
      if ((error as any)?.code === "23505") {
        throw new ConflictException("Budget for this category/month already exists")
      }
      throw error
    }

    if (!updated) throw new NotFoundException("Budget not found")

    const record: BudgetRecord = {
      id: updated.id,
      month: updated.month,
      limitCents: updated.limitCents,
      alertPercent: updated.alertPercent,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      category: nextCategory,
    }

    const consumedMap = await this.getConsumedMap(userId, [record])
    return this.mapBudgetOutput(record, consumedMap)
  }

  async remove(userId: string, id: string) {
    const deleted = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM "Budget"
      WHERE "id" = ${id}
        AND "userId" = ${userId}
    `)

    if (!deleted) throw new NotFoundException("Budget not found")
    return { ok: true }
  }
}
