import { Inject, Injectable } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import {
  assertSupportedCurrency,
  convertMoneyCents,
  DEFAULT_BASE_CURRENCY,
  listSupportedCurrencies,
} from "../common/currency"
import { getSkipTake } from "../common/dto/pagination.query"
import { PrismaService } from "../prisma/prisma.service"

type Range = "month" | "year"

type SeriesPoint = {
  label: string
  netCents: number
}

type CategoryPoint = {
  categoryId: string | null
  categoryName: string
  expenseCents: number
}

type MonthTotals = {
  incomeCents: number
  expenseCents: number
  netCents: number
}

type DashboardSummary = {
  range: Range
  baseCurrency: string
  supportedCurrencies: string[]
  start: string
  end: string
  balanceCents: number
  incomeCents: number
  expenseCents: number
  netCents: number
  series: SeriesPoint[]
  byCategory: CategoryPoint[]
}

type AdvancedDashboardReport = {
  baseCurrency: string
  supportedCurrencies: string[]
  comparison: {
    currentMonthKey: string
    previousMonthKey: string
    current: MonthTotals
    previous: MonthTotals
    delta: MonthTotals
  }
  categoriesGrowth: Array<{
    categoryId: string | null
    categoryName: string
    currentExpenseCents: number
    previousExpenseCents: number
    deltaCents: number
    growthPercent: number
  }>
  forecast: {
    monthsConsidered: number
    averageIncomeCents: number
    averageExpenseCents: number
    averageNetCents: number
    currentBalanceCents: number
    projections: Array<{
      monthKey: string
      projectedBalanceCents: number
    }>
  }
}

function toIso(date: Date) {
  return date.toISOString()
}

function startOfMonthUtc(year: number, month1To12: number) {
  return new Date(Date.UTC(year, month1To12 - 1, 1, 0, 0, 0, 0))
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0))
}

function startOfYearUtc(year: number) {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
}

function addYearsUtc(date: Date, years: number) {
  return new Date(Date.UTC(date.getUTCFullYear() + years, 0, 1, 0, 0, 0, 0))
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "")
}

function listBuckets(range: Range, start: Date, end: Date) {
  const buckets: Array<{ label: string; start: Date }> = []

  if (range === "year") {
    let cursor = startOfMonthUtc(start.getUTCFullYear(), start.getUTCMonth() + 1)
    while (cursor < end) {
      buckets.push({
        label: formatMonthLabel(cursor),
        start: cursor,
      })
      cursor = addMonthsUtc(cursor, 1)
    }
    return buckets
  }

  let cursor = new Date(start)
  while (cursor < end) {
    buckets.push({
      label: String(cursor.getUTCDate()).padStart(2, "0"),
      start: cursor,
    })
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1))
  }

  return buckets
}

function emptyTotals(): MonthTotals {
  return {
    incomeCents: 0,
    expenseCents: 0,
    netCents: 0,
  }
}

function createRunningTotals() {
  return {
    incomeCents: 0,
    expenseCents: 0,
  }
}

function finalizeTotals(input: { incomeCents: number; expenseCents: number } | undefined): MonthTotals {
  const incomeCents = input?.incomeCents ?? 0
  const expenseCents = input?.expenseCents ?? 0
  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
  }
}

function isMissingRelationError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message)
      : ""

  return (
    message.includes("42P01") ||
    message.toLowerCase().includes("relation") ||
    message.toLowerCase().includes("does not exist")
  )
}

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async getBalanceRows(userId: string, accountId?: string) {
    const accountFilter = accountId ? Prisma.sql`AND a."id" = ${accountId}` : Prisma.empty

    return await this.prisma.$queryRaw<Array<{ account_id: string; currency: string; balance_cents: number }>>(
      Prisma.sql`
        SELECT
          a."id" AS account_id,
          a."currency" AS currency,
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
          ${accountFilter}
        GROUP BY a."id", a."currency"
      `,
    )
  }

  private buildEmptySummary(input: {
    range: Range
    start: Date
    end: Date
    baseCurrency: string
  }): DashboardSummary {
    const supportedCurrencies = listSupportedCurrencies()
    const emptyBuckets = listBuckets(input.range, input.start, input.end)

    return {
      range: input.range,
      baseCurrency: input.baseCurrency,
      supportedCurrencies,
      start: toIso(input.start),
      end: toIso(input.end),
      balanceCents: 0,
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      series: emptyBuckets.map((bucket) => ({ label: bucket.label, netCents: 0 })),
      byCategory: [],
    }
  }

  private async getCurrentBalanceCents(userId: string, baseCurrency: string, accountId?: string) {
    const balanceRows = await this.getBalanceRows(userId, accountId)

    return balanceRows.reduce((total, row) => {
      return total + convertMoneyCents(row.balance_cents ?? 0, row.currency, baseCurrency)
    }, 0)
  }

  async getSummary(input: {
    userId: string
    range?: Range
    year?: number
    month?: number
    accountId?: string
    baseCurrency?: string
    page?: number
    pageSize?: number
    sortBy?: "expenseCents" | "categoryName"
    sortDir?: "asc" | "desc"
  }): Promise<DashboardSummary> {
    const now = new Date()
    const range: Range = input.range ?? "month"
    const year = input.year ?? now.getUTCFullYear()
    const month = input.month ?? now.getUTCMonth() + 1
    const baseCurrency = assertSupportedCurrency(input.baseCurrency, {
      fallback: DEFAULT_BASE_CURRENCY,
      code: "DASHBOARD_BASE_CURRENCY_INVALID",
      message: "Moeda base invalida para o dashboard.",
    })
    const accountId = input.accountId && input.accountId !== "all" ? input.accountId : undefined

    const start = range === "year" ? startOfYearUtc(year) : startOfMonthUtc(year, month)
    const end = range === "year" ? addYearsUtc(start, 1) : addMonthsUtc(start, 1)

    const emptySummary = this.buildEmptySummary({
      range,
      start,
      end,
      baseCurrency,
    })

    const periodAccountFilter = accountId ? Prisma.sql`AND t."accountId" = ${accountId}` : Prisma.empty

    const { skip, take } = getSkipTake({
      page: input.page,
      pageSize: input.pageSize,
      defaultPage: 1,
      defaultPageSize: 8,
      maxPageSize: 50,
    })

    const sortBy = input.sortBy ?? "expenseCents"
    const sortDir = input.sortDir ?? "desc"

    try {
      const [totalsRows, balanceRows, rawSeries, byCategoryRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ currency: string; income_cents: number; expense_cents: number }>>(
          Prisma.sql`
            SELECT
              a."currency" AS currency,
              COALESCE(SUM(CASE WHEN t."type" = 'INCOME' THEN t."amountCents" ELSE 0 END), 0)::int AS income_cents,
              COALESCE(SUM(CASE WHEN t."type" = 'EXPENSE' THEN t."amountCents" ELSE 0 END), 0)::int AS expense_cents
            FROM "Transaction" t
            INNER JOIN "Account" a ON a."id" = t."accountId"
            WHERE t."userId" = ${input.userId}
              AND t."occurredAt" >= ${start}
              AND t."occurredAt" < ${end}
              ${periodAccountFilter}
            GROUP BY a."currency"
          `,
        ),
        this.getBalanceRows(input.userId, accountId),
        this.prisma.$queryRaw<Array<{ bucket: Date; currency: string; net_cents: number }>>(
          Prisma.sql`
            SELECT
              date_trunc(${range === "year" ? "month" : "day"}, t."occurredAt") AS bucket,
              a."currency" AS currency,
              COALESCE(SUM(
                CASE
                  WHEN t."type" = 'INCOME' THEN t."amountCents"
                  WHEN t."type" = 'EXPENSE' THEN -t."amountCents"
                  ELSE 0
                END
              ), 0)::int AS net_cents
            FROM "Transaction" t
            INNER JOIN "Account" a ON a."id" = t."accountId"
            WHERE t."userId" = ${input.userId}
              AND t."occurredAt" >= ${start}
              AND t."occurredAt" < ${end}
              ${periodAccountFilter}
            GROUP BY 1, 2
            ORDER BY 1 ASC
          `,
        ),
        this.prisma.$queryRaw<
          Array<{ category_id: string | null; category_name: string | null; currency: string; expense_cents: number }>
        >(
          Prisma.sql`
            SELECT
              c."id" AS category_id,
              c."name" AS category_name,
              a."currency" AS currency,
              COALESCE(SUM(t."amountCents"), 0)::int AS expense_cents
            FROM "Transaction" t
            INNER JOIN "Account" a ON a."id" = t."accountId"
            LEFT JOIN "Category" c ON c."id" = t."categoryId"
            WHERE t."userId" = ${input.userId}
              AND t."type" = 'EXPENSE'
              AND t."occurredAt" >= ${start}
              AND t."occurredAt" < ${end}
              ${periodAccountFilter}
            GROUP BY c."id", c."name", a."currency"
          `,
        ),
      ])

      const totals = totalsRows.reduce(
        (acc, row) => {
          acc.incomeCents += convertMoneyCents(row.income_cents ?? 0, row.currency, baseCurrency)
          acc.expenseCents += convertMoneyCents(row.expense_cents ?? 0, row.currency, baseCurrency)
          return acc
        },
        createRunningTotals(),
      )

      const balanceCents = balanceRows.reduce((total, row) => {
        return total + convertMoneyCents(row.balance_cents ?? 0, row.currency, baseCurrency)
      }, 0)

      const emptyBuckets = listBuckets(range, start, end)
      const netByLabel = new Map<string, number>()

      for (const row of rawSeries) {
        const label =
          range === "year"
            ? formatMonthLabel(row.bucket)
            : String(row.bucket.getUTCDate()).padStart(2, "0")
        const converted = convertMoneyCents(row.net_cents ?? 0, row.currency, baseCurrency)
        netByLabel.set(label, (netByLabel.get(label) ?? 0) + converted)
      }

      const series: SeriesPoint[] = emptyBuckets.map((bucket) => ({
        label: bucket.label,
        netCents: netByLabel.get(bucket.label) ?? 0,
      }))

      const byCategoryMap = new Map<string, CategoryPoint>()
      for (const row of byCategoryRows) {
        const categoryName = row.category_name ?? "Sem categoria"
        const key = row.category_id ?? `none:${categoryName}`
        const current = byCategoryMap.get(key) ?? {
          categoryId: row.category_id,
          categoryName,
          expenseCents: 0,
        }

        current.expenseCents += convertMoneyCents(row.expense_cents ?? 0, row.currency, baseCurrency)
        byCategoryMap.set(key, current)
      }

      const byCategory = Array.from(byCategoryMap.values())
        .sort((left, right) => {
          if (sortBy === "categoryName") {
            const comparison = left.categoryName.localeCompare(right.categoryName, "pt-BR")
            return sortDir === "asc" ? comparison : -comparison
          }

          const comparison = left.expenseCents - right.expenseCents
          if (comparison !== 0) {
            return sortDir === "asc" ? comparison : -comparison
          }

          return left.categoryName.localeCompare(right.categoryName, "pt-BR")
        })
        .slice(skip, skip + take)

      return {
        range,
        baseCurrency,
        supportedCurrencies: listSupportedCurrencies(),
        start: toIso(start),
        end: toIso(end),
        balanceCents,
        incomeCents: totals.incomeCents,
        expenseCents: totals.expenseCents,
        netCents: totals.incomeCents - totals.expenseCents,
        series,
        byCategory,
      }
    } catch (error) {
      if (isMissingRelationError(error)) {
        return emptySummary
      }
      throw error
    }
  }

  async getAdvancedReport(input: {
    userId: string
    baseCurrency?: string
  }): Promise<AdvancedDashboardReport> {
    const baseCurrency = assertSupportedCurrency(input.baseCurrency, {
      fallback: DEFAULT_BASE_CURRENCY,
      code: "DASHBOARD_BASE_CURRENCY_INVALID",
      message: "Moeda base invalida para o dashboard.",
    })
    const now = new Date()
    const currentMonthStart = startOfMonthUtc(now.getUTCFullYear(), now.getUTCMonth() + 1)
    const previousMonthStart = addMonthsUtc(currentMonthStart, -1)
    const nextMonthStart = addMonthsUtc(currentMonthStart, 1)
    const historyStart = addMonthsUtc(currentMonthStart, -3)
    const currentMonthKey = monthKey(currentMonthStart)
    const previousMonthKey = monthKey(previousMonthStart)
    const emptyReport: AdvancedDashboardReport = {
      baseCurrency,
      supportedCurrencies: listSupportedCurrencies(),
      comparison: {
        currentMonthKey,
        previousMonthKey,
        current: emptyTotals(),
        previous: emptyTotals(),
        delta: emptyTotals(),
      },
      categoriesGrowth: [],
      forecast: {
        monthsConsidered: 0,
        averageIncomeCents: 0,
        averageExpenseCents: 0,
        averageNetCents: 0,
        currentBalanceCents: 0,
        projections: [],
      },
    }

    try {
      const [comparisonRows, growthRows, historyRows, currentBalanceCents] = await Promise.all([
        this.prisma.$queryRaw<Array<{ month_bucket: Date; currency: string; income_cents: number; expense_cents: number }>>(
          Prisma.sql`
            SELECT
              date_trunc('month', t."occurredAt") AS month_bucket,
              a."currency" AS currency,
              COALESCE(SUM(CASE WHEN t."type" = 'INCOME' THEN t."amountCents" ELSE 0 END), 0)::int AS income_cents,
              COALESCE(SUM(CASE WHEN t."type" = 'EXPENSE' THEN t."amountCents" ELSE 0 END), 0)::int AS expense_cents
            FROM "Transaction" t
            INNER JOIN "Account" a ON a."id" = t."accountId"
            WHERE t."userId" = ${input.userId}
              AND t."occurredAt" >= ${previousMonthStart}
              AND t."occurredAt" < ${nextMonthStart}
            GROUP BY 1, 2
          `,
        ),
        this.prisma.$queryRaw<
          Array<{ month_bucket: Date; category_id: string | null; category_name: string | null; currency: string; expense_cents: number }>
        >(
          Prisma.sql`
            SELECT
              date_trunc('month', t."occurredAt") AS month_bucket,
              c."id" AS category_id,
              c."name" AS category_name,
              a."currency" AS currency,
              COALESCE(SUM(t."amountCents"), 0)::int AS expense_cents
            FROM "Transaction" t
            INNER JOIN "Account" a ON a."id" = t."accountId"
            LEFT JOIN "Category" c ON c."id" = t."categoryId"
            WHERE t."userId" = ${input.userId}
              AND t."type" = 'EXPENSE'
              AND t."occurredAt" >= ${previousMonthStart}
              AND t."occurredAt" < ${nextMonthStart}
            GROUP BY 1, 2, 3, 4
          `,
        ),
        this.prisma.$queryRaw<Array<{ month_bucket: Date; currency: string; income_cents: number; expense_cents: number }>>(
          Prisma.sql`
            SELECT
              date_trunc('month', t."occurredAt") AS month_bucket,
              a."currency" AS currency,
              COALESCE(SUM(CASE WHEN t."type" = 'INCOME' THEN t."amountCents" ELSE 0 END), 0)::int AS income_cents,
              COALESCE(SUM(CASE WHEN t."type" = 'EXPENSE' THEN t."amountCents" ELSE 0 END), 0)::int AS expense_cents
            FROM "Transaction" t
            INNER JOIN "Account" a ON a."id" = t."accountId"
            WHERE t."userId" = ${input.userId}
              AND t."occurredAt" >= ${historyStart}
              AND t."occurredAt" < ${currentMonthStart}
            GROUP BY 1, 2
          `,
        ),
        this.getCurrentBalanceCents(input.userId, baseCurrency),
      ])

      const comparisonMap = new Map<string, ReturnType<typeof createRunningTotals>>()
      for (const row of comparisonRows) {
        const key = monthKey(row.month_bucket)
        const entry = comparisonMap.get(key) ?? createRunningTotals()
        entry.incomeCents += convertMoneyCents(row.income_cents ?? 0, row.currency, baseCurrency)
        entry.expenseCents += convertMoneyCents(row.expense_cents ?? 0, row.currency, baseCurrency)
        comparisonMap.set(key, entry)
      }

      const current = finalizeTotals(comparisonMap.get(currentMonthKey))
      const previous = finalizeTotals(comparisonMap.get(previousMonthKey))
      const delta: MonthTotals = {
        incomeCents: current.incomeCents - previous.incomeCents,
        expenseCents: current.expenseCents - previous.expenseCents,
        netCents: current.netCents - previous.netCents,
      }

      const growthMap = new Map<
        string,
        {
          categoryId: string | null
          categoryName: string
          currentExpenseCents: number
          previousExpenseCents: number
        }
      >()

      for (const row of growthRows) {
        const categoryName = row.category_name ?? "Sem categoria"
        const key = row.category_id ?? `none:${categoryName}`
        const entry = growthMap.get(key) ?? {
          categoryId: row.category_id,
          categoryName,
          currentExpenseCents: 0,
          previousExpenseCents: 0,
        }

        const converted = convertMoneyCents(row.expense_cents ?? 0, row.currency, baseCurrency)
        const rowMonthKey = monthKey(row.month_bucket)
        if (rowMonthKey === currentMonthKey) {
          entry.currentExpenseCents += converted
        } else if (rowMonthKey === previousMonthKey) {
          entry.previousExpenseCents += converted
        }

        growthMap.set(key, entry)
      }

      const categoriesGrowth = Array.from(growthMap.values())
        .map((entry) => {
          const deltaCents = entry.currentExpenseCents - entry.previousExpenseCents
          const growthPercent =
            entry.previousExpenseCents > 0
              ? Math.round((deltaCents / entry.previousExpenseCents) * 10_000) / 100
              : entry.currentExpenseCents > 0
                ? 100
                : 0

          return {
            ...entry,
            deltaCents,
            growthPercent,
          }
        })
        .filter((entry) => entry.deltaCents > 0)
        .sort((left, right) => {
          const deltaDiff = right.deltaCents - left.deltaCents
          if (deltaDiff !== 0) return deltaDiff
          const growthDiff = right.growthPercent - left.growthPercent
          if (growthDiff !== 0) return growthDiff
          return left.categoryName.localeCompare(right.categoryName, "pt-BR")
        })
        .slice(0, 5)

      const historyMap = new Map<string, ReturnType<typeof createRunningTotals>>()
      for (const row of historyRows) {
        const key = monthKey(row.month_bucket)
        const entry = historyMap.get(key) ?? createRunningTotals()
        entry.incomeCents += convertMoneyCents(row.income_cents ?? 0, row.currency, baseCurrency)
        entry.expenseCents += convertMoneyCents(row.expense_cents ?? 0, row.currency, baseCurrency)
        historyMap.set(key, entry)
      }

      const history = Array.from(historyMap.values())
      const monthsConsidered = history.length
      const averageIncomeCents =
        monthsConsidered > 0
          ? Math.round(history.reduce((total, item) => total + item.incomeCents, 0) / monthsConsidered)
          : 0
      const averageExpenseCents =
        monthsConsidered > 0
          ? Math.round(history.reduce((total, item) => total + item.expenseCents, 0) / monthsConsidered)
          : 0
      const averageNetCents = averageIncomeCents - averageExpenseCents

      const projections: AdvancedDashboardReport["forecast"]["projections"] = []
      let projectedBalanceCents = currentBalanceCents

      for (let i = 1; i <= 3; i += 1) {
        projectedBalanceCents += averageNetCents
        projections.push({
          monthKey: monthKey(addMonthsUtc(currentMonthStart, i)),
          projectedBalanceCents,
        })
      }

      return {
        baseCurrency,
        supportedCurrencies: listSupportedCurrencies(),
        comparison: {
          currentMonthKey,
          previousMonthKey,
          current,
          previous,
          delta,
        },
        categoriesGrowth,
        forecast: {
          monthsConsidered,
          averageIncomeCents,
          averageExpenseCents,
          averageNetCents,
          currentBalanceCents,
          projections,
        },
      }
    } catch (error) {
      if (isMissingRelationError(error)) {
        return emptyReport
      }
      throw error
    }
  }
}
