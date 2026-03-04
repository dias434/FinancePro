import * as React from "react"
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput } from "react-native"
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

function parseAmountToCents(value: string) {
  const raw = value.trim().replace(",", ".")
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

function toDateInput(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function buildGoalSnapshot(input: {
  id: string
  name: string
  targetCents: number
  currentCents: number
  targetDate: string
}) {
  const progressPercent =
    input.targetCents > 0
      ? Math.round((input.currentCents / input.targetCents) * 10000) / 100
      : 0
  const remainingCents = Math.max(0, input.targetCents - input.currentCents)
  const completed = input.currentCents >= input.targetCents
  const target = new Date(input.targetDate)
  const daysRemaining = Number.isNaN(target.getTime())
    ? 0
    : Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return {
    ...input,
    progressPercent,
    remainingCents,
    completed,
    daysRemaining,
  }
}

type Props = NativeStackScreenProps<RootStackParamList, "GoalForm">

export function GoalFormScreen({ navigation, route }: Props) {
  const { apiFetch } = useAuth()
  const goal = route.params?.goal

  const [name, setName] = React.useState(goal?.name ?? "")
  const [targetAmount, setTargetAmount] = React.useState(
    goal ? String((goal.targetCents / 100).toFixed(2)) : "",
  )
  const [currentAmount, setCurrentAmount] = React.useState(
    goal ? String((goal.currentCents / 100).toFixed(2)) : "0",
  )
  const [targetDate, setTargetDate] = React.useState(goal ? toDateInput(goal.targetDate) : "")
  const [saving, setSaving] = React.useState(false)

  const save = async () => {
    const trimmedName = name.trim()
    const targetCents = parseAmountToCents(targetAmount)
    const currentCents = parseAmountToCents(currentAmount)

    if (!trimmedName) {
      Alert.alert("Atencao", "Informe um nome")
      return
    }
    if (trimmedName.length > 80) {
      Alert.alert("Atencao", "Nome com no maximo 80 caracteres")
      return
    }
    if (targetCents === null || targetCents <= 0) {
      Alert.alert("Atencao", "Informe um valor alvo valido")
      return
    }
    if (currentCents === null || currentCents < 0) {
      Alert.alert("Atencao", "Informe um valor atual valido")
      return
    }
    if (!targetDate.trim()) {
      Alert.alert("Atencao", "Informe a data alvo (YYYY-MM-DD)")
      return
    }

    const targetDateIso = new Date(targetDate).toISOString()
    if (Number.isNaN(new Date(targetDateIso).getTime())) {
      Alert.alert("Atencao", "Data alvo invalida")
      return
    }

    const payload = {
      name: trimmedName,
      targetCents,
      currentCents,
      targetDate: targetDateIso,
    }

    setSaving(true)
    try {
      const snapshot = buildGoalSnapshot({
        id: goal?.id ?? createLocalId("goal"),
        name: trimmedName,
        targetCents,
        currentCents,
        targetDate: targetDateIso,
      })

      if (goal?.id && isLocalId(goal.id)) {
        await queueOfflineOperation({
          entity: "goal",
          op: "update",
          clientId: goal.id,
          path: `/goals/${goal.id}`,
          body: payload,
          snapshot,
        })
        Alert.alert("Fila local", "Meta salva localmente e aguardando sincronizacao.")
      } else if (goal?.id) {
        await apiFetch(`/goals/${goal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      } else {
        await apiFetch("/goals", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      }
      navigation.goBack()
    } catch (error) {
      if (isOfflineLikeError(error)) {
        const clientId = goal?.id ?? createLocalId("goal")
        await queueOfflineOperation({
          entity: "goal",
          op: goal?.id ? "update" : "create",
          clientId,
          path: goal?.id ? `/goals/${goal.id}` : "/goals",
          body: payload,
          snapshot: buildGoalSnapshot({
            id: clientId,
            name: trimmedName,
            targetCents,
            currentCents,
            targetDate: targetDateIso,
          }),
        })
        Alert.alert("Fila local", "Meta salva localmente e aguardando sincronizacao.")
        navigation.goBack()
        return
      }

      Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao salvar meta")
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!goal?.id) return
    Alert.alert("Remover meta?", "Essa acao nao pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (isLocalId(goal.id)) {
                await queueOfflineOperation({
                  entity: "goal",
                  op: "delete",
                  clientId: goal.id,
                  path: `/goals/${goal.id}`,
                })
                Alert.alert("Fila local", "Meta removida localmente e aguardando sincronizacao.")
                navigation.goBack()
                return
              }

              await apiFetch(`/goals/${goal.id}`, { method: "DELETE" })
              navigation.goBack()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "goal",
                  op: "delete",
                  clientId: goal.id,
                  path: `/goals/${goal.id}`,
                })
                Alert.alert("Fila local", "Meta removida localmente e aguardando sincronizacao.")
                navigation.goBack()
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
        <Card title={goal?.id ? "Editar meta" : "Nova meta"}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Reserva de emergencia"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Valor alvo (R$)</Text>
          <TextInput
            value={targetAmount}
            onChangeText={setTargetAmount}
            placeholder="0,00"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Valor atual (R$)</Text>
          <TextInput
            value={currentAmount}
            onChangeText={setCurrentAmount}
            placeholder="0,00"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Data alvo (YYYY-MM-DD)</Text>
          <TextInput
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="2026-12-31"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
        </Card>

        <PrimaryButton title={saving ? "Salvando..." : "Salvar"} onPress={() => void save()} disabled={saving} />
        {goal?.id ? <PrimaryButton title="Remover" onPress={() => void remove()} disabled={saving} /> : null}
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
})
