import * as React from "react"
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { RootStackParamList } from "../navigation/app-navigator"
import { useAuth } from "../auth/auth-context"
import { formatOfflineTimestamp, readOfflineCache, writeOfflineCache } from "../lib/offline-cache"
import { TRANSACTION_LOOKUPS_CACHE_KEY } from "../lib/offline-keys"
import { currencyLabel } from "../lib/money"
import {
  applyPendingEntityOperations,
  createLocalId,
  flushPendingOperations,
  isLocalId,
  isOfflineLikeError,
  queueOfflineOperation,
  readPendingOperations,
} from "../lib/offline-outbox"
import { Card, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER"

type Account = { id: string; name: string; currency: string }
type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" }

type AccountsResponse = { items: Array<Account> }
type CategoriesResponse = { items: Array<Category> }
type TransactionLookupsCache = {
  accounts: Account[]
  categories: Category[]
}

function toDateInput(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function parseAmountToCents(value: string) {
  const raw = value.trim().replace(",", ".")
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function tagsToInput(value: string[] | undefined) {
  return Array.isArray(value) ? value.join(", ") : ""
}

function parseTagsInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
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

function buildTransactionSnapshot(input: {
  id: string
  type: TransactionType
  occurredAt: string
  amountCents: number
  accountId: string
  transferAccountId: string | null
  categoryId: string | null
  description: string | null
  tags: string[]
  costCenter: string | null
  notes: string | null
  accounts: Account[]
  categories: Category[]
}) {
  const account = input.accounts.find((item) => item.id === input.accountId)
  const transferAccount = input.accounts.find((item) => item.id === input.transferAccountId)
  const category = input.categories.find((item) => item.id === input.categoryId)

  return {
    id: input.id,
    type: input.type,
    occurredAt: input.occurredAt,
    amountCents: input.amountCents,
    accountId: input.accountId,
    categoryId: input.categoryId,
    transferAccountId: input.transferAccountId,
    description: input.description ?? undefined,
    tags: input.tags,
    costCenter: input.costCenter,
    notes: input.notes,
    account: account ? { id: account.id, name: account.name, currency: account.currency } : undefined,
    transferAccount: transferAccount
      ? { id: transferAccount.id, name: transferAccount.name, currency: transferAccount.currency }
      : undefined,
    category: category ? { id: category.id, name: category.name } : undefined,
  }
}

type Props = NativeStackScreenProps<RootStackParamList, "TransactionForm">

export function TransactionFormScreen({ navigation, route }: Props) {
  const { apiFetch } = useAuth()
  const tx = route.params?.transaction

  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loadingLookups, setLoadingLookups] = React.useState(true)
  const [lookupNotice, setLookupNotice] = React.useState<string | null>(null)

  const [type, setType] = React.useState<TransactionType>(tx?.type ?? "EXPENSE")
  const [occurredAt, setOccurredAt] = React.useState(tx ? toDateInput(tx.occurredAt) : toDateInput(new Date().toISOString()))
  const [amount, setAmount] = React.useState(tx ? String((tx.amountCents / 100).toFixed(2)) : "")
  const [accountId, setAccountId] = React.useState(tx?.accountId ?? "")
  const [transferAccountId, setTransferAccountId] = React.useState(tx?.transferAccountId ?? "")
  const [categoryId, setCategoryId] = React.useState(tx?.categoryId ?? "")
  const [description, setDescription] = React.useState(tx?.description ?? "")
  const [tagsInput, setTagsInput] = React.useState(tagsToInput(tx?.tags))
  const [costCenter, setCostCenter] = React.useState(tx?.costCenter ?? "")
  const [notes, setNotes] = React.useState(tx?.notes ?? "")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    setLoadingLookups(true)
    void (async () => {
      const [cached, pendingBefore] = await Promise.all([
        readOfflineCache<TransactionLookupsCache>(TRANSACTION_LOOKUPS_CACHE_KEY),
        readPendingOperations(),
      ])
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

      if (cached || fallbackAccounts.length > 0 || fallbackCategories.length > 0) {
        if (!alive) return
        setAccounts(fallbackAccounts)
        setCategories(fallbackCategories)
        setLookupNotice(
          cached
            ? `Lookups offline: cache de ${formatOfflineTimestamp(cached.updatedAt)}.`
            : "Lookups offline: exibindo alteracoes locais pendentes.",
        )
        setLoadingLookups(false)
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

        if (!alive) return
        setAccounts(
          applyPendingEntityOperations(nextLookups.accounts, pendingAfter, "account", {
            sort: (first, second) => first.name.localeCompare(second.name),
          }),
        )
        setCategories(
          applyPendingEntityOperations(nextLookups.categories, pendingAfter, "category", {
            sort: (first, second) => first.name.localeCompare(second.name),
          }),
        )
        setLookupNotice(null)
        await writeOfflineCache(TRANSACTION_LOOKUPS_CACHE_KEY, nextLookups)
      } catch {
        if (!alive) return
        if (!cached && fallbackAccounts.length === 0 && fallbackCategories.length === 0) {
          setAccounts([])
          setCategories([])
          setLookupNotice(null)
        }
      } finally {
        if (!alive) return
        setLoadingLookups(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [apiFetch])

  const save = async () => {
    const cents = parseAmountToCents(amount)
    if (!cents) {
      Alert.alert("Atenção", "Informe um valor válido")
      return
    }
    if (!occurredAt.trim()) {
      Alert.alert("Atenção", "Informe a data (YYYY-MM-DD)")
      return
    }
    if (!accountId) {
      Alert.alert("Atenção", "Selecione a conta")
      return
    }

    const occurredAtIso = new Date(occurredAt).toISOString()
    const sourceAccount = accounts.find((item) => item.id === accountId)
    const targetAccount = accounts.find((item) => item.id === transferAccountId)

    if (type === "TRANSFER") {
      if (!transferAccountId) {
        Alert.alert("Atenção", "Selecione a conta de destino")
        return
      }
      if (transferAccountId === accountId) {
        Alert.alert("Atenção", "Origem e destino devem ser diferentes")
        return
      }
    }

    if (type === "TRANSFER" && sourceAccount && targetAccount && sourceAccount.currency !== targetAccount.currency) {
      Alert.alert("AtenÃ§Ã£o", "Transferencias entre moedas diferentes ainda nao sao suportadas.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        type,
        occurredAt: occurredAtIso,
        amountCents: cents,
        accountId,
        categoryId: type === "TRANSFER" ? null : categoryId || null,
        transferAccountId: type === "TRANSFER" ? transferAccountId || null : null,
        description: description.trim() ? description.trim() : null,
        tags: parseTagsInput(tagsInput),
        costCenter: costCenter.trim() ? costCenter.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      }
      const snapshot = buildTransactionSnapshot({
        id: tx?.id ?? createLocalId("transaction"),
        ...payload,
        accounts,
        categories,
      })

      if (tx?.id && isLocalId(tx.id)) {
        await queueOfflineOperation({
          entity: "transaction",
          op: "update",
          clientId: tx.id,
          path: `/transactions/${tx.id}`,
          body: payload,
          snapshot,
        })
        Alert.alert("Fila local", "Transacao salva localmente e aguardando sincronizacao.")
      } else if (tx?.id) {
        await apiFetch(`/transactions/${tx.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      } else {
        await apiFetch("/transactions", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      }
      navigation.goBack()
    } catch (error) {
      if (isOfflineLikeError(error)) {
        const clientId = tx?.id ?? createLocalId("transaction")
        const queuedPayload = {
          type,
          occurredAt: occurredAtIso,
          amountCents: cents,
          accountId,
          categoryId: type === "TRANSFER" ? null : categoryId || null,
          transferAccountId: type === "TRANSFER" ? transferAccountId || null : null,
          description: description.trim() ? description.trim() : null,
          tags: parseTagsInput(tagsInput),
          costCenter: costCenter.trim() ? costCenter.trim() : null,
          notes: notes.trim() ? notes.trim() : null,
        }

        await queueOfflineOperation({
          entity: "transaction",
          op: tx?.id ? "update" : "create",
          clientId,
          path: tx?.id ? `/transactions/${tx.id}` : "/transactions",
          body: queuedPayload,
          snapshot: buildTransactionSnapshot({
            id: clientId,
            ...queuedPayload,
            accounts,
            categories,
          }),
        })
        Alert.alert("Fila local", "Transacao salva localmente e aguardando sincronizacao.")
        navigation.goBack()
        return
      }
      Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao salvar transação")
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!tx?.id) return
    Alert.alert("Remover transação?", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (isLocalId(tx.id)) {
                await queueOfflineOperation({
                  entity: "transaction",
                  op: "delete",
                  clientId: tx.id,
                  path: `/transactions/${tx.id}`,
                })
                Alert.alert("Fila local", "Transacao removida localmente e aguardando sincronizacao.")
                navigation.goBack()
                return
              }

              await apiFetch(`/transactions/${tx.id}`, { method: "DELETE" })
              navigation.goBack()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "transaction",
                  op: "delete",
                  clientId: tx.id,
                  path: `/transactions/${tx.id}`,
                })
                Alert.alert("Fila local", "Transacao removida localmente e aguardando sincronizacao.")
                navigation.goBack()
                return
              }
              Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao remover transação")
            }
          })()
        },
      },
    ])
  }

  const filteredCategories = categories.filter((c) => (type === "INCOME" ? c.type === "INCOME" : c.type === "EXPENSE"))
  const selectedAccount = accounts.find((item) => item.id === accountId)
  const transferAccounts = accounts.filter(
    (item) => item.id !== accountId && (!selectedAccount || item.currency === selectedAccount.currency),
  )

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card title={tx?.id ? "Editar transação" : "Nova transação"}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.chips}>
            {(["EXPENSE", "INCOME", "TRANSFER"] as TransactionType[]).map((t) => (
              <Text
                key={t}
                style={[styles.chip, type === t ? styles.chipActive : null]}
                onPress={() => {
                  setType(t)
                  if (t === "TRANSFER") {
                    setCategoryId("")
                  } else {
                    setTransferAccountId("")
                  }
                }}
              >
                {txTypeLabel(t)}
              </Text>
            ))}
          </View>

          <View style={[styles.row, { marginTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Data (YYYY-MM-DD)</Text>
              <TextInput value={occurredAt} onChangeText={setOccurredAt} placeholder="2026-01-27" placeholderTextColor={theme.colors.muted} style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Valor</Text>
              <TextInput value={amount} onChangeText={setAmount} placeholder="0,00" placeholderTextColor={theme.colors.muted} style={styles.input} keyboardType="decimal-pad" />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>{type === "TRANSFER" ? "Conta origem" : "Conta"}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {loadingLookups ? <Text style={styles.muted}>Carregando…</Text> : null}
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
          {lookupNotice ? <Text style={[styles.muted, { marginTop: 8 }]}>{lookupNotice}</Text> : null}
          {selectedAccount ? (
            <Text style={[styles.muted, { marginTop: 8 }]}>Moeda da conta: {currencyLabel(selectedAccount.currency)}</Text>
          ) : null}

          {type === "TRANSFER" ? (
            <>
              <Text style={[styles.label, { marginTop: 10 }]}>Conta destino</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chips}>
                  {transferAccounts.map((a) => (
                    <Text
                      key={a.id}
                      style={[styles.chip, transferAccountId === a.id ? styles.chipActive : null]}
                      onPress={() => setTransferAccountId(a.id)}
                    >
                      {a.name}
                    </Text>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={[styles.label, { marginTop: 10 }]}>Categoria (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chips}>
                  <Text style={[styles.chip, !categoryId ? styles.chipActive : null]} onPress={() => setCategoryId("")}>
                    Sem
                  </Text>
                  {filteredCategories.map((c) => (
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
            </>
          )}

          <Text style={[styles.label, { marginTop: 10 }]}>Descrição</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex.: Mercado, Uber…"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
          <Text style={[styles.label, { marginTop: 10 }]}>Tags (separadas por vÃ­rgula)</Text>
          <TextInput
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder="fixo, trabalho, reembolso"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Centro de custo</Text>
          <TextInput
            value={costCenter}
            onChangeText={setCostCenter}
            placeholder="Ex.: Marketing"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>ObservaÃ§Ã£o longa</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Detalhes extras da transaÃ§Ã£o"
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, styles.textArea]}
            multiline
          />
        </Card>

        <PrimaryButton title={saving ? "Salvando…" : "Salvar"} onPress={() => void save()} disabled={saving} />
        {tx?.id ? <PrimaryButton title="Remover" onPress={() => void remove()} disabled={saving} /> : null}
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
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
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
