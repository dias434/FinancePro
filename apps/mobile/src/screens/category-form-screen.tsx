import * as React from "react"
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAuth } from "../auth/auth-context"
import {
  createLocalId,
  isLocalId,
  isOfflineLikeError,
  queueOfflineOperation,
} from "../lib/offline-outbox"
import type { RootStackParamList } from "../navigation/app-navigator"
import { Card, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

type CategoryType = "INCOME" | "EXPENSE"

function typeLabel(type: CategoryType) {
  switch (type) {
    case "INCOME":
      return "Entrada"
    case "EXPENSE":
      return "Saida"
  }
}

type Props = NativeStackScreenProps<RootStackParamList, "CategoryForm">

export function CategoryFormScreen({ navigation, route }: Props) {
  const { apiFetch } = useAuth()
  const category = route.params?.category

  const [name, setName] = React.useState(category?.name ?? "")
  const [type, setType] = React.useState<CategoryType>(category?.type ?? "EXPENSE")
  const [icon, setIcon] = React.useState(category?.icon ?? "")
  const [color, setColor] = React.useState(category?.color ?? "")
  const [saving, setSaving] = React.useState(false)

  const save = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      Alert.alert("Atencao", "Informe um nome")
      return
    }
    if (trimmedName.length > 60) {
      Alert.alert("Atencao", "Nome com no maximo 60 caracteres")
      return
    }
    if (icon.trim().length > 32) {
      Alert.alert("Atencao", "Icone com no maximo 32 caracteres")
      return
    }
    if (color.trim().length > 32) {
      Alert.alert("Atencao", "Cor com no maximo 32 caracteres")
      return
    }

    const payload = {
      name: trimmedName,
      type,
      icon: icon.trim() ? icon.trim() : null,
      color: color.trim() ? color.trim() : null,
    }

    setSaving(true)
    try {
      const snapshot = {
        id: category?.id ?? createLocalId("category"),
        ...payload,
        icon: payload.icon ?? undefined,
        color: payload.color ?? undefined,
      }

      if (category?.id && isLocalId(category.id)) {
        await queueOfflineOperation({
          entity: "category",
          op: "update",
          clientId: category.id,
          path: `/categories/${category.id}`,
          body: payload,
          snapshot,
        })
        Alert.alert("Fila local", "Categoria salva localmente e aguardando sincronizacao.")
      } else if (category?.id) {
        await apiFetch(`/categories/${category.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      } else {
        await apiFetch("/categories", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      }
      navigation.goBack()
    } catch (error) {
      if (isOfflineLikeError(error)) {
        const clientId = category?.id ?? createLocalId("category")
        await queueOfflineOperation({
          entity: "category",
          op: category?.id ? "update" : "create",
          clientId,
          path: category?.id ? `/categories/${category.id}` : "/categories",
          body: payload,
          snapshot: {
            id: clientId,
            ...payload,
            icon: payload.icon ?? undefined,
            color: payload.color ?? undefined,
          },
        })
        Alert.alert("Fila local", "Categoria salva localmente e aguardando sincronizacao.")
        navigation.goBack()
        return
      }

      Alert.alert(
        "Erro",
        error instanceof Error ? error.message : "Falha ao salvar categoria",
      )
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!category?.id) return
    Alert.alert("Remover categoria?", `Remover "${category.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (isLocalId(category.id)) {
                await queueOfflineOperation({
                  entity: "category",
                  op: "delete",
                  clientId: category.id,
                  path: `/categories/${category.id}`,
                })
                Alert.alert("Fila local", "Categoria removida localmente e aguardando sincronizacao.")
                navigation.goBack()
                return
              }

              await apiFetch(`/categories/${category.id}`, { method: "DELETE" })
              navigation.goBack()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "category",
                  op: "delete",
                  clientId: category.id,
                  path: `/categories/${category.id}`,
                })
                Alert.alert("Fila local", "Categoria removida localmente e aguardando sincronizacao.")
                navigation.goBack()
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
        <Card title={category?.id ? "Editar categoria" : "Nova categoria"}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Alimentacao"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Tipo</Text>
          <View style={styles.row}>
            {(["EXPENSE", "INCOME"] as CategoryType[]).map((itemType) => (
              <Text
                key={itemType}
                style={[styles.chip, type === itemType ? styles.chipActive : null]}
                onPress={() => setType(itemType)}
              >
                {typeLabel(itemType)}
              </Text>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Icone (opcional)</Text>
          <TextInput
            value={icon}
            onChangeText={setIcon}
            placeholder="Ex.: shopping-cart"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Cor (opcional)</Text>
          <TextInput
            value={color}
            onChangeText={setColor}
            placeholder="Ex.: #22c55e"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            autoCapitalize="none"
          />
        </Card>

        <PrimaryButton title={saving ? "Salvando..." : "Salvar"} onPress={() => void save()} disabled={saving} />
        {category?.id ? <PrimaryButton title="Remover" onPress={() => void remove()} disabled={saving} /> : null}
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
  row: {
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
