import * as React from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useIsFocused } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { RootStackParamList } from "../navigation/app-navigator"
import { useAuth } from "../auth/auth-context"
import { formatMoney } from "../lib/money"
import { formatOfflineTimestamp, readOfflineCache, writeOfflineCache } from "../lib/offline-cache"
import { ACCOUNTS_CACHE_KEY } from "../lib/offline-keys"
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

type Account = {
  id: string
  name: string
  type: "CASH" | "CHECKING" | "SAVINGS" | "CREDIT_CARD"
  currency: string
  balanceCents: number
}

type AccountListResponse = {
  items: Account[]
}

function accountTypeLabel(type: Account["type"]) {
  switch (type) {
    case "CASH":
      return "Dinheiro"
    case "CHECKING":
      return "Conta corrente"
    case "SAVINGS":
      return "Poupança"
    case "CREDIT_CARD":
      return "Cartão"
  }
}

type Props = NativeStackScreenProps<RootStackParamList, "Accounts">

export function AccountsScreen({ navigation }: Props) {
  const { apiFetch } = useAuth()
  const isFocused = useIsFocused()
  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<Account[]>([])
  const [offlineNotice, setOfflineNotice] = React.useState<string | null>(null)
  const [syncNotice, setSyncNotice] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    const [cached, pendingBefore] = await Promise.all([
      readOfflineCache<AccountListResponse>(ACCOUNTS_CACHE_KEY),
      readPendingOperations(),
    ])
    const pendingCountBefore = countPendingOperations(pendingBefore)
    const fallbackItems = applyPendingEntityOperations(
      cached?.value.items ?? [],
      pendingBefore,
      "account",
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
      await flushPendingOperations(apiFetch)
      const pendingAfter = await readPendingOperations()
      const data = await apiFetch<AccountListResponse>(
        "/accounts?page=1&pageSize=200&sortBy=createdAt&sortDir=desc",
        { cache: "no-store" } as any,
      )
      const nextItems = applyPendingEntityOperations(
        data.items ?? [],
        pendingAfter,
        "account",
      )

      setItems(nextItems)
      setOfflineNotice(null)
      setSyncNotice(
        countPendingOperations(pendingAfter) > 0
          ? `${countPendingOperations(pendingAfter)} operacao(oes) pendente(s) de sincronizacao.`
          : null,
      )
      await writeOfflineCache(ACCOUNTS_CACHE_KEY, data)
    } catch (error) {
      if (hasFallback) {
        setItems(fallbackItems)
        setOfflineNotice(
          cached
            ? `Modo offline: contas salvas em ${formatOfflineTimestamp(cached.updatedAt)}.`
            : "Modo offline: exibindo alteracoes locais pendentes.",
        )
      } else {
        setItems([])
        setOfflineNotice(null)
        setSyncNotice(null)
        Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao carregar contas")
      }
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  React.useEffect(() => {
    if (!isFocused) return
    void load()
  }, [isFocused, load])

  const removeAccount = async (account: Account) => {
    Alert.alert("Remover conta?", `Remover "${account.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (isLocalId(account.id)) {
                await queueOfflineOperation({
                  entity: "account",
                  op: "delete",
                  clientId: account.id,
                  path: `/accounts/${account.id}`,
                })
                await load()
                Alert.alert("Fila local", "Conta removida localmente e aguardando sincronizacao.")
                return
              }

              await apiFetch(`/accounts/${account.id}`, { method: "DELETE" })
              await load()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "account",
                  op: "delete",
                  clientId: account.id,
                  path: `/accounts/${account.id}`,
                })
                await load()
                Alert.alert("Fila local", "Conta removida localmente e aguardando sincronizacao.")
                return
              }

              Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao remover conta")
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
          <PrimaryButton title="Nova conta" onPress={() => navigation.navigate("AccountForm")} />
          <PrimaryButton title="Atualizar" onPress={() => void load()} disabled={loading} />
        </View>

        {offlineNotice ? <Text style={styles.notice}>{offlineNotice}</Text> : null}
        {syncNotice ? <Text style={styles.notice}>{syncNotice}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.muted}>Nenhuma conta encontrada.</Text>
        ) : (
          items.map((a) => (
            <Card key={a.id} title={a.name}>
              <Pressable
                onPress={() =>
                  navigation.navigate("AccountForm", {
                    account: a,
                  })
                }
              >
                <View style={{ gap: 6 }}>
                  <Text style={styles.muted}>
                    {accountTypeLabel(a.type)} | {a.currency}
                  </Text>
                  <Text style={styles.value}>{formatMoney(a.balanceCents, a.currency)}</Text>
                  <Text style={styles.link}>Editar</Text>
                </View>
              </Pressable>
              <PrimaryButton title="Remover" onPress={() => removeAccount(a)} />
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
})
