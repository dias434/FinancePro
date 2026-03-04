import * as React from "react"
import { SafeAreaView, ScrollView, StyleSheet, Text } from "react-native"

import { Card } from "../ui/components"
import { theme } from "../ui/theme"

const sections = [
  {
    title: "Escopo do servico",
    body: "O FinancePro e uma ferramenta de organizacao financeira pessoal. O app nao substitui orientacao financeira, contabil, fiscal ou juridica e nao executa movimentacoes bancarias em seu nome.",
  },
  {
    title: "Responsabilidades do usuario",
    body: "Voce e responsavel por manter credenciais e dispositivo protegidos, informar dados verdadeiros e revisar valores importados, parcelamentos, recorrencias e demais registros antes de tomar decisoes.",
  },
  {
    title: "Uso aceitavel",
    body: "Nao e permitido compartilhar acesso, tentar contornar controles de seguranca, enviar conteudo malicioso, automatizar abuso de API ou usar o produto para fraude, engenharia reversa ou violacao de terceiros.",
  },
  {
    title: "Suspensao e mudancas",
    body: "Podemos limitar ou suspender contas em caso de abuso, risco de seguranca ou exigencia legal. Tambem podemos atualizar funcionalidades e estes termos; a versao publicada no app passa a valer na data indicada.",
  },
  {
    title: "Limites de responsabilidade",
    body: "O usuario continua responsavel por conferir saldos, impostos, vencimentos e demais obrigacoes. Falhas devem ser reportadas pelos canais oficiais de suporte para tratamento conforme a politica operacional do produto.",
  },
] as const

export function TermsScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card title="Termos de Uso (mínimo)">
          <Text style={styles.text}>
            Ao criar uma conta e usar o FinancePro, você concorda em utilizar o serviço de boa-fé e em manter suas credenciais em segurança.
          </Text>
          <Text style={styles.text}>
            O FinancePro é uma ferramenta de organização financeira. Ele não oferece aconselhamento financeiro, contábil ou jurídico.
          </Text>
          <Text style={styles.text}>
            Podemos atualizar estes termos para melhorar o produto e cumprir obrigações legais. Quando isso acontecer, a versão publicada neste app passa a valer.
          </Text>
          <Text style={styles.meta}>Vigencia: 2026-03-03</Text>
          {sections.map((section) => (
            <React.Fragment key={section.title}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.text}>{section.body}</Text>
            </React.Fragment>
          ))}
        </Card>
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
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  text: {
    color: theme.colors.text,
    lineHeight: 20,
  },
})
