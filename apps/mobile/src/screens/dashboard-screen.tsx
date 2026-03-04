import * as React from "react"
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native"
import { useIsFocused } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAuth } from "../auth/auth-context"
import { formatMoney, supportedCurrencies } from "../lib/money"
import { formatOfflineTimestamp, readOfflineCache, writeOfflineCache } from "../lib/offline-cache"
import { flushPendingOperations } from "../lib/offline-outbox"
import type { RootStackParamList } from "../navigation/app-navigator"
import { Card, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

type DashboardRange = "month" | "year"

type Account = {
  id: string
  name: string
}

type AccountsResponse = {
  items: Account[]
}

type DashboardSummary = {
  range: DashboardRange
  baseCurrency: string
  supportedCurrencies: string[]
  start: string
  end: string
  balanceCents: number
  incomeCents: number
  expenseCents: number
  netCents: number
  series: Array<{ label: string; netCents: number }>
  byCategory: Array<{ categoryId: string | null; categoryName: string; expenseCents: number }>
}

type BudgetItem = {
  id: string
  year: number
  month: number
  limitCents: number
  consumedCents: number
  remainingCents: number
  usedPercent: number
  alertPercent: number
  alertReached: boolean
  overLimit: boolean
  category: {
    id: string
    name: string
    type: "INCOME" | "EXPENSE"
    icon?: string
    color?: string
  }
}

type BudgetListResponse = {
  items: BudgetItem[]
}

type GoalItem = {
  id: string
  name: string
  targetCents: number
  currentCents: number
  targetDate: string
  progressPercent: number
  remainingCents: number
  completed: boolean
  daysRemaining: number
}

type GoalListResponse = {
  items: GoalItem[]
}

type SystemAlertItem = {
  id: string
  type:
    | "BUDGET_THRESHOLD"
    | "BUDGET_OVER_LIMIT"
    | "GOAL_DUE_SOON"
    | "GOAL_OVERDUE"
    | "BILL_DUE_SOON"
    | "BILL_OVERDUE"
    | "SPENDING_SPIKE_WEEKLY"
    | "SPENDING_SPIKE_MONTHLY"
  status: "ACTIVE" | "READ" | "RESOLVED"
  sourceId: string
  title: string
  message: string
  payload?: Record<string, unknown>
  firstTriggeredAt: string
  lastTriggeredAt: string
  readAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

type SystemAlertListResponse = {
  items: SystemAlertItem[]
}

type DashboardCriticalsCache = {
  criticalBudgets: BudgetItem[]
  criticalGoals: GoalItem[]
}

const DASHBOARD_ACCOUNTS_CACHE_KEY = "dashboard:accounts"
const DASHBOARD_CRITICALS_CACHE_KEY = "dashboard:criticals"
const DASHBOARD_ALERTS_CACHE_KEY = "dashboard:alerts"

function getDashboardSummaryCacheKey(range: DashboardRange, accountId: string, baseCurrency: string) {
  return `dashboard:summary:${range}:${accountId}:${baseCurrency}`
}

function formatAmount(cents: number, currency = "BRL") {
  return formatMoney(cents, currency)
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR").format(d)
}

function getAlertTypeLabel(type: SystemAlertItem["type"]) {
  if (type === "BUDGET_OVER_LIMIT") return "Orcamento"
  if (type === "BUDGET_THRESHOLD") return "Alerta de orcamento"
  if (type === "BILL_OVERDUE") return "Fatura vencida"
  if (type === "BILL_DUE_SOON") return "Fatura"
  if (type === "GOAL_OVERDUE") return "Meta atrasada"
  if (type === "SPENDING_SPIKE_WEEKLY") return "Alta semanal"
  if (type === "SPENDING_SPIKE_MONTHLY") return "Alta mensal"
  return "Meta perto do prazo"
}

function formatMonthYear(month: number, year: number) {
  return `${String(month).padStart(2, "0")}/${year}`
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function getCategoryPercent(expenseCents: number, totalExpenseCents: number) {
  if (totalExpenseCents <= 0) return 0
  return Math.max(0, Math.min(100, (expenseCents / totalExpenseCents) * 100))
}

function getBudgetCriticalScore(item: BudgetItem) {
  const overLimitScore = item.overLimit ? 1_000_000 : 0
  const alertScore = item.alertReached ? 500_000 : 0
  const exceededCentsScore = Math.max(0, item.consumedCents - item.limitCents)
  const usageScore = Math.round(Math.max(0, item.usedPercent) * 1000)
  return overLimitScore + alertScore + exceededCentsScore + usageScore
}

function getGoalCriticalScore(item: GoalItem) {
  if (item.completed) return -1

  const overdueScore = item.daysRemaining < 0 ? (Math.abs(item.daysRemaining) + 1) * 1_000_000 : 0
  const dueSoonScore = item.daysRemaining >= 0 ? Math.max(0, 30 - item.daysRemaining) * 50_000 : 0
  const missingProgressScore = Math.round(Math.max(0, 100 - item.progressPercent) * 1000)
  const remainingCentsScore = Math.max(0, item.remainingCents)

  return overdueScore + dueSoonScore + missingProgressScore + remainingCentsScore
}

function getBudgetStatusLabel(item: BudgetItem) {
  if (item.overLimit) return "Acima do limite"
  if (item.alertReached) return `Alerta de ${item.alertPercent}% atingido`
  return "Consumo sob controle"
}

function getGoalStatusLabel(item: GoalItem) {
  if (item.completed) return "Meta concluida"
  if (item.daysRemaining < 0) return `${Math.abs(item.daysRemaining)} dia(s) apos prazo`
  if (item.daysRemaining === 0) return "Vence hoje"
  return `${item.daysRemaining} dia(s) restantes`
}

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">

export function DashboardScreen({ navigation }: Props) {
  const { user, signOut, apiFetch } = useAuth()
  const isFocused = useIsFocused()

  const [range, setRange] = React.useState<DashboardRange>("month")
  const [accountId, setAccountId] = React.useState<string>("all")
  const [baseCurrency, setBaseCurrency] = React.useState<string>("BRL")

  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = React.useState(true)

  const [summary, setSummary] = React.useState<DashboardSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = React.useState(true)
  const [criticalBudgets, setCriticalBudgets] = React.useState<BudgetItem[]>([])
  const [criticalGoals, setCriticalGoals] = React.useState<GoalItem[]>([])
  const [loadingCriticals, setLoadingCriticals] = React.useState(true)
  const [alerts, setAlerts] = React.useState<SystemAlertItem[]>([])
  const [loadingAlerts, setLoadingAlerts] = React.useState(true)
  const [markingAlertsRead, setMarkingAlertsRead] = React.useState(false)
  const [offlineState, setOfflineState] = React.useState<Record<string, string>>({})

  const updateOfflineState = React.useCallback((key: string, message: string | null) => {
    setOfflineState((current) => {
      const next = { ...current }
      if (message) {
        next[key] = message
      } else {
        delete next[key]
      }
      return next
    })
  }, [])

  const offlineEntries = Object.values(offlineState)
  const offlineNotice =
    offlineEntries.length > 0 ? `Modo offline: ${offlineEntries.join(" | ")}` : null

  React.useEffect(() => {
    if (!isFocused) return
    void flushPendingOperations(apiFetch).catch(() => null)
  }, [apiFetch, isFocused])

  React.useEffect(() => {
    let alive = true
    setLoadingAccounts(true)

    void (async () => {
      const cached = await readOfflineCache<AccountsResponse>(DASHBOARD_ACCOUNTS_CACHE_KEY)

      if (cached && alive) {
        setAccounts(cached.value.items ?? [])
        setLoadingAccounts(false)
      }

      try {
        const data = await apiFetch<AccountsResponse>("/accounts?page=1&pageSize=200&sortBy=name&sortDir=asc", {
          cache: "no-store",
        } as any)
        if (!alive) return
        setAccounts(data.items ?? [])
        updateOfflineState("accounts", null)
        await writeOfflineCache(DASHBOARD_ACCOUNTS_CACHE_KEY, data)
      } catch {
        if (!alive) return
        if (cached) {
          setAccounts(cached.value.items ?? [])
          updateOfflineState("accounts", `contas em ${formatOfflineTimestamp(cached.updatedAt)}`)
        } else {
          setAccounts([])
          updateOfflineState("accounts", null)
        }
      } finally {
        if (!alive) return
        setLoadingAccounts(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [apiFetch, updateOfflineState])

  const loadAlerts = React.useCallback(async () => {
    setLoadingAlerts(true)
    const cached = await readOfflineCache<SystemAlertListResponse>(DASHBOARD_ALERTS_CACHE_KEY)

    if (cached) {
      setAlerts(cached.value.items ?? [])
      setLoadingAlerts(false)
    }

    try {
      const params = new URLSearchParams()
      params.set("page", "1")
      params.set("pageSize", "5")
      params.set("status", "ACTIVE")
      params.set("sortBy", "lastTriggeredAt")
      params.set("sortDir", "desc")
      const data = await apiFetch<SystemAlertListResponse>(`/alerts?${params.toString()}`, {
        cache: "no-store",
      } as any)
      setAlerts(data.items ?? [])
      updateOfflineState("alerts", null)
      await writeOfflineCache(DASHBOARD_ALERTS_CACHE_KEY, data)
    } catch {
      if (cached) {
        setAlerts(cached.value.items ?? [])
        updateOfflineState("alerts", `alertas em ${formatOfflineTimestamp(cached.updatedAt)}`)
      } else {
        setAlerts([])
        updateOfflineState("alerts", null)
      }
    } finally {
      setLoadingAlerts(false)
    }
  }, [apiFetch, updateOfflineState])

  React.useEffect(() => {
    if (!isFocused) return
    void loadAlerts()
  }, [isFocused, loadAlerts])

  const markAllAlertsRead = React.useCallback(async () => {
    setMarkingAlertsRead(true)
    try {
      await apiFetch("/alerts/read-all", { method: "PATCH" })
      await loadAlerts()
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao atualizar alertas")
    } finally {
      setMarkingAlertsRead(false)
    }
  }, [apiFetch, loadAlerts])

  React.useEffect(() => {
    let alive = true
    setLoadingSummary(true)

    const params = new URLSearchParams()
    params.set("range", range)
    if (accountId !== "all") params.set("accountId", accountId)
    params.set("baseCurrency", baseCurrency)
    const cacheKey = getDashboardSummaryCacheKey(range, accountId, baseCurrency)

    void (async () => {
      const cached = await readOfflineCache<DashboardSummary>(cacheKey)

      if (cached && alive) {
        setSummary(cached.value)
        setLoadingSummary(false)
      }

      try {
        const data = await apiFetch<DashboardSummary>(`/dashboard/summary?${params.toString()}`, { cache: "no-store" } as any)
        if (!alive) return
        setSummary(data)
        updateOfflineState("summary", null)
        await writeOfflineCache(cacheKey, data)
      } catch (error) {
        if (!alive) return
        if (cached) {
          setSummary(cached.value)
          updateOfflineState("summary", `dashboard em ${formatOfflineTimestamp(cached.updatedAt)}`)
        } else {
          setSummary(null)
          updateOfflineState("summary", null)
          Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao carregar dashboard")
        }
      } finally {
        if (!alive) return
        setLoadingSummary(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [accountId, apiFetch, baseCurrency, range, updateOfflineState])

  React.useEffect(() => {
    let alive = true
    setLoadingCriticals(true)

    const now = new Date()

    const budgetParams = new URLSearchParams()
    budgetParams.set("page", "1")
    budgetParams.set("pageSize", "200")
    budgetParams.set("sortBy", "month")
    budgetParams.set("sortDir", "desc")
    budgetParams.set("year", String(now.getUTCFullYear()))
    budgetParams.set("month", String(now.getUTCMonth() + 1))

    const goalParams = new URLSearchParams()
    goalParams.set("page", "1")
    goalParams.set("pageSize", "200")
    goalParams.set("sortBy", "targetDate")
    goalParams.set("sortDir", "asc")

    void (async () => {
      const cached = await readOfflineCache<DashboardCriticalsCache>(DASHBOARD_CRITICALS_CACHE_KEY)

      if (cached && alive) {
        setCriticalBudgets(cached.value.criticalBudgets ?? [])
        setCriticalGoals(cached.value.criticalGoals ?? [])
        setLoadingCriticals(false)
      }

      const [budgetResult, goalResult] = await Promise.allSettled([
        apiFetch<BudgetListResponse>(`/budgets?${budgetParams.toString()}`, {
          cache: "no-store",
        } as any),
        apiFetch<GoalListResponse>(`/goals?${goalParams.toString()}`, {
          cache: "no-store",
        } as any),
      ])

      if (!alive) return

      if (budgetResult.status === "fulfilled" && goalResult.status === "fulfilled") {
        const topBudgets = [...(budgetResult.value.items ?? [])]
          .sort((a, b) => {
            const scoreDiff = getBudgetCriticalScore(b) - getBudgetCriticalScore(a)
            if (scoreDiff !== 0) return scoreDiff
            return b.usedPercent - a.usedPercent
          })
          .slice(0, 2)

        const topGoals = [...(goalResult.value.items ?? [])]
          .filter((item) => !item.completed)
          .sort((a, b) => {
            const scoreDiff = getGoalCriticalScore(b) - getGoalCriticalScore(a)
            if (scoreDiff !== 0) return scoreDiff
            return a.daysRemaining - b.daysRemaining
          })
          .slice(0, 2)

        setCriticalBudgets(topBudgets)
        setCriticalGoals(topGoals)
        updateOfflineState("criticals", null)
        await writeOfflineCache(DASHBOARD_CRITICALS_CACHE_KEY, {
          criticalBudgets: topBudgets,
          criticalGoals: topGoals,
        })
      } else if (cached) {
        setCriticalBudgets(cached.value.criticalBudgets ?? [])
        setCriticalGoals(cached.value.criticalGoals ?? [])
        updateOfflineState("criticals", `criticos em ${formatOfflineTimestamp(cached.updatedAt)}`)
      } else {
        setCriticalBudgets([])
        setCriticalGoals([])
        updateOfflineState("criticals", null)
      }

      if (!alive) return
      setLoadingCriticals(false)
    })()

    return () => {
      alive = false
    }
  }, [apiFetch, updateOfflineState])

  const series = summary?.series ?? []
  const maxAbsNet = Math.max(1, ...series.map((point) => Math.abs(point.netCents)))
  const totalExpenseCents = summary?.expenseCents ?? 0
  const currencies = summary?.supportedCurrencies?.length ? summary.supportedCurrencies : [...supportedCurrencies]

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Ola,</Text>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name?.trim() || user?.email || "-"}
            </Text>
          </View>
          <PrimaryButton title="Sair" onPress={() => void signOut()} />
        </View>

        {offlineNotice ? <Text style={styles.notice}>{offlineNotice}</Text> : null}

        <View style={styles.row}>
          <PrimaryButton title={range === "month" ? "Mes (ativo)" : "Mes"} onPress={() => setRange("month")} />
          <PrimaryButton title={range === "year" ? "Ano (ativo)" : "Ano"} onPress={() => setRange("year")} />
        </View>

        <Card title="Moeda base">
          <View style={styles.chips}>
            {currencies.map((currency) => (
              <Text
                key={currency}
                style={[styles.chip, baseCurrency === currency ? styles.chipActive : null]}
                onPress={() => setBaseCurrency(currency)}
              >
                {currency}
              </Text>
            ))}
          </View>
        </Card>

        <Card title="Conta">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              <Text
                style={[styles.chip, accountId === "all" ? styles.chipActive : null]}
                onPress={() => setAccountId("all")}
              >
                Todas
              </Text>
              {loadingAccounts ? <Text style={styles.muted}>Carregando contas...</Text> : null}
              {accounts.map((account) => (
                <Text
                  key={account.id}
                  style={[styles.chip, accountId === account.id ? styles.chipActive : null]}
                  onPress={() => setAccountId(account.id)}
                >
                  {account.name}
                </Text>
              ))}
            </View>
          </ScrollView>
        </Card>

        <View style={styles.grid}>
          <Card title="Saldo total">
            <Text style={styles.value}>
              {loadingSummary || !summary ? "-" : formatAmount(summary.balanceCents, summary.baseCurrency)}
            </Text>
          </Card>
          <Card title="Entradas">
            <Text style={styles.value}>
              {loadingSummary || !summary ? "-" : formatAmount(summary.incomeCents, summary.baseCurrency)}
            </Text>
          </Card>
          <Card title="Saidas">
            <Text style={styles.value}>
              {loadingSummary || !summary ? "-" : formatAmount(summary.expenseCents, summary.baseCurrency)}
            </Text>
          </Card>
          <Card title="Resultado">
            <Text style={styles.value}>
              {loadingSummary || !summary ? "-" : formatAmount(summary.netCents, summary.baseCurrency)}
            </Text>
          </Card>
        </View>

        <Card title="Evolucao no periodo">
          {loadingSummary ? (
            <Text style={styles.muted}>Carregando...</Text>
          ) : !summary || summary.series.length === 0 ? (
            <Text style={styles.muted}>Sem dados no periodo.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.seriesRow}>
                {series.map((point) => {
                  const percent = Math.max(8, Math.round((Math.abs(point.netCents) / maxAbsNet) * 100))
                  const isPositive = point.netCents >= 0
                  return (
                    <View key={point.label} style={styles.seriesCol}>
                      <View style={styles.seriesTrack}>
                        <View
                          style={[
                            styles.seriesBar,
                            {
                              height: `${percent}%` as any,
                              backgroundColor: isPositive ? theme.colors.primary : theme.colors.danger,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.seriesLabel}>{point.label}</Text>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          )}
        </Card>

        <Card title="Gastos por categoria">
          {loadingSummary ? (
            <Text style={styles.muted}>Carregando...</Text>
          ) : !summary || summary.byCategory.length === 0 ? (
            <Text style={styles.muted}>Sem despesas no periodo.</Text>
          ) : (
            summary.byCategory.map((item) => (
              <View key={item.categoryId ?? item.categoryName} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.categoryName}
                  </Text>
                  <Text style={styles.itemValue}>{formatAmount(item.expenseCents, summary?.baseCurrency ?? "BRL")}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getCategoryPercent(item.expenseCents, totalExpenseCents)}%` as any,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </Card>

        <Card title="Orcamentos criticos">
          {loadingCriticals ? (
            <Text style={styles.muted}>Carregando...</Text>
          ) : criticalBudgets.length === 0 ? (
            <Text style={styles.muted}>Sem orcamentos no mes atual.</Text>
          ) : (
            <View style={styles.criticalList}>
              {criticalBudgets.map((item) => {
                const usage = clampPercent(item.usedPercent)
                const isCritical = item.overLimit || item.alertReached
                return (
                  <View key={item.id} style={styles.criticalItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.category.name}
                      </Text>
                      <Text style={[styles.itemValue, isCritical ? styles.danger : null]}>
                        {item.usedPercent.toFixed(2)}%
                      </Text>
                    </View>
                    <Text style={styles.muted}>
                      {formatAmount(item.consumedCents)} de {formatAmount(item.limitCents)} (
                      {formatMonthYear(item.month, item.year)})
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${usage}%` as any,
                            backgroundColor: isCritical ? theme.colors.danger : theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={isCritical ? styles.danger : styles.muted}>{getBudgetStatusLabel(item)}</Text>
                  </View>
                )
              })}
            </View>
          )}
          <PrimaryButton title="Ver orcamentos" onPress={() => navigation.navigate("Budgets")} />
        </Card>

        <Card title="Metas criticas">
          {loadingCriticals ? (
            <Text style={styles.muted}>Carregando...</Text>
          ) : criticalGoals.length === 0 ? (
            <Text style={styles.muted}>Sem metas criticas no momento.</Text>
          ) : (
            <View style={styles.criticalList}>
              {criticalGoals.map((item) => {
                const progress = clampPercent(item.progressPercent)
                const overdue = item.daysRemaining < 0
                return (
                  <View key={item.id} style={styles.criticalItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemValue, overdue ? styles.danger : null]}>
                        {item.progressPercent.toFixed(2)}%
                      </Text>
                    </View>
                    <Text style={styles.muted}>
                      Restante: {formatAmount(item.remainingCents)} | Alvo: {formatDate(item.targetDate)}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress}%` as any,
                            backgroundColor: overdue ? theme.colors.danger : theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={overdue ? styles.danger : styles.muted}>{getGoalStatusLabel(item)}</Text>
                  </View>
                )
              })}
            </View>
          )}
          <PrimaryButton title="Ver metas" onPress={() => navigation.navigate("Goals")} />
        </Card>

        <Card title="Alertas">
          {loadingAlerts ? (
            <Text style={styles.muted}>Carregando...</Text>
          ) : alerts.length === 0 ? (
            <Text style={styles.muted}>Sem alertas ativos.</Text>
          ) : (
            <View style={styles.criticalList}>
              {alerts.map((item) => {
                const isDanger =
                  item.type === "BUDGET_OVER_LIMIT" ||
                  item.type === "GOAL_OVERDUE" ||
                  item.type === "BILL_OVERDUE"
                return (
                  <View key={item.id} style={styles.criticalItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.itemValue, isDanger ? styles.danger : null]}>
                        {getAlertTypeLabel(item.type)}
                      </Text>
                    </View>
                    <Text style={styles.muted}>{item.message}</Text>
                    <Text style={styles.muted}>Ultimo evento: {formatDate(item.lastTriggeredAt)}</Text>
                  </View>
                )
              })}
            </View>
          )}
          <View style={styles.row}>
            <PrimaryButton title="Atualizar alertas" onPress={() => void loadAlerts()} disabled={loadingAlerts} />
            <PrimaryButton
              title="Marcar lidos"
              onPress={() => void markAllAlertsRead()}
              disabled={markingAlertsRead || loadingAlerts || alerts.length === 0}
            />
          </View>
        </Card>

        <Card title="Acoes rapidas">
          <View style={styles.row}>
            <PrimaryButton title="Transacoes" onPress={() => navigation.navigate("Transactions")} />
            <PrimaryButton title="Contas" onPress={() => navigation.navigate("Accounts")} />
          </View>
          <View style={styles.row}>
            <PrimaryButton title="Categorias" onPress={() => navigation.navigate("Categories")} />
            <PrimaryButton title="Orcamentos" onPress={() => navigation.navigate("Budgets")} />
          </View>
          <View style={styles.row}>
            <PrimaryButton title="Metas" onPress={() => navigation.navigate("Goals")} />
            <PrimaryButton title="Relatorios" onPress={() => navigation.navigate("AdvancedReports")} />
          </View>
          <PrimaryButton title="Nova categoria" onPress={() => navigation.navigate("CategoryForm")} />
          <PrimaryButton title="Nova transacao" onPress={() => navigation.navigate("TransactionForm")} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hello: {
    color: theme.colors.muted,
  },
  name: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  grid: {
    gap: 10,
  },
  value: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  muted: {
    color: theme.colors.muted,
  },
  notice: {
    color: theme.colors.muted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  chip: {
    color: theme.colors.text,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  seriesRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingTop: 8,
    minHeight: 126,
  },
  seriesCol: {
    width: 36,
    alignItems: "center",
    gap: 6,
  },
  seriesTrack: {
    width: 14,
    height: 96,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  seriesBar: {
    width: 14,
    borderRadius: 999,
    minHeight: 8,
  },
  seriesLabel: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  categoryItem: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  itemName: {
    color: theme.colors.text,
    flex: 1,
  },
  itemValue: {
    color: theme.colors.muted,
  },
  danger: {
    color: theme.colors.danger,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    minWidth: 4,
  },
  criticalList: {
    gap: 10,
  },
  criticalItem: {
    gap: 6,
  },
})
