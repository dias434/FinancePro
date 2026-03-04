import * as React from "react"
import { Alert, SafeAreaView, StyleSheet, Text, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAuth } from "../auth/auth-context"
import type { RootStackParamList } from "../navigation/app-navigator"
import { Card, Field, LinkButton, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

type Props = NativeStackScreenProps<RootStackParamList, "Login">

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function onSubmit() {
    if (!email.trim() || password.length < 8) {
      Alert.alert("Confira os dados", "Informe e-mail e senha (mín. 8).")
      return
    }

    setLoading(true)
    try {
      await signIn({ email, password })
    } catch (error) {
      Alert.alert("Falha ao entrar", error instanceof Error ? error.message : "Tente novamente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>FinancePro</Text>
        <Text style={styles.subtitle}>Controle financeiro no celular</Text>
      </View>

      <Card title="Entrar">
        <Field
          label="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <PrimaryButton title={loading ? "Entrando…" : "Entrar"} onPress={onSubmit} disabled={loading} />
        <View style={styles.footerRow}>
          <Text style={styles.muted}>Não tem conta?</Text>
          <LinkButton title="Criar conta" onPress={() => navigation.navigate("Register")} />
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
  header: {
    gap: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: theme.colors.muted,
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
})

