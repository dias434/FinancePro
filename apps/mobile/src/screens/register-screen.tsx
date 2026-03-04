import * as React from "react"
import { Alert, SafeAreaView, StyleSheet, Switch, Text, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAuth } from "../auth/auth-context"
import type { RootStackParamList } from "../navigation/app-navigator"
import { Card, Field, LinkButton, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

type Props = NativeStackScreenProps<RootStackParamList, "Register">

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [accepted, setAccepted] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function onSubmit() {
    if (!email.trim() || password.length < 8) {
      Alert.alert("Confira os dados", "Informe e-mail e senha (mín. 8).")
      return
    }

    if (!accepted) {
      Alert.alert("Antes de continuar", "Aceite os Termos e a Politica de Privacidade.")
      return
    }

    setLoading(true)
    try {
      await signUp({ email, password, name: name.trim() || undefined })
    } catch (error) {
      Alert.alert("Falha ao cadastrar", error instanceof Error ? error.message : "Tente novamente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <Card title="Criar conta">
        <Field label="Nome (opcional)" value={name} onChangeText={setName} />
        <Field
          label="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.legal}>
          <View style={styles.legalRow}>
            <Text style={styles.muted}>Ver:</Text>
            <LinkButton title="Termos" onPress={() => navigation.navigate("Terms")} />
            <Text style={styles.muted}>e</Text>
            <LinkButton title="Privacidade" onPress={() => navigation.navigate("Privacy")} />
          </View>
          <View style={styles.acceptRow}>
            <Switch
              value={accepted}
              onValueChange={setAccepted}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.text}
            />
            <Text style={styles.muted}>Li e aceito</Text>
          </View>
        </View>
        <Field
          label="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <PrimaryButton title={loading ? "Criando…" : "Criar conta"} onPress={onSubmit} disabled={loading} />
        <View style={styles.footerRow}>
          <Text style={styles.muted}>Já tem conta?</Text>
          <LinkButton title="Entrar" onPress={() => navigation.navigate("Login")} />
        </View>
      </Card>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: 16,
    gap: 14,
  },
  muted: {
    color: theme.colors.muted,
  },
  footerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  legal: {
    gap: 10,
  },
  legalRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  acceptRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
})
