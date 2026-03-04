import * as React from "react"
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { RootStackParamList } from "../navigation/app-navigator"
import { useAuth } from "../auth/auth-context"
import { currencyLabel, supportedCurrencies } from "../lib/money"
import {
  createLocalId,
  isLocalId,
  isOfflineLikeError,
  queueOfflineOperation,
} from "../lib/offline-outbox"
import { Card, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

type AccountType = "CASH" | "CHECKING" | "SAVINGS" | "CREDIT_CARD"

function typeLabel(type: AccountType) {
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

type Props = NativeStackScreenProps<RootStackParamList, "AccountForm">

export function AccountFormScreen({ navigation, route }: Props) {
  const { apiFetch } = useAuth()
  const account = route.params?.account

  const [name, setName] = React.useState(account?.name ?? "")
  const [type, setType] = React.useState<AccountType>((account?.type as AccountType) ?? "CHECKING")
  const [currency, setCurrency] = React.useState(account?.currency ?? "BRL")
  const [saving, setSaving] = React.useState(false)

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      Alert.alert("Atenção", "Informe um nome")
      return
    }

    setSaving(true)
    try {
      const payload = { name: trimmed, type, currency }
      const snapshot = {
        id: account?.id ?? createLocalId("account"),
        name: trimmed,
        type,
        currency,
        balanceCents: account?.balanceCents ?? 0,
      }

      if (account?.id && isLocalId(account.id)) {
        await queueOfflineOperation({
          entity: "account",
          op: "update",
          clientId: account.id,
          path: `/accounts/${account.id}`,
          body: payload,
          snapshot,
        })
        Alert.alert("Fila local", "Conta salva localmente e aguardando sincronizacao.")
      } else if (account?.id) {
        await apiFetch(`/accounts/${account.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      } else {
        await apiFetch("/accounts", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
      }
      navigation.goBack()
    } catch (error) {
      if (isOfflineLikeError(error)) {
        const clientId = account?.id ?? createLocalId("account")
        await queueOfflineOperation({
          entity: "account",
          op: account?.id ? "update" : "create",
          clientId,
          path: account?.id ? `/accounts/${account.id}` : "/accounts",
          body: { name: trimmed, type, currency },
          snapshot: {
            id: clientId,
            name: trimmed,
            type,
            currency,
            balanceCents: account?.balanceCents ?? 0,
          },
        })
        Alert.alert("Fila local", "Conta salva localmente e aguardando sincronizacao.")
        navigation.goBack()
        return
      }

      Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao salvar conta")
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!account?.id) return
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
                Alert.alert("Fila local", "Conta removida localmente e aguardando sincronizacao.")
                navigation.goBack()
                return
              }

              await apiFetch(`/accounts/${account.id}`, { method: "DELETE" })
              navigation.goBack()
            } catch (error) {
              if (isOfflineLikeError(error)) {
                await queueOfflineOperation({
                  entity: "account",
                  op: "delete",
                  clientId: account.id,
                  path: `/accounts/${account.id}`,
                })
                Alert.alert("Fila local", "Conta removida localmente e aguardando sincronizacao.")
                navigation.goBack()
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
        <Card title={account?.id ? "Editar conta" : "Nova conta"}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Nubank, Carteira"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Tipo</Text>
          <View style={styles.row}>
            {(["CHECKING", "SAVINGS", "CASH", "CREDIT_CARD"] as AccountType[]).map((t) => (
              <Text
                key={t}
                style={[styles.chip, type === t ? styles.chipActive : null]}
                onPress={() => setType(t)}
              >
                {typeLabel(t)}
              </Text>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Moeda</Text>
          <View style={styles.row}>
            {supportedCurrencies.map((item) => (
              <Text
                key={item}
                style={[styles.chip, currency === item ? styles.chipActive : null]}
                onPress={() => setCurrency(item)}
              >
                {currencyLabel(item)}
              </Text>
            ))}
          </View>
        </Card>

        <PrimaryButton title={saving ? "Salvando…" : "Salvar"} onPress={() => void save()} disabled={saving} />
        {account?.id ? <PrimaryButton title="Remover" onPress={() => void remove()} disabled={saving} /> : null}
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
