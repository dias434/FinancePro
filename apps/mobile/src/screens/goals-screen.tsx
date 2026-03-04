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

import { useAuth } from "../auth/auth-context"
import { formatOfflineTimestamp, readOfflineCache, writeOfflineCache } from "../lib/offline-cache"
import { GOALS_CACHE_KEY } from "../lib/offline-keys"
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

type Goal = {
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
  items: Goal[]
}

function formatCentsBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR").format(d)
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

type Props = NativeStackScreenProps<RootStackParamList, "Goals">

export function GoalsScreen({ navigation }: Props) {
  const { apiFetch } = useAuth()
  const isFocused = useIsFocused()

  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<Goal[]>([])
  const [offlineNotice, setOfflineNotice] = React.useState<string | null>(null)
  const [syncNotice, setSyncNotice] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    const [cached, pendingBefore] = await Promise.all([
      readOfflineCache<GoalListResponse>(GOALS_CACHE_KEY),
      readPendingOperations(),
    ])
    const pendingCountBefore = countPendingOperations(pendingBefore)
    const fallbackItems = applyPendingEntityOperations(
      cached?.value.items ?? [],
      pendingBefore,
      "goal",
      {
        sort: (a, b) => a.targetDate.localeCompare(b.targetDate),
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
      await flushPendingOperations(apiFetch)
      const pendingAfter = await readPendingOperations()
      const data = await apiFetch<GoalListResponse>(
        "/goals?page=1&pageSize=200&sortBy=targetDate&sortDir=asc",
        { cache: "no-store" } as any,
      )
      const nextItems = applyPendingEntityOperations(
        data.items ?? [],
        pendingAfter,
        "goal",
        {
          sort: (a, b) => a.targetDate.localeCompare(b.targetDate),
        },
      )
      setItems(nextItems)
      setOfflineNotice(null)
      setSyncNotice(
        countPendingOperations(pendingAfter) > 0
          ? `${countPendingOperations(pendingAfter)} operacao(oes) pendente(s) de sincronizacao.`
          : null,
      )
      await writeOfflineCache(GOALS_CACHE_KEY, data)
    } catch (error) {
      if (hasFallback) {
        setItems(fallbackItems)
        setOfflineNotice(
          cached
            ? `Modo offline: metas salvas em ${formatOfflineTimestamp(cached.updatedAt)}.`
            : "Modo offline: exibindo alteracoes locais pendentes.",
        )
      } else {
        setItems([])
        setOfflineNotice(null)
        setSyncNotice(null)
        Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao carregar metas")
      }
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  React.useEffect(() => {
    if (!isFocused) return
    void load()
  }, [isFocused, load])

  const removeGoal = async (item: Goal) => {
    Alert.alert("Remover meta?", `Remover "${item.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (isLocalId(item.id)) {
                await queueOfflineOperation({
                  entity: "goal",
                  op: "delete",
                  clientId: item.id,
                  path: `/goals/${item.id}`,
                })
                await load()
                Alert.alert("Fila local", "Meta removida localmente e aguardando sincronizacao.")
                return
              }

              await apiFetch(`/goals/${item.id}`, { method: "DELETE" })
              await load()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "goal",
                  op: "delete",
                  clientId: item.id,
                  path: `/goals/${item.id}`,
                })
                await load()
                Alert.alert("Fila local", "Meta removida localmente e aguardando sincronizacao.")
                return
              }

              Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao remover meta")
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
          <PrimaryButton title="Nova meta" onPress={() => navigation.navigate("GoalForm")} />
          <PrimaryButton title="Atualizar" onPress={() => void load()} disabled={loading} />
        </View>

        {offlineNotice ? <Text style={styles.muted}>{offlineNotice}</Text> : null}
        {syncNotice ? <Text style={styles.muted}>{syncNotice}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : items.length === 0 ? (
          <Card title="Sem metas">
            <Text style={styles.muted}>Crie uma meta para acompanhar progresso ate uma data alvo.</Text>
            <PrimaryButton title="Criar meta" onPress={() => navigation.navigate("GoalForm")} />
          </Card>
        ) : (
          items.map((item) => {
            const progress = clampPercent(item.progressPercent)
            return (
              <Card key={item.id} title={item.name}>
                <Pressable
                  onPress={() =>
                    navigation.navigate("GoalForm", {
                      goal: {
                        id: item.id,
                        name: item.name,
                        targetCents: item.targetCents,
                        currentCents: item.currentCents,
                        targetDate: item.targetDate,
                      },
                    })
                  }
                >
                  <View style={{ gap: 8 }}>
                    <Text style={styles.value}>Meta: {formatCentsBRL(item.targetCents)}</Text>
                    <Text style={styles.muted}>Acumulado: {formatCentsBRL(item.currentCents)}</Text>
                    <Text style={styles.muted}>Restante: {formatCentsBRL(item.remainingCents)}</Text>
                    <Text style={styles.muted}>Data alvo: {formatDate(item.targetDate)}</Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress}%` as any,
                            backgroundColor: item.completed ? theme.colors.primary : theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.muted}>Progresso: {item.progressPercent.toFixed(2)}%</Text>
                    <Text style={item.completed ? styles.done : styles.muted}>
                      {item.completed
                        ? "Meta concluida"
                        : item.daysRemaining >= 0
                          ? `${item.daysRemaining} dia(s) restantes`
                          : `${Math.abs(item.daysRemaining)} dia(s) apos prazo`}
                    </Text>
                    <Text style={styles.link}>Editar</Text>
                  </View>
                </Pressable>
                <PrimaryButton title="Remover" onPress={() => removeGoal(item)} />
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
  done: {
    color: theme.colors.primary,
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
