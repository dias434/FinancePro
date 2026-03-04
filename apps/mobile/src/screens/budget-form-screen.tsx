import * as React from "react"
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAuth } from "../auth/auth-context"
import { formatOfflineTimestamp, readOfflineCache, writeOfflineCache } from "../lib/offline-cache"
import { BUDGET_EXPENSE_CATEGORIES_CACHE_KEY } from "../lib/offline-keys"
import {
  applyPendingEntityOperations,
  createLocalId,
  flushPendingOperations,
  isLocalId,
  isOfflineLikeError,
  queueOfflineOperation,
  readPendingOperations,
} from "../lib/offline-outbox"
import type { RootStackParamList } from "../navigation/app-navigator"
import { Card, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

type Category = {
  id: string
  name: string
  type: "INCOME" | "EXPENSE"
  icon?: string
  color?: string
}

type CategoriesResponse = {
  items: Category[]
}

function parseAmountToCents(value: string) {
  const raw = value.trim().replace(",", ".")
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function buildBudgetSnapshot(input: {
  id: string
  category: Category
  year: number
  month: number
  limitCents: number
  alertPercent: number
  consumedCents: number
}) {
  const usedPercent =
    input.limitCents > 0
      ? Math.round((input.consumedCents / input.limitCents) * 10000) / 100
      : 0
  const overLimit = input.consumedCents > input.limitCents

  return {
    id: input.id,
    year: input.year,
    month: input.month,
    limitCents: input.limitCents,
    consumedCents: input.consumedCents,
    remainingCents: Math.max(0, input.limitCents - input.consumedCents),
    usedPercent,
    alertPercent: input.alertPercent,
    alertReached: usedPercent >= input.alertPercent,
    overLimit,
    category: input.category,
  }
}

type Props = NativeStackScreenProps<RootStackParamList, "BudgetForm">

export function BudgetFormScreen({ navigation, route }: Props) {
  const { apiFetch } = useAuth()
  const budget = route.params?.budget

  const now = React.useMemo(() => new Date(), [])

  const [categories, setCategories] = React.useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = React.useState(true)
  const [lookupNotice, setLookupNotice] = React.useState<string | null>(null)

  const [categoryId, setCategoryId] = React.useState(budget?.categoryId ?? budget?.category?.id ?? "")
  const [year, setYear] = React.useState(String(budget?.year ?? now.getUTCFullYear()))
  const [month, setMonth] = React.useState(String(budget?.month ?? (now.getUTCMonth() + 1)))
  const [limitAmount, setLimitAmount] = React.useState(
    budget ? String((budget.limitCents / 100).toFixed(2)) : "",
  )
  const [alertPercent, setAlertPercent] = React.useState(String(budget?.alertPercent ?? 80))
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    setLoadingCategories(true)
    void (async () => {
      const [cached, pendingBefore] = await Promise.all([
        readOfflineCache<CategoriesResponse>(BUDGET_EXPENSE_CATEGORIES_CACHE_KEY),
        readPendingOperations(),
      ])
      const fallbackCategories = applyPendingEntityOperations(
        cached?.value.items ?? [],
        pendingBefore,
        "category",
        {
          shouldIncludeSnapshot: (item) => item.type === "EXPENSE",
          sort: (a, b) => a.name.localeCompare(b.name),
        },
      )

      if (cached || fallbackCategories.length > 0) {
        if (!alive) return
        setCategories(fallbackCategories)
        setLookupNotice(
          cached
            ? `Categorias offline: cache de ${formatOfflineTimestamp(cached.updatedAt)}.`
            : "Categorias offline: exibindo alteracoes locais pendentes.",
        )
        setLoadingCategories(false)
      }

      try {
        await flushPendingOperations(apiFetch)
        const pendingAfter = await readPendingOperations()
        const data = await apiFetch<CategoriesResponse>(
          "/categories?page=1&pageSize=200&sortBy=name&sortDir=asc&type=EXPENSE",
          {
            cache: "no-store",
          } as any,
        )
        const nextCategories = (data.items ?? []).filter((item) => item.type === "EXPENSE")
        if (!alive) return
        setCategories(
          applyPendingEntityOperations(nextCategories, pendingAfter, "category", {
            shouldIncludeSnapshot: (item) => item.type === "EXPENSE",
            sort: (a, b) => a.name.localeCompare(b.name),
          }),
        )
        setLookupNotice(null)
        await writeOfflineCache(BUDGET_EXPENSE_CATEGORIES_CACHE_KEY, {
          items: nextCategories,
        })
      } catch {
        if (!alive) return
        if (!cached && fallbackCategories.length === 0) {
          setCategories([])
          setLookupNotice(null)
        }
      } finally {
        if (!alive) return
        setLoadingCategories(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [apiFetch])

  const save = async () => {
    const yearNum = Number(year)
    const monthNum = Number(month)
    const limitCents = parseAmountToCents(limitAmount)
    const alertPercentNum = Number(alertPercent)

    if (!categoryId) {
      Alert.alert("Atencao", "Selecione uma categoria")
      return
    }
    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
      Alert.alert("Atencao", "Ano invalido")
      return
    }
    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      Alert.alert("Atencao", "Mes invalido")
      return
    }
    if (!limitCents) {
      Alert.alert("Atencao", "Informe um limite valido")
      return
    }
    if (!Number.isInteger(alertPercentNum) || alertPercentNum < 1 || alertPercentNum > 100) {
      Alert.alert("Atencao", "Alerta deve estar entre 1 e 100")
      return
    }

    const payload = {
      categoryId,
      year: yearNum,
      month: monthNum,
      limitCents,
      alertPercent: alertPercentNum,
    }
    const selectedCategory =
      categories.find((item) => item.id === categoryId) ??
      budget?.category ?? {
        id: categoryId,
        name: "Categoria",
        type: "EXPENSE" as const,
      }
    const snapshot = buildBudgetSnapshot({
      id: budget?.id ?? createLocalId("budget"),
      category: selectedCategory,
      year: yearNum,
      month: monthNum,
      limitCents,
      alertPercent: alertPercentNum,
      consumedCents: budget?.consumedCents ?? 0,
    })

    setSaving(true)
    try {
      if (budget?.id && isLocalId(budget.id)) {
        await queueOfflineOperation({
          entity: "budget",
          op: "update",
          clientId: budget.id,
          path: `/budgets/${budget.id}`,
          body: payload,
          snapshot,
        })
        Alert.alert("Fila local", "Orcamento salvo localmente e aguardando sincronizacao.")
      } else if (budget?.id) {
        await apiFetch(`/budgets/${budget.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      } else {
        await apiFetch("/budgets", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      }
      navigation.goBack()
    } catch (error) {
      if (isOfflineLikeError(error)) {
        const clientId = budget?.id ?? createLocalId("budget")
        await queueOfflineOperation({
          entity: "budget",
          op: budget?.id ? "update" : "create",
          clientId,
          path: budget?.id ? `/budgets/${budget.id}` : "/budgets",
          body: payload,
          snapshot: buildBudgetSnapshot({
            id: clientId,
            category: selectedCategory,
            year: yearNum,
            month: monthNum,
            limitCents,
            alertPercent: alertPercentNum,
            consumedCents: budget?.consumedCents ?? 0,
          }),
        })
        Alert.alert("Fila local", "Orcamento salvo localmente e aguardando sincronizacao.")
        navigation.goBack()
        return
      }

      Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao salvar orcamento")
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!budget?.id) return
    Alert.alert("Remover orcamento?", "Essa acao nao pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (isLocalId(budget.id)) {
                await queueOfflineOperation({
                  entity: "budget",
                  op: "delete",
                  clientId: budget.id,
                  path: `/budgets/${budget.id}`,
                })
                Alert.alert("Fila local", "Orcamento removido localmente e aguardando sincronizacao.")
                navigation.goBack()
                return
              }

              await apiFetch(`/budgets/${budget.id}`, { method: "DELETE" })
              navigation.goBack()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "budget",
                  op: "delete",
                  clientId: budget.id,
                  path: `/budgets/${budget.id}`,
                })
                Alert.alert("Fila local", "Orcamento removido localmente e aguardando sincronizacao.")
                navigation.goBack()
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
        <Card title={budget?.id ? "Editar orcamento" : "Novo orcamento"}>
          <Text style={styles.label}>Categoria de despesa</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {loadingCategories ? <Text style={styles.muted}>Carregando...</Text> : null}
              {categories.map((item) => (
                <Text
                  key={item.id}
                  style={[styles.chip, categoryId === item.id ? styles.chipActive : null]}
                  onPress={() => setCategoryId(item.id)}
                >
                  {item.name}
                </Text>
              ))}
            </View>
          </ScrollView>
          {lookupNotice ? <Text style={[styles.muted, { marginTop: 8 }]}>{lookupNotice}</Text> : null}

          <View style={[styles.row, { marginTop: 10 }]}>
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

          <Text style={[styles.label, { marginTop: 10 }]}>Limite (R$)</Text>
          <TextInput
            value={limitAmount}
            onChangeText={setLimitAmount}
            placeholder="0,00"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Alerta (%)</Text>
          <TextInput
            value={alertPercent}
            onChangeText={setAlertPercent}
            placeholder="80"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            keyboardType="number-pad"
          />
        </Card>

        <PrimaryButton title={saving ? "Salvando..." : "Salvar"} onPress={() => void save()} disabled={saving} />
        {budget?.id ? <PrimaryButton title="Remover" onPress={() => void remove()} disabled={saving} /> : null}
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
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
  muted: {
    color: theme.colors.muted,
  },
})
