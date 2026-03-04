import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Prisma, SystemAlertStatus, SystemAlertType } from "@prisma/client"

import { PushNotificationsService } from "../alerts/push-notifications.service"
import { PrismaService } from "../prisma/prisma.service"

type BudgetUsageRow = {
  budget_id: string
  user_id: string
  category_name: string
  limit_cents: number
  alert_percent: number
  consumed_cents: number
}

type GoalProgressRow = {
  goal_id: string
  user_id: string
  goal_name: string
  target_cents: number
  current_cents: number
  target_date: Date
}

type BudgetAlert = {
  key: string
  level: "over_limit" | "threshold"
  sourceId: string
  userId: string
  categoryName: string
  consumedCents: number
  limitCents: number
  usedPercent: number
  alertPercent: number
  monthKey: string
}

type GoalAlert = {
  key: string
  level: "overdue" | "due_soon"
  sourceId: string
  userId: string
  goalName: string
  remainingCents: number
  progressPercent: number
  daysRemaining: number
}

type SpendingSpikeWindow = "weekly" | "monthly"

type SpendingSpikeRow = {
  user_id: string
  current_cents: number
  previous_cents: number
}

type SpendingSpikeAlert = {
  key: string
  window: SpendingSpikeWindow
  sourceId: string
  userId: string
  currentCents: number
  previousCents: number
  deltaCents: number
  growthPercent: number
  thresholdPercent: number
}

type PersistedAlertInput = {
  dedupeKey: string
  userId: string
  sourceId: string
  type: SystemAlertType
  title: string
  message: string
  payload?: Prisma.InputJsonValue
}

type RecalcSummary = {
  monthKey: string
  budgetsTotal: number
  budgetsAlertReached: number
  budgetsOverLimit: number
  goalsOpen: number
  goalsDueSoon: number
  goalsOverdue: number
}

type JobSource = "startup" | "interval"

const DAY_MS = 24 * 60 * 60 * 1000

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0))
}

function subtractDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() - days * DAY_MS)
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback
  const normalized = String(value).trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true
  if (normalized === "false" || normalized === "0" || normalized === "no") return false
  return fallback
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return parsed
}

function getGoalDaysRemaining(targetDate: Date, now: Date) {
  return Math.ceil((targetDate.getTime() - now.getTime()) / DAY_MS)
}

function formatCentsBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

const SPENDING_SPIKE_WEEKLY_TYPE = "SPENDING_SPIKE_WEEKLY" as SystemAlertType
const SPENDING_SPIKE_MONTHLY_TYPE = "SPENDING_SPIKE_MONTHLY" as SystemAlertType

@Injectable()
export class BudgetGoalJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BudgetGoalJobsService.name)

  private budgetAlertsTimer: NodeJS.Timeout | null = null
  private goalAlertsTimer: NodeJS.Timeout | null = null
  private billAlertsTimer: NodeJS.Timeout | null = null
  private recalcTimer: NodeJS.Timeout | null = null

  private activeBudgetAlertKeys = new Set<string>()
  private activeGoalAlertKeys = new Set<string>()
  private activeBillAlertKeys = new Set<string>()
  private activeSpendingSpikeAlertKeys = new Set<string>()
  private lastRecalcSummary: RecalcSummary | null = null

  private readonly jobsEnabled: boolean
  private readonly budgetAlertIntervalMinutes: number
  private readonly goalAlertIntervalMinutes: number
  private readonly recalcIntervalMinutes: number
  private readonly goalDueSoonDays: number
  private readonly spendingSpikeThresholdPercent: number

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PushNotificationsService)
    private readonly pushNotifications: PushNotificationsService,
  ) {
    this.jobsEnabled = parseBoolean(this.config.get("JOBS_ENABLED"), true)
    this.budgetAlertIntervalMinutes = parsePositiveInt(
      this.config.get("JOBS_BUDGET_ALERT_INTERVAL_MINUTES"),
      60,
    )
    this.goalAlertIntervalMinutes = parsePositiveInt(
      this.config.get("JOBS_GOAL_ALERT_INTERVAL_MINUTES"),
      120,
    )
    this.recalcIntervalMinutes = parsePositiveInt(
      this.config.get("JOBS_RECALC_INTERVAL_MINUTES"),
      360,
    )
    this.goalDueSoonDays = parsePositiveInt(this.config.get("JOBS_GOAL_DUE_SOON_DAYS"), 7)
    this.spendingSpikeThresholdPercent = parsePositiveInt(
      this.config.get("JOBS_SPENDING_SPIKE_THRESHOLD_PERCENT"),
      25,
    )
  }

  onModuleInit() {
    if (!this.jobsEnabled) {
      this.logger.log("Jobs/cron desativados (JOBS_ENABLED=false).")
      return
    }

    this.logger.log(
      [
        "Jobs/cron ativados:",
        `budget-alert=${this.budgetAlertIntervalMinutes}m`,
        `goal-alert=${this.goalAlertIntervalMinutes}m`,
        `recalc=${this.recalcIntervalMinutes}m`,
        `goal-due-soon-days=${this.goalDueSoonDays}`,
        `spending-spike-threshold=${this.spendingSpikeThresholdPercent}%`,
      ].join(" "),
    )

    const billAlertIntervalMinutes = parsePositiveInt(
      this.config.get("JOBS_BILL_ALERT_INTERVAL_MINUTES"),
      60,
    )

    void Promise.allSettled([
      this.runBudgetAlerts("startup"),
      this.runSpendingSpikeAlerts("startup"),
      this.runGoalAlerts("startup"),
      this.runBillAlerts("startup"),
      this.runRecalculation("startup"),
    ])

    this.billAlertsTimer = setInterval(() => {
      void this.runBillAlerts("interval")
    }, billAlertIntervalMinutes * 60_000)

    this.budgetAlertsTimer = setInterval(() => {
      void Promise.allSettled([
        this.runBudgetAlerts("interval"),
        this.runSpendingSpikeAlerts("interval"),
      ])
    }, this.budgetAlertIntervalMinutes * 60_000)

    this.goalAlertsTimer = setInterval(() => {
      void this.runGoalAlerts("interval")
    }, this.goalAlertIntervalMinutes * 60_000)

    this.recalcTimer = setInterval(() => {
      void this.runRecalculation("interval")
    }, this.recalcIntervalMinutes * 60_000)
  }

  onModuleDestroy() {
    if (this.budgetAlertsTimer) clearInterval(this.budgetAlertsTimer)
    if (this.goalAlertsTimer) clearInterval(this.goalAlertsTimer)
    if (this.billAlertsTimer) clearInterval(this.billAlertsTimer)
    if (this.recalcTimer) clearInterval(this.recalcTimer)
  }

  private async fetchCurrentMonthBudgetUsage() {
    const now = new Date()
    const monthStart = startOfMonthUtc(now)
    const monthEnd = addMonthsUtc(monthStart, 1)

    const rows = await this.prisma.$queryRaw<BudgetUsageRow[]>`
      SELECT
        b."id" AS budget_id,
        b."userId" AS user_id,
        c."name" AS category_name,
        b."limitCents" AS limit_cents,
        b."alertPercent" AS alert_percent,
        COALESCE(SUM(t."amountCents"), 0)::int AS consumed_cents
      FROM "Budget" b
      INNER JOIN "Category" c ON c."id" = b."categoryId"
      LEFT JOIN "Transaction" t
        ON t."userId" = b."userId"
       AND t."categoryId" = b."categoryId"
       AND t."type" = 'EXPENSE'
       AND t."occurredAt" >= b."month"
       AND t."occurredAt" < (b."month" + INTERVAL '1 month')
      WHERE b."month" >= ${monthStart}
        AND b."month" < ${monthEnd}
      GROUP BY b."id", b."userId", c."name", b."limitCents", b."alertPercent"
    `

    return { monthStart, rows }
  }

  private async fetchOpenGoals() {
    return this.prisma.$queryRaw<GoalProgressRow[]>`
      SELECT
        g."id" AS goal_id,
        g."userId" AS user_id,
        g."name" AS goal_name,
        g."targetCents" AS target_cents,
        g."currentCents" AS current_cents,
        g."targetDate" AS target_date
      FROM "Goal" g
      WHERE g."currentCents" < g."targetCents"
    `
  }

  private async fetchExpenseSpikeRows(windowDays: number, now: Date) {
    const currentStart = subtractDaysUtc(now, windowDays)
    const previousStart = subtractDaysUtc(currentStart, windowDays)

    return this.prisma.$queryRaw<SpendingSpikeRow[]>`
      SELECT
        t."userId" AS user_id,
        COALESCE(SUM(
          CASE
            WHEN t."occurredAt" >= ${currentStart}
             AND t."occurredAt" < ${now}
              THEN t."amountCents"
            ELSE 0
          END
        ), 0)::int AS current_cents,
        COALESCE(SUM(
          CASE
            WHEN t."occurredAt" >= ${previousStart}
             AND t."occurredAt" < ${currentStart}
              THEN t."amountCents"
            ELSE 0
          END
        ), 0)::int AS previous_cents
      FROM "Transaction" t
      WHERE t."type" = 'EXPENSE'
        AND t."occurredAt" >= ${previousStart}
        AND t."occurredAt" < ${now}
      GROUP BY t."userId"
    `
  }

  private getBudgetAlerts(rows: BudgetUsageRow[], monthKeyValue: string) {
    return rows
      .map<BudgetAlert | null>((row) => {
        const usedPercent =
          row.limit_cents > 0 ? Math.round((row.consumed_cents / row.limit_cents) * 10000) / 100 : 0

        const overLimit = row.consumed_cents > row.limit_cents
        const alertReached = usedPercent >= row.alert_percent
        if (!overLimit && !alertReached) return null

        const level: BudgetAlert["level"] = overLimit ? "over_limit" : "threshold"
        return {
          key: `${row.budget_id}:${level}:${monthKeyValue}`,
          level,
          sourceId: row.budget_id,
          userId: row.user_id,
          categoryName: row.category_name,
          consumedCents: row.consumed_cents,
          limitCents: row.limit_cents,
          usedPercent,
          alertPercent: row.alert_percent,
          monthKey: monthKeyValue,
        }
      })
      .filter((item): item is BudgetAlert => item !== null)
  }

  private getGoalAlerts(rows: GoalProgressRow[], now: Date) {
    return rows
      .map<GoalAlert | null>((row) => {
        const daysRemaining = getGoalDaysRemaining(row.target_date, now)
        const dueSoon = daysRemaining >= 0 && daysRemaining <= this.goalDueSoonDays
        const overdue = daysRemaining < 0
        if (!dueSoon && !overdue) return null

        const level: GoalAlert["level"] = overdue ? "overdue" : "due_soon"
        const progressPercent =
          row.target_cents > 0 ? Math.round((row.current_cents / row.target_cents) * 10000) / 100 : 0

        return {
          key: `${row.goal_id}:${level}`,
          level,
          sourceId: row.goal_id,
          userId: row.user_id,
          goalName: row.goal_name,
          remainingCents: Math.max(0, row.target_cents - row.current_cents),
          progressPercent,
          daysRemaining,
        }
      })
      .filter((item): item is GoalAlert => item !== null)
  }

  private getSpendingSpikeAlerts(rows: SpendingSpikeRow[], window: SpendingSpikeWindow) {
    return rows
      .map<SpendingSpikeAlert | null>((row) => {
        if (row.previous_cents <= 0) return null
        if (row.current_cents <= row.previous_cents) return null

        const deltaCents = row.current_cents - row.previous_cents
        const growthPercent = Math.round((deltaCents / row.previous_cents) * 10_000) / 100
        if (growthPercent < this.spendingSpikeThresholdPercent) return null

        return {
          key: `spending-spike:${window}:${row.user_id}`,
          window,
          sourceId: row.user_id,
          userId: row.user_id,
          currentCents: row.current_cents,
          previousCents: row.previous_cents,
          deltaCents,
          growthPercent,
          thresholdPercent: this.spendingSpikeThresholdPercent,
        }
      })
      .filter((item): item is SpendingSpikeAlert => item !== null)
  }

  private toPersistedBudgetAlert(item: BudgetAlert): PersistedAlertInput {
    const type =
      item.level === "over_limit"
        ? SystemAlertType.BUDGET_OVER_LIMIT
        : SystemAlertType.BUDGET_THRESHOLD

    const title =
      item.level === "over_limit"
        ? "Orcamento acima do limite"
        : "Alerta de orcamento atingido"

    const message =
      item.level === "over_limit"
        ? `Categoria ${item.categoryName} excedeu o limite mensal (${item.usedPercent.toFixed(2)}%).`
        : `Categoria ${item.categoryName} atingiu ${item.usedPercent.toFixed(2)}% do orcamento.`

    return {
      dedupeKey: item.key,
      userId: item.userId,
      sourceId: item.sourceId,
      type,
      title,
      message,
      payload: {
        categoryName: item.categoryName,
        monthKey: item.monthKey,
        consumedCents: item.consumedCents,
        limitCents: item.limitCents,
        usedPercent: item.usedPercent,
        alertPercent: item.alertPercent,
      },
    }
  }

  private toPersistedGoalAlert(item: GoalAlert): PersistedAlertInput {
    const type =
      item.level === "overdue" ? SystemAlertType.GOAL_OVERDUE : SystemAlertType.GOAL_DUE_SOON

    const title = item.level === "overdue" ? "Meta atrasada" : "Meta perto do prazo"

    const message =
      item.level === "overdue"
        ? `A meta ${item.goalName} esta atrasada em ${Math.abs(item.daysRemaining)} dia(s).`
        : `A meta ${item.goalName} vence em ${item.daysRemaining} dia(s).`

    return {
      dedupeKey: item.key,
      userId: item.userId,
      sourceId: item.sourceId,
      type,
      title,
      message,
      payload: {
        goalName: item.goalName,
        remainingCents: item.remainingCents,
        progressPercent: item.progressPercent,
        daysRemaining: item.daysRemaining,
      },
    }
  }

  private toPersistedSpendingSpikeAlert(item: SpendingSpikeAlert): PersistedAlertInput {
    const isWeekly = item.window === "weekly"
    const type = isWeekly
      ? SPENDING_SPIKE_WEEKLY_TYPE
      : SPENDING_SPIKE_MONTHLY_TYPE
    const title = isWeekly
      ? "Gastos em alta nos ultimos 7 dias"
      : "Gastos em alta nos ultimos 30 dias"
    const comparisonDays = isWeekly ? 7 : 30

    return {
      dedupeKey: item.key,
      userId: item.userId,
      sourceId: item.sourceId,
      type,
      title,
      message: `Seus gastos subiram ${item.growthPercent.toFixed(2)}% em comparacao com os ${comparisonDays} dias anteriores.`,
      payload: {
        window: item.window,
        comparisonDays,
        currentCents: item.currentCents,
        previousCents: item.previousCents,
        deltaCents: item.deltaCents,
        growthPercent: item.growthPercent,
        thresholdPercent: item.thresholdPercent,
      },
    }
  }

  private async persistAlerts(
    activeAlerts: PersistedAlertInput[],
    typesToResolve: SystemAlertType[],
  ) {
    const now = new Date()
    const dedupeKeys = Array.from(new Set(activeAlerts.map((item) => item.dedupeKey)))
    const existing = dedupeKeys.length
      ? await this.prisma.systemAlert.findMany({
          where: { dedupeKey: { in: dedupeKeys } },
          select: { dedupeKey: true, status: true },
        })
      : []
    const existingByKey = new Map(existing.map((item) => [item.dedupeKey, item.status]))
    const notificationsToSend = activeAlerts.filter((item) => {
      const status = existingByKey.get(item.dedupeKey)
      return !status || status === SystemAlertStatus.RESOLVED
    })

    if (activeAlerts.length > 0) {
      await this.prisma.$transaction(
        activeAlerts.map((item) =>
          this.prisma.systemAlert.upsert({
            where: { dedupeKey: item.dedupeKey },
            create: {
              userId: item.userId,
              sourceId: item.sourceId,
              dedupeKey: item.dedupeKey,
              type: item.type,
              status: SystemAlertStatus.ACTIVE,
              title: item.title,
              message: item.message,
              payload: item.payload,
              firstTriggeredAt: now,
              lastTriggeredAt: now,
            },
            update: {
              userId: item.userId,
              sourceId: item.sourceId,
              type: item.type,
              title: item.title,
              message: item.message,
              payload: item.payload,
              lastTriggeredAt: now,
            },
          }),
        ),
      )

      await this.prisma.systemAlert.updateMany({
        where: {
          dedupeKey: { in: dedupeKeys },
          status: SystemAlertStatus.RESOLVED,
        },
        data: {
          status: SystemAlertStatus.ACTIVE,
          readAt: null,
          resolvedAt: null,
          lastTriggeredAt: now,
        },
      })
    }

    await this.prisma.systemAlert.updateMany({
      where: {
        type: { in: typesToResolve },
        status: { in: [SystemAlertStatus.ACTIVE, SystemAlertStatus.READ] },
        ...(dedupeKeys.length > 0 ? { dedupeKey: { notIn: dedupeKeys } } : null),
      },
      data: {
        status: SystemAlertStatus.RESOLVED,
        resolvedAt: now,
      },
    })

    return notificationsToSend
  }

  private async runBudgetAlerts(source: JobSource) {
    try {
      const { monthStart, rows } = await this.fetchCurrentMonthBudgetUsage()
      const monthScope = monthKey(monthStart)
      const alerts = this.getBudgetAlerts(rows, monthScope)
      const nextKeys = new Set(alerts.map((item) => item.key))
      const persistedAlerts = alerts.map((item) => this.toPersistedBudgetAlert(item))

      const notificationsToSend = await this.persistAlerts(persistedAlerts, [
        SystemAlertType.BUDGET_THRESHOLD,
        SystemAlertType.BUDGET_OVER_LIMIT,
      ])
      await this.pushNotifications.sendSystemAlerts(notificationsToSend)

      const newAlerts = alerts.filter((item) => !this.activeBudgetAlertKeys.has(item.key))
      const resolvedCount = Array.from(this.activeBudgetAlertKeys).filter((key) => !nextKeys.has(key)).length
      const shouldLog = source === "startup" || newAlerts.length > 0 || resolvedCount > 0

      if (shouldLog) {
        const overLimitCount = alerts.filter((item) => item.level === "over_limit").length
        this.logger.warn(
          [
            `[budget-alerts/${source}]`,
            `mes=${monthKey(monthStart)}`,
            `ativos=${alerts.length}`,
            `novos=${newAlerts.length}`,
            `resolvidos=${resolvedCount}`,
            `over-limit=${overLimitCount}`,
          ].join(" "),
        )

        for (const item of newAlerts.slice(0, 5)) {
          this.logger.warn(
            [
              "[budget-alert]",
              `user=${item.userId}`,
              `categoria="${item.categoryName}"`,
              `uso=${item.usedPercent.toFixed(2)}%`,
              `consumido=${formatCentsBRL(item.consumedCents)}`,
              `limite=${formatCentsBRL(item.limitCents)}`,
              `alerta=${item.alertPercent}%`,
            ].join(" "),
          )
        }
      }

      this.activeBudgetAlertKeys = nextKeys
    } catch (error) {
      this.logger.error(
        `[budget-alerts/${source}] erro ao calcular alertas de orcamento`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  private async runSpendingSpikeAlerts(source: JobSource) {
    try {
      const now = new Date()
      const [weeklyRows, monthlyRows] = await Promise.all([
        this.fetchExpenseSpikeRows(7, now),
        this.fetchExpenseSpikeRows(30, now),
      ])

      const alerts = [
        ...this.getSpendingSpikeAlerts(weeklyRows, "weekly"),
        ...this.getSpendingSpikeAlerts(monthlyRows, "monthly"),
      ]
      const nextKeys = new Set(alerts.map((item) => item.key))
      const persistedAlerts = alerts.map((item) => this.toPersistedSpendingSpikeAlert(item))

      const notificationsToSend = await this.persistAlerts(persistedAlerts, [
        SPENDING_SPIKE_WEEKLY_TYPE,
        SPENDING_SPIKE_MONTHLY_TYPE,
      ])
      await this.pushNotifications.sendSystemAlerts(notificationsToSend)

      const newAlerts = alerts.filter((item) => !this.activeSpendingSpikeAlertKeys.has(item.key))
      const resolvedCount = Array.from(this.activeSpendingSpikeAlertKeys).filter((key) => !nextKeys.has(key)).length
      const shouldLog = source === "startup" || newAlerts.length > 0 || resolvedCount > 0

      if (shouldLog) {
        const weeklyCount = alerts.filter((item) => item.window === "weekly").length
        const monthlyCount = alerts.length - weeklyCount
        this.logger.warn(
          [
            `[spending-spike/${source}]`,
            `ativos=${alerts.length}`,
            `novos=${newAlerts.length}`,
            `resolvidos=${resolvedCount}`,
            `weekly=${weeklyCount}`,
            `monthly=${monthlyCount}`,
            `threshold=${this.spendingSpikeThresholdPercent}%`,
          ].join(" "),
        )

        for (const item of newAlerts.slice(0, 5)) {
          this.logger.warn(
            [
              "[spending-spike-alert]",
              `user=${item.userId}`,
              `window=${item.window}`,
              `growth=${item.growthPercent.toFixed(2)}%`,
              `atual=${formatCentsBRL(item.currentCents)}`,
              `anterior=${formatCentsBRL(item.previousCents)}`,
            ].join(" "),
          )
        }
      }

      this.activeSpendingSpikeAlertKeys = nextKeys
    } catch (error) {
      this.logger.error(
        `[spending-spike/${source}] erro ao calcular alta de gastos`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  private getBillDueDate(now: Date, closingDay: number, dueDay: number): Date {
    const closeMonth = new Date(now.getFullYear(), now.getMonth(), Math.min(closingDay, 28))
    if (now.getDate() <= closingDay) {
      closeMonth.setMonth(closeMonth.getMonth() - 1)
    }
    const dueMonth = new Date(closeMonth)
    if (dueDay >= closingDay) {
      dueMonth.setDate(dueDay)
    } else {
      dueMonth.setMonth(dueMonth.getMonth() + 1)
      dueMonth.setDate(dueDay)
    }
    return dueMonth
  }

  private async runBillAlerts(source: JobSource) {
    try {
      const now = new Date()
      const creditAccounts = await this.prisma.account.findMany({
        where: { type: "CREDIT", dueDay: { not: null }, closingDay: { not: null } },
        select: { id: true, userId: true, name: true, closingDay: true, dueDay: true },
      })

      type BillAlert = {
        key: string
        level: "due_soon" | "overdue"
        sourceId: string
        userId: string
        accountName: string
        dueDate: Date
        daysRemaining: number
        debtCents: number
      }

      const alerts: BillAlert[] = []

      for (const acc of creditAccounts) {
        const closingDay = acc.closingDay ?? 10
        const dueDay = acc.dueDay ?? 15
        const dueDate = this.getBillDueDate(now, closingDay, dueDay)
        const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / DAY_MS)

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
          WHERE a."id" = ${acc.id} AND a."userId" = ${acc.userId}
          GROUP BY a."id"
        `)
        const debtCents = Math.max(0, -(balanceRow?.balance_cents ?? 0))
        if (debtCents === 0) continue

        const dueSoon = daysRemaining >= 0 && daysRemaining <= this.goalDueSoonDays
        const overdue = daysRemaining < 0
        if (!dueSoon && !overdue) continue

        const level: BillAlert["level"] = overdue ? "overdue" : "due_soon"
        alerts.push({
          key: `bill:${acc.id}:${dueDate.toISOString().slice(0, 10)}`,
          level,
          sourceId: acc.id,
          userId: acc.userId,
          accountName: acc.name,
          dueDate,
          daysRemaining,
          debtCents,
        })
      }

      const persistedAlerts = alerts.map((item) => ({
        dedupeKey: item.key,
        userId: item.userId,
        sourceId: item.sourceId,
        type:
          item.level === "overdue" ? SystemAlertType.BILL_OVERDUE : SystemAlertType.BILL_DUE_SOON,
        title: item.level === "overdue" ? "Fatura vencida" : "Fatura proxima do vencimento",
        message:
          item.level === "overdue"
            ? `Fatura do cartao ${item.accountName} venceu ha ${Math.abs(item.daysRemaining)} dia(s). Valor: R$ ${(item.debtCents / 100).toFixed(2)}`
            : `Fatura do cartao ${item.accountName} vence em ${item.daysRemaining} dia(s). Valor: R$ ${(item.debtCents / 100).toFixed(2)}`,
        payload: {
          accountName: item.accountName,
          dueDate: item.dueDate.toISOString(),
          daysRemaining: item.daysRemaining,
          debtCents: item.debtCents,
        },
      }))

      const notificationsToSend = await this.persistAlerts(persistedAlerts, [
        SystemAlertType.BILL_DUE_SOON,
        SystemAlertType.BILL_OVERDUE,
      ])
      await this.pushNotifications.sendSystemAlerts(notificationsToSend)

      const nextKeys = new Set(alerts.map((a) => a.key))
      const newAlerts = alerts.filter((a) => !this.activeBillAlertKeys.has(a.key))
      const resolvedCount = Array.from(this.activeBillAlertKeys).filter((k) => !nextKeys.has(k)).length
      this.activeBillAlertKeys = nextKeys

      if (source === "startup" || newAlerts.length > 0 || resolvedCount > 0) {
        this.logger.warn(
          `[bill-alerts/${source}] ativos=${alerts.length} novos=${newAlerts.length} resolvidos=${resolvedCount}`,
        )
      }
    } catch (error) {
      this.logger.error(
        `[bill-alerts] erro ao calcular alertas de faturas`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  private async runGoalAlerts(source: JobSource) {
    try {
      const now = new Date()
      const rows = await this.fetchOpenGoals()
      const alerts = this.getGoalAlerts(rows, now)
      const nextKeys = new Set(alerts.map((item) => item.key))
      const persistedAlerts = alerts.map((item) => this.toPersistedGoalAlert(item))

      const notificationsToSend = await this.persistAlerts(persistedAlerts, [
        SystemAlertType.GOAL_DUE_SOON,
        SystemAlertType.GOAL_OVERDUE,
      ])
      await this.pushNotifications.sendSystemAlerts(notificationsToSend)

      const newAlerts = alerts.filter((item) => !this.activeGoalAlertKeys.has(item.key))
      const resolvedCount = Array.from(this.activeGoalAlertKeys).filter((key) => !nextKeys.has(key)).length
      const shouldLog = source === "startup" || newAlerts.length > 0 || resolvedCount > 0

      if (shouldLog) {
        const overdueCount = alerts.filter((item) => item.level === "overdue").length
        this.logger.warn(
          [
            `[goal-alerts/${source}]`,
            `ativos=${alerts.length}`,
            `novos=${newAlerts.length}`,
            `resolvidos=${resolvedCount}`,
            `vencidos=${overdueCount}`,
            `janela-dias=${this.goalDueSoonDays}`,
          ].join(" "),
        )

        for (const item of newAlerts.slice(0, 5)) {
          this.logger.warn(
            [
              "[goal-alert]",
              `user=${item.userId}`,
              `meta="${item.goalName}"`,
              `progresso=${item.progressPercent.toFixed(2)}%`,
              `restante=${item.remainingCents}`,
              `dias-restantes=${item.daysRemaining}`,
            ].join(" "),
          )
        }
      }

      this.activeGoalAlertKeys = nextKeys
    } catch (error) {
      this.logger.error(
        `[goal-alerts/${source}] erro ao calcular alertas de metas`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  private async runRecalculation(source: JobSource) {
    try {
      const now = new Date()
      const { monthStart, rows: budgetRows } = await this.fetchCurrentMonthBudgetUsage()
      const openGoals = await this.fetchOpenGoals()

      let budgetsAlertReached = 0
      let budgetsOverLimit = 0
      for (const row of budgetRows) {
        const usedPercent =
          row.limit_cents > 0 ? Math.round((row.consumed_cents / row.limit_cents) * 10000) / 100 : 0
        if (usedPercent >= row.alert_percent) budgetsAlertReached += 1
        if (row.consumed_cents > row.limit_cents) budgetsOverLimit += 1
      }

      let goalsDueSoon = 0
      let goalsOverdue = 0
      for (const goal of openGoals) {
        const daysRemaining = getGoalDaysRemaining(goal.target_date, now)
        if (daysRemaining < 0) goalsOverdue += 1
        if (daysRemaining >= 0 && daysRemaining <= this.goalDueSoonDays) goalsDueSoon += 1
      }

      const summary: RecalcSummary = {
        monthKey: monthKey(monthStart),
        budgetsTotal: budgetRows.length,
        budgetsAlertReached,
        budgetsOverLimit,
        goalsOpen: openGoals.length,
        goalsDueSoon,
        goalsOverdue,
      }

      const changed = JSON.stringify(summary) !== JSON.stringify(this.lastRecalcSummary)
      if (source === "startup" || changed) {
        this.logger.log(
          [
            `[recalc/${source}]`,
            `mes=${summary.monthKey}`,
            `budgets=${summary.budgetsTotal}`,
            `budget-alert=${summary.budgetsAlertReached}`,
            `budget-over-limit=${summary.budgetsOverLimit}`,
            `goals-open=${summary.goalsOpen}`,
            `goals-due-soon=${summary.goalsDueSoon}`,
            `goals-overdue=${summary.goalsOverdue}`,
          ].join(" "),
        )
      }

      this.lastRecalcSummary = summary
    } catch (error) {
      this.logger.error(
        `[recalc/${source}] erro no recalculo das metricas`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
