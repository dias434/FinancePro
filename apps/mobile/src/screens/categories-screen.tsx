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
import { CATEGORIES_CACHE_KEY } from "../lib/offline-keys"
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

type CategoryType = "INCOME" | "EXPENSE"

type Category = {
  id: string
  name: string
  type: CategoryType
  icon?: string
  color?: string
}

type CategoryListResponse = {
  items: Category[]
}

function categoryTypeLabel(type: CategoryType) {
  switch (type) {
    case "INCOME":
      return "Entrada"
    case "EXPENSE":
      return "Saida"
  }
}

type Props = NativeStackScreenProps<RootStackParamList, "Categories">

export function CategoriesScreen({ navigation }: Props) {
  const { apiFetch } = useAuth()
  const isFocused = useIsFocused()

  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<Category[]>([])
  const [offlineNotice, setOfflineNotice] = React.useState<string | null>(null)
  const [syncNotice, setSyncNotice] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    const [cached, pendingBefore] = await Promise.all([
      readOfflineCache<CategoryListResponse>(CATEGORIES_CACHE_KEY),
      readPendingOperations(),
    ])
    const pendingCountBefore = countPendingOperations(pendingBefore)
    const fallbackItems = applyPendingEntityOperations(
      cached?.value.items ?? [],
      pendingBefore,
      "category",
      {
        sort: (a, b) => a.name.localeCompare(b.name),
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
      const data = await apiFetch<CategoryListResponse>(
        "/categories?page=1&pageSize=200&sortBy=name&sortDir=asc",
        { cache: "no-store" } as any,
      )
      const nextItems = applyPendingEntityOperations(
        data.items ?? [],
        pendingAfter,
        "category",
        {
          sort: (a, b) => a.name.localeCompare(b.name),
        },
      )
      setItems(nextItems)
      setOfflineNotice(null)
      setSyncNotice(
        countPendingOperations(pendingAfter) > 0
          ? `${countPendingOperations(pendingAfter)} operacao(oes) pendente(s) de sincronizacao.`
          : null,
      )
      await writeOfflineCache(CATEGORIES_CACHE_KEY, data)
    } catch (error) {
      if (hasFallback) {
        setItems(fallbackItems)
        setOfflineNotice(
          cached
            ? `Modo offline: categorias salvas em ${formatOfflineTimestamp(cached.updatedAt)}.`
            : "Modo offline: exibindo alteracoes locais pendentes.",
        )
      } else {
        setItems([])
        setOfflineNotice(null)
        setSyncNotice(null)
        Alert.alert(
          "Erro",
          error instanceof Error ? error.message : "Falha ao carregar categorias",
        )
      }
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  React.useEffect(() => {
    if (!isFocused) return
    void load()
  }, [isFocused, load])

  const removeCategory = async (item: Category) => {
    Alert.alert("Remover categoria?", `Remover "${item.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (isLocalId(item.id)) {
                await queueOfflineOperation({
                  entity: "category",
                  op: "delete",
                  clientId: item.id,
                  path: `/categories/${item.id}`,
                })
                await load()
                Alert.alert("Fila local", "Categoria removida localmente e aguardando sincronizacao.")
                return
              }

              await apiFetch(`/categories/${item.id}`, { method: "DELETE" })
              await load()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "category",
                  op: "delete",
                  clientId: item.id,
                  path: `/categories/${item.id}`,
                })
                await load()
                Alert.alert("Fila local", "Categoria removida localmente e aguardando sincronizacao.")
                return
              }

              Alert.alert(
                "Erro",
                error instanceof Error ? error.message : "Falha ao remover categoria",
              )
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
          <PrimaryButton
            title="Nova categoria"
            onPress={() => navigation.navigate("CategoryForm")}
          />
          <PrimaryButton title="Atualizar" onPress={() => void load()} disabled={loading} />
        </View>

        {offlineNotice ? <Text style={styles.muted}>{offlineNotice}</Text> : null}
        {syncNotice ? <Text style={styles.muted}>{syncNotice}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.muted}>Nenhuma categoria encontrada.</Text>
        ) : (
          items.map((item) => (
            <Card key={item.id} title={item.name}>
              <Pressable
                onPress={() =>
                  navigation.navigate("CategoryForm", {
                    category: {
                      id: item.id,
                      name: item.name,
                      type: item.type,
                      icon: item.icon,
                      color: item.color,
                    },
                  })
                }
              >
                <View style={{ gap: 6 }}>
                  <Text style={styles.muted}>{categoryTypeLabel(item.type)}</Text>
                  <Text style={styles.muted}>
                    Icone: {item.icon?.trim() || "-"} | Cor: {item.color?.trim() || "-"}
                  </Text>
                  <Text style={styles.link}>Editar</Text>
                </View>
              </Pressable>
              <PrimaryButton title="Remover" onPress={() => removeCategory(item)} />
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
  muted: {
    color: theme.colors.muted,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
})
