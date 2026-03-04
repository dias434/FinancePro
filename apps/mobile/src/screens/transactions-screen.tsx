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

import type { RootStackParamList } from "../navigation/app-navigator"
import { useAuth } from "../auth/auth-context"
import { formatMoney } from "../lib/money"
import { formatOfflineTimestamp, readOfflineCache, writeOfflineCache } from "../lib/offline-cache"
import {
  TRANSACTION_BASE_CACHE_KEY,
  TRANSACTION_LOOKUPS_CACHE_KEY,
} from "../lib/offline-keys"
import {
  applyPendingEntityOperations,
  countPendingOperations,
  flushPendingOperations,
  isLocalId,
  isOfflineLikeError,
  queueOfflineOperation,
  readPendingOperations,
} from "../lib/offline-outbox"
import { Card, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER"

type Transaction = {
  id: string
  type: TransactionType
  occurredAt: string
  amountCents: number
  accountId: string
  categoryId: string | null
  transferAccountId: string | null
  description?: string
  tags?: string[]
  costCenter?: string | null
  notes?: string | null
  account?: { id: string; name: string; currency?: string }
  transferAccount?: { id: string; name: string; currency?: string }
  category?: { id: string; name: string }
}

type TransactionListResponse = {
  items: Transaction[]
}

type Account = { id: string; name: string; currency?: string }
type Category = { id: string; name: string }

type AccountsResponse = { items: Array<Account> }
type CategoriesResponse = { items: Array<Category> }
type TransactionFilters = {
  q: string
  type: TransactionType | "all"
  accountId: string
  categoryId: string
  from: string
  to: string
}
type TransactionLookupsCache = {
  accounts: Account[]
  categories: Category[]
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR").format(d)
}

function txTypeLabel(type: TransactionType) {
  switch (type) {
    case "INCOME":
      return "Entrada"
    case "EXPENSE":
      return "Saída"
    case "TRANSFER":
      return "Transferência"
  }
}

function filterTransactionsOffline(items: Transaction[], filters: TransactionFilters) {
  const query = filters.q.trim().toLowerCase()

  return [...items]
    .filter((item) => {
      if (filters.type !== "all" && item.type !== filters.type) return false
      if (filters.accountId !== "all" && item.accountId !== filters.accountId) return false
      if (filters.categoryId !== "all" && item.categoryId !== filters.categoryId) return false

      const occurredAtDay =
        typeof item.occurredAt === "string" && item.occurredAt.length >= 10
          ? item.occurredAt.slice(0, 10)
          : ""

      if (filters.from && occurredAtDay && occurredAtDay < filters.from) return false
      if (filters.to && occurredAtDay && occurredAtDay > filters.to) return false
      if (!query) return true

      const searchable = [
        item.description,
        item.account?.name,
        item.transferAccount?.name,
        item.category?.name,
        item.tags?.join(" "),
        item.costCenter,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchable.includes(query)
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

type Props = NativeStackScreenProps<RootStackParamList, "Transactions">

export function TransactionsScreen({ navigation }: Props) {
  const { apiFetch } = useAuth()
  const isFocused = useIsFocused()

  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<Transaction[]>([])

  const [q, setQ] = React.useState("")
  const [type, setType] = React.useState<TransactionType | "all">("all")
  const [accountId, setAccountId] = React.useState<string>("all")
  const [categoryId, setCategoryId] = React.useState<string>("all")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")

  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
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

  const loadLookups = React.useCallback(async () => {
    const [cached, pendingBefore] = await Promise.all([
      readOfflineCache<TransactionLookupsCache>(TRANSACTION_LOOKUPS_CACHE_KEY),
      readPendingOperations(),
    ])
    const pendingCountBefore = countPendingOperations(pendingBefore)
    const fallbackAccounts = applyPendingEntityOperations(
      cached?.value.accounts ?? [],
      pendingBefore,
      "account",
      {
        sort: (a, b) => a.name.localeCompare(b.name),
      },
    )
    const fallbackCategories = applyPendingEntityOperations(
      cached?.value.categories ?? [],
      pendingBefore,
      "category",
      {
        sort: (a, b) => a.name.localeCompare(b.name),
      },
    )
    const hasFallback = Boolean(cached) || fallbackAccounts.length > 0 || fallbackCategories.length > 0

    if (hasFallback) {
      setAccounts(fallbackAccounts)
      setCategories(fallbackCategories)
      updateOfflineState(
        "sync",
        pendingCountBefore > 0
          ? `${pendingCountBefore} operacao(oes) pendente(s) de sincronizacao`
          : null,
      )
    }

    try {
      await flushPendingOperations(apiFetch)
      const pendingAfter = await readPendingOperations()
      const [a, c] = await Promise.all([
        apiFetch<AccountsResponse>("/accounts?page=1&pageSize=200&sortBy=name&sortDir=asc", { cache: "no-store" } as any),
        apiFetch<CategoriesResponse>("/categories?page=1&pageSize=200&sortBy=name&sortDir=asc", { cache: "no-store" } as any),
      ])

      const nextLookups = {
        accounts: a.items ?? [],
        categories: c.items ?? [],
      }

      setAccounts(
        applyPendingEntityOperations(nextLookups.accounts, pendingAfter, "account", {
          sort: (a, b) => a.name.localeCompare(b.name),
        }),
      )
      setCategories(
        applyPendingEntityOperations(nextLookups.categories, pendingAfter, "category", {
          sort: (a, b) => a.name.localeCompare(b.name),
        }),
      )
      updateOfflineState("lookups", null)
      updateOfflineState(
        "sync",
        countPendingOperations(pendingAfter) > 0
          ? `${countPendingOperations(pendingAfter)} operacao(oes) pendente(s) de sincronizacao`
          : null,
      )
      await writeOfflineCache(TRANSACTION_LOOKUPS_CACHE_KEY, nextLookups)
    } catch {
      if (hasFallback) {
        setAccounts(fallbackAccounts)
        setCategories(fallbackCategories)
        updateOfflineState(
          "lookups",
          cached
            ? `filtros salvos em ${formatOfflineTimestamp(cached.updatedAt)}`
            : "filtros com alteracoes locais pendentes",
        )
      } else {
        setAccounts([])
        setCategories([])
        updateOfflineState("lookups", null)
        updateOfflineState("sync", null)
      }
    }
  }, [apiFetch, updateOfflineState])

  const load = React.useCallback(async () => {
    setLoading(true)
    const filters: TransactionFilters = { q, type, accountId, categoryId, from, to }
    const params = new URLSearchParams()
    params.set("limit", "200")
    params.set("sortBy", "occurredAt")
    params.set("sortDir", "desc")
    if (q.trim()) params.set("q", q.trim())
    if (type !== "all") params.set("type", type)
    if (accountId !== "all") params.set("accountId", accountId)
    if (categoryId !== "all") params.set("categoryId", categoryId)
    if (from) params.set("from", from)
    if (to) params.set("to", to)

    const queryString = params.toString()
    const specificCacheKey = `transactions:list:${queryString || "default"}`
    const [specificCached, baseCached, pendingBefore] = await Promise.all([
      readOfflineCache<TransactionListResponse>(specificCacheKey),
      readOfflineCache<TransactionListResponse>(TRANSACTION_BASE_CACHE_KEY),
      readPendingOperations(),
    ])
    const pendingCountBefore = countPendingOperations(pendingBefore)
    const fallbackSource = specificCached?.value.items ?? baseCached?.value.items ?? []
    const fallbackItems = filterTransactionsOffline(
      applyPendingEntityOperations(fallbackSource, pendingBefore, "transaction"),
      filters,
    )
    const hasFallback = Boolean(specificCached || baseCached) || fallbackItems.length > 0
    const fallbackUpdatedAt = specificCached?.updatedAt ?? baseCached?.updatedAt ?? null

    updateOfflineState(
      "sync",
      pendingCountBefore > 0
        ? `${pendingCountBefore} operacao(oes) pendente(s) de sincronizacao`
        : null,
    )

    if (hasFallback) {
      setItems(fallbackItems)
      setLoading(false)
    }
    try {
      await flushPendingOperations(apiFetch)
      const pendingAfter = await readPendingOperations()
      const data = await apiFetch<TransactionListResponse>(`/transactions?${params.toString()}`, { cache: "no-store" } as any)
      const nextData = {
        items: data.items ?? [],
      }

      setItems(
        filterTransactionsOffline(
          applyPendingEntityOperations(nextData.items, pendingAfter, "transaction"),
          filters,
        ),
      )
      updateOfflineState("transactions", null)
      updateOfflineState(
        "sync",
        countPendingOperations(pendingAfter) > 0
          ? `${countPendingOperations(pendingAfter)} operacao(oes) pendente(s) de sincronizacao`
          : null,
      )
      await writeOfflineCache(specificCacheKey, nextData)

      if (!q.trim() && type === "all" && accountId === "all" && categoryId === "all" && !from && !to) {
        await writeOfflineCache(TRANSACTION_BASE_CACHE_KEY, nextData)
      }
    } catch (error) {
      if (hasFallback) {
        setItems(fallbackItems)
        updateOfflineState(
          "transactions",
          fallbackUpdatedAt
            ? specificCached
              ? `transacoes salvas em ${formatOfflineTimestamp(fallbackUpdatedAt)}`
              : `transacoes filtradas localmente com base em ${formatOfflineTimestamp(fallbackUpdatedAt)}`
            : "transacoes com alteracoes locais pendentes",
        )
      } else {
        setItems([])
        updateOfflineState("transactions", null)
        updateOfflineState("sync", null)
      Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao carregar transações")
      }
    } finally {
      setLoading(false)
    }
  }, [accountId, apiFetch, categoryId, from, q, to, type, updateOfflineState])

  React.useEffect(() => {
    if (!isFocused) return
    void loadLookups()
    void load()
  }, [isFocused, load, loadLookups])

  const removeTransaction = async (t: Transaction) => {
    Alert.alert("Remover transação?", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (isLocalId(t.id)) {
                await queueOfflineOperation({
                  entity: "transaction",
                  op: "delete",
                  clientId: t.id,
                  path: `/transactions/${t.id}`,
                })
                await load()
                Alert.alert("Fila local", "Transacao removida localmente e aguardando sincronizacao.")
                return
              }

              await apiFetch(`/transactions/${t.id}`, { method: "DELETE" })
              await load()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "transaction",
                  op: "delete",
                  clientId: t.id,
                  path: `/transactions/${t.id}`,
                })
                await load()
                Alert.alert("Fila local", "Transacao removida localmente e aguardando sincronizacao.")
                return
              }
              Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao remover transação")
            }
          })()
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <PrimaryButton title="Nova" onPress={() => navigation.navigate("TransactionForm")} />
          <PrimaryButton title="Atualizar" onPress={() => void load()} disabled={loading} />
        </View>
        <PrimaryButton title="Importar / Exportar" onPress={() => navigation.navigate("ImportExport")} />

        {offlineNotice ? <Text style={styles.notice}>{offlineNotice}</Text> : null}

        <Card title="Filtros">
          <Text style={styles.label}>Busca</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Descrição…"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Tipo</Text>
          <View style={styles.chips}>
            {(["all", "EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
              <Text
                key={t}
                style={[styles.chip, type === t ? styles.chipActive : null]}
                onPress={() => setType(t as any)}
              >
                {t === "all" ? "Todos" : txTypeLabel(t)}
              </Text>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>Conta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              <Text
                style={[styles.chip, accountId === "all" ? styles.chipActive : null]}
                onPress={() => setAccountId("all")}
              >
                Todas
              </Text>
              {accounts.map((a) => (
                <Text
                  key={a.id}
                  style={[styles.chip, accountId === a.id ? styles.chipActive : null]}
                  onPress={() => setAccountId(a.id)}
                >
                  {a.name}
                </Text>
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.label, { marginTop: 10 }]}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              <Text
                style={[styles.chip, categoryId === "all" ? styles.chipActive : null]}
                onPress={() => setCategoryId("all")}
              >
                Todas
              </Text>
              {categories.map((c) => (
                <Text
                  key={c.id}
                  style={[styles.chip, categoryId === c.id ? styles.chipActive : null]}
                  onPress={() => setCategoryId(c.id)}
                >
                  {c.name}
                </Text>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.row, { marginTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>De (YYYY-MM-DD)</Text>
              <TextInput value={from} onChangeText={setFrom} placeholder="2026-01-01" placeholderTextColor={theme.colors.muted} style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Até (YYYY-MM-DD)</Text>
              <TextInput value={to} onChangeText={setTo} placeholder="2026-01-31" placeholderTextColor={theme.colors.muted} style={styles.input} />
            </View>
          </View>

          <PrimaryButton title="Aplicar" onPress={() => void load()} disabled={loading} />
        </Card>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.muted}>Nenhuma transação encontrada.</Text>
        ) : (
          items.map((t) => (
            <Card key={t.id} title={t.description?.trim() || "—"}>
              <Pressable onPress={() => navigation.navigate("TransactionForm", { transaction: t })}>
                <View style={{ gap: 6 }}>
                  <Text style={styles.muted}>
                    {formatDate(t.occurredAt)} · {txTypeLabel(t.type)}
                  </Text>
                  <Text style={styles.value}>
                    {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : ""}
                    {formatMoney(t.amountCents, t.account?.currency ?? "BRL")}
                  </Text>
                  <Text style={styles.muted}>
                    {t.type === "TRANSFER"
                      ? `${t.account?.name ?? "Origem"} → ${t.transferAccount?.name ?? "Destino"}`
                      : t.account?.name ?? t.accountId}
                  </Text>
                  {t.type !== "TRANSFER" ? (
                    <Text style={styles.muted}>Categoria: {t.category?.name ?? "—"}</Text>
                  ) : null}
                  {t.tags?.length ? <Text style={styles.muted}>Tags: {t.tags.join(", ")}</Text> : null}
                  {t.costCenter ? <Text style={styles.muted}>Centro de custo: {t.costCenter}</Text> : null}
                  {t.notes ? <Text style={styles.muted}>Obs.: {t.notes}</Text> : null}
                  <Text style={styles.link}>Editar</Text>
                </View>
              </Pressable>
              <PrimaryButton title="Remover" onPress={() => removeTransaction(t)} />
            </Card>
          ))
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
  value: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  muted: {
    color: theme.colors.muted,
  },
  notice: {
    color: theme.colors.muted,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: "700",
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
})
