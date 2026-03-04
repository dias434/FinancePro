import * as React from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useIsFocused } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAuth } from "../auth/auth-context"
import { formatOfflineTimestamp, readOfflineCache, writeOfflineCache } from "../lib/offline-cache"
import { getBudgetsCacheKey } from "../lib/offline-keys"
import {
  applyPendingEntityOperations,
  countPendingOperations,
  flushPendingOperations,
  isLocalId,
  isOfflineLikeError,
  queueOfflineOperation,
  readPendingOperations,
} from "../lib/offline-outbox"
import type { RootStackParamList } from "../navigation/app-navigator"
import { Card, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

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

function formatCentsBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function matchesBudgetFilter(item: BudgetItem, year: number, month: number) {
  if (Number.isInteger(year) && year >= 2000 && year <= 2100 && item.year !== year) return false
  if (Number.isInteger(month) && month >= 1 && month <= 12 && item.month !== month) return false
  return true
}

function sortBudgets(a: BudgetItem, b: BudgetItem) {
  if (a.year !== b.year) return b.year - a.year
  if (a.month !== b.month) return b.month - a.month
  return a.category.name.localeCompare(b.category.name)
}

type Props = NativeStackScreenProps<RootStackParamList, "Budgets">

export function BudgetsScreen({ navigation }: Props) {
  const { apiFetch } = useAuth()
  const isFocused = useIsFocused()

  const now = React.useMemo(() => new Date(), [])

  const [year, setYear] = React.useState(String(now.getUTCFullYear()))
  const [month, setMonth] = React.useState(String(now.getUTCMonth() + 1))
  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<BudgetItem[]>([])
  const [offlineNotice, setOfflineNotice] = React.useState<string | null>(null)
  const [syncNotice, setSyncNotice] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    const yearNum = Number(year)
    const monthNum = Number(month)
    const validYear = Number.isInteger(yearNum) && yearNum >= 2000 && yearNum <= 2100 ? yearNum : "all"
    const validMonth = Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12 ? monthNum : "all"
    const cacheKey = getBudgetsCacheKey(validYear, validMonth)

    setLoading(true)
    const [cached, pendingBefore] = await Promise.all([
      readOfflineCache<BudgetListResponse>(cacheKey),
      readPendingOperations(),
    ])
    const pendingCountBefore = countPendingOperations(pendingBefore)
    const fallbackItems = applyPendingEntityOperations(
      cached?.value.items ?? [],
      pendingBefore,
      "budget",
      {
        shouldIncludeSnapshot: (snapshot) => matchesBudgetFilter(snapshot, yearNum, monthNum),
        sort: sortBudgets,
      },
    )
    const hasFallback = Boolean(cached) || fallbackItems.length > 0

    if (hasFallback) {
      setItems(fallbackItems)
      setSyncNotice(
        pendingCountBefore > 0
          ? `${pendingCountBefore} operacao(oes) pendente(s) de sincronizacao.`
          : null,
      )
      setLoading(false)
    }

    try {
      const params = new URLSearchParams()
      params.set("page", "1")
      params.set("pageSize", "200")
      params.set("sortBy", "month")
      params.set("sortDir", "desc")
      if (Number.isInteger(yearNum) && yearNum >= 2000 && yearNum <= 2100) {
        params.set("year", String(yearNum))
      }
      if (Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12) {
        params.set("month", String(monthNum))
      }

      await flushPendingOperations(apiFetch)
      const pendingAfter = await readPendingOperations()
      const data = await apiFetch<BudgetListResponse>(`/budgets?${params.toString()}`, {
        cache: "no-store",
      } as any)
      const nextItems = applyPendingEntityOperations(
        data.items ?? [],
        pendingAfter,
        "budget",
        {
          shouldIncludeSnapshot: (snapshot) => matchesBudgetFilter(snapshot, yearNum, monthNum),
          sort: sortBudgets,
        },
      )
      setItems(nextItems)
      setOfflineNotice(null)
      setSyncNotice(
        countPendingOperations(pendingAfter) > 0
          ? `${countPendingOperations(pendingAfter)} operacao(oes) pendente(s) de sincronizacao.`
          : null,
      )
      await writeOfflineCache(cacheKey, data)
    } catch (error) {
      if (hasFallback) {
        setItems(fallbackItems)
        setOfflineNotice(
          cached
            ? `Modo offline: orcamentos salvos em ${formatOfflineTimestamp(cached.updatedAt)}.`
            : "Modo offline: exibindo alteracoes locais pendentes.",
        )
      } else {
        setItems([])
        setOfflineNotice(null)
        setSyncNotice(null)
        Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao carregar orcamentos")
      }
    } finally {
      setLoading(false)
    }
  }, [apiFetch, month, year])

  React.useEffect(() => {
    if (!isFocused) return
    void load()
  }, [isFocused, load])

  const removeBudget = async (item: BudgetItem) => {
    Alert.alert("Remover orcamento?", `Remover limite de ${item.category.name} (${item.month}/${item.year})?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (isLocalId(item.id)) {
                await queueOfflineOperation({
                  entity: "budget",
                  op: "delete",
                  clientId: item.id,
                  path: `/budgets/${item.id}`,
                })
                await load()
                Alert.alert("Fila local", "Orcamento removido localmente e aguardando sincronizacao.")
                return
              }

              await apiFetch(`/budgets/${item.id}`, { method: "DELETE" })
              await load()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "budget",
                  op: "delete",
                  clientId: item.id,
                  path: `/budgets/${item.id}`,
                })
                await load()
                Alert.alert("Fila local", "Orcamento removido localmente e aguardando sincronizacao.")
                return
              }

              Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao remover orcamento")
            }
          })()
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card title="Filtro mes/ano">
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Ano</Text>
              <TextInput
                value={year}
                onChangeText={setYear}
                placeholder="2026"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Mes</Text>
              <TextInput
                value={month}
                onChangeText={setMonth}
                placeholder="1-12"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <PrimaryButton title="Aplicar" onPress={() => void load()} disabled={loading} />
        </Card>

        <View style={styles.row}>
          <PrimaryButton title="Novo orcamento" onPress={() => navigation.navigate("BudgetForm")} />
          <PrimaryButton title="Atualizar" onPress={() => void load()} disabled={loading} />
        </View>

        {offlineNotice ? <Text style={styles.muted}>{offlineNotice}</Text> : null}
        {syncNotice ? <Text style={styles.muted}>{syncNotice}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : items.length === 0 ? (
          <Card title="Sem orcamentos">
            <Text style={styles.muted}>Nenhum limite encontrado para o periodo selecionado.</Text>
            <PrimaryButton title="Criar agora" onPress={() => navigation.navigate("BudgetForm")} />
          </Card>
        ) : (
          items.map((item) => {
            const progress = clampPercent(item.usedPercent)
            const barColor = item.overLimit || item.alertReached ? theme.colors.danger : theme.colors.primary
            return (
              <Card key={item.id} title={`${item.category.name} - ${String(item.month).padStart(2, "0")}/${item.year}`}>
                <Pressable
                  onPress={() =>
                    navigation.navigate("BudgetForm", {
                      budget: item,
                    })
                  }
                >
                  <View style={{ gap: 8 }}>
                    <Text style={styles.value}>Limite: {formatCentsBRL(item.limitCents)}</Text>
                    <Text style={styles.muted}>Consumido: {formatCentsBRL(item.consumedCents)}</Text>
                    <Text style={styles.muted}>Restante: {formatCentsBRL(item.remainingCents)}</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: barColor }]} />
                    </View>
                    <Text style={styles.muted}>Uso: {item.usedPercent.toFixed(2)}% | Alerta: {item.alertPercent}%</Text>
                    {item.overLimit ? <Text style={styles.alert}>Acima do limite</Text> : null}
                    {!item.overLimit && item.alertReached ? <Text style={styles.alert}>Alerta de consumo atingido</Text> : null}
                    <Text style={styles.link}>Editar</Text>
                  </View>
                </Pressable>
                <PrimaryButton title="Remover" onPress={() => removeBudget(item)} />
              </Card>
            )
          })
        )}
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
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
  },
  value: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  muted: {
    color: theme.colors.muted,
  },
  alert: {
    color: theme.colors.danger,
    fontWeight: "700",
  },
  link: {
    color: theme.colors.primary,
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
    minWidth: 4,
  },
})
