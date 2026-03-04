import * as React from "react"
import { SafeAreaView, ScrollView, StyleSheet, Text } from "react-native"

import { Card } from "../ui/components"
import { theme } from "../ui/theme"

const sections = [
  {
    title: "Dados tratados",
    body: "O FinancePro trata dados de cadastro, autenticacao, sessao e os dados financeiros inseridos por voce, incluindo contas, transacoes, metas, orcamentos, anexos de importacao e logs tecnicos de operacao.",
  },
  {
    title: "Finalidade",
    body: "Usamos estes dados para autenticar seu acesso, sincronizar informacoes entre dispositivos, calcular dashboards e relatorios, prevenir abuso, investigar incidentes e prestar suporte tecnico.",
  },
  {
    title: "Armazenamento e seguranca",
    body: "Os tokens de sessao podem ser armazenados com protecao no dispositivo para manter seu login. No backend, aplicamos controles de acesso, logs e hardening operacional para reduzir risco de uso indevido.",
  },
  {
    title: "Compartilhamento e retencao",
    body: "Nao vendemos dados pessoais. O compartilhamento ocorre apenas com provedores de infraestrutura necessarios para operar o servico. Mantemos os dados enquanto a conta estiver ativa ou pelo periodo exigido para auditoria, seguranca e obrigacoes legais.",
  },
  {
    title: "Direitos do usuario",
    body: "Voce pode encerrar a sessao a qualquer momento e solicitar revisao, exportacao ou exclusao dos seus dados pelos canais oficiais de suporte publicados pelo produto.",
  },
] as const

export function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card title="Política de Privacidade (mínimo)">
          <Text style={styles.text}>
            Coletamos apenas os dados necessários para autenticação e funcionamento do serviço (ex.: e-mail, nome opcional, senha em formato protegido/hasheado e tokens de sessão).
          </Text>
          <Text style={styles.text}>
            No app, tokens podem ser armazenados com segurança no dispositivo para manter sua sessão. Você pode encerrar a sessão a qualquer momento.
          </Text>
          <Text style={styles.text}>
            Não vendemos seus dados. Podemos processar informações para fornecer o serviço, garantir segurança e melhorar a experiência do produto.
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
