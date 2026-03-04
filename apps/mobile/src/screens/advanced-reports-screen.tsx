import * as React from "react"
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native"
import { useIsFocused } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAuth } from "../auth/auth-context"
import { formatMoney, supportedCurrencies } from "../lib/money"
import type { RootStackParamList } from "../navigation/app-navigator"
import { Card } from "../ui/components"
import { theme } from "../ui/theme"

type AdvancedReportResponse = {
  baseCurrency: string
  supportedCurrencies: string[]
  comparison: {
    currentMonthKey: string
    previousMonthKey: string
    current: { incomeCents: number; expenseCents: number; netCents: number }
    previous: { incomeCents: number; expenseCents: number; netCents: number }
    delta: { incomeCents: number; expenseCents: number; netCents: number }
  }
  categoriesGrowth: Array<{
    categoryId: string | null
    categoryName: string
    currentExpenseCents: number
    previousExpenseCents: number
    deltaCents: number
    growthPercent: number
  }>
  forecast: {
    monthsConsidered: number
    averageIncomeCents: number
    averageExpenseCents: number
    averageNetCents: number
    currentBalanceCents: number
    projections: Array<{
      monthKey: string
      projectedBalanceCents: number
    }>
  }
}

type Props = NativeStackScreenProps<RootStackParamList, "AdvancedReports">

export function AdvancedReportsScreen({}: Props) {
  const { apiFetch } = useAuth()
  const isFocused = useIsFocused()

  const [baseCurrency, setBaseCurrency] = React.useState<string>("BRL")
  const [report, setReport] = React.useState<AdvancedReportResponse | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!isFocused) return

    let alive = true
    setLoading(true)

    const params = new URLSearchParams()
    params.set("baseCurrency", baseCurrency)

    apiFetch<AdvancedReportResponse>(`/dashboard/advanced?${params.toString()}`, {
      cache: "no-store",
    } as any)
      .then((response) => {
        if (!alive) return
        setReport(response)
      })
      .catch((error) => {
        if (!alive) return
        setReport(null)
        Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao carregar relatorios")
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [apiFetch, baseCurrency, isFocused])

  const currencies = report?.supportedCurrencies?.length ? report.supportedCurrencies : [...supportedCurrencies]

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card title="Moeda base">
          <View style={styles.row}>
            {currencies.map((currency) => (
              <Text
                key={currency}
                style={[styles.chip, baseCurrency === currency ? styles.chipActive : null]}
                onPress={() => setBaseCurrency(currency)}
              >
                {currency}
              </Text>
            ))}
          </View>
        </Card>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : !report ? (
          <Text style={styles.muted}>Sem dados disponiveis.</Text>
        ) : (
          <>
            <Card title="Comparativo mensal">
              <Text style={styles.muted}>
                {report.comparison.previousMonthKey} x {report.comparison.currentMonthKey}
              </Text>
              <Text style={styles.value}>
                Resultado atual: {formatMoney(report.comparison.current.netCents, report.baseCurrency)}
              </Text>
              <Text style={styles.muted}>
                Resultado anterior: {formatMoney(report.comparison.previous.netCents, report.baseCurrency)}
              </Text>
              <Text style={styles.muted}>
                Delta: {formatMoney(report.comparison.delta.netCents, report.baseCurrency)}
              </Text>
            </Card>

            <Card title="Categorias que mais cresceram">
              {report.categoriesGrowth.length === 0 ? (
                <Text style={styles.muted}>Sem crescimento relevante no periodo.</Text>
              ) : (
                report.categoriesGrowth.map((item) => (
                  <View key={item.categoryId ?? item.categoryName} style={styles.block}>
                    <Text style={styles.value}>{item.categoryName}</Text>
                    <Text style={styles.muted}>
                      Atual: {formatMoney(item.currentExpenseCents, report.baseCurrency)} | Antes:{" "}
                      {formatMoney(item.previousExpenseCents, report.baseCurrency)}
                    </Text>
                    <Text style={styles.muted}>
                      Crescimento: {formatMoney(item.deltaCents, report.baseCurrency)} ({item.growthPercent.toFixed(2)}%)
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <Card title="Previsao">
              <Text style={styles.muted}>
                Media ({report.forecast.monthsConsidered} mes(es)): {formatMoney(report.forecast.averageNetCents, report.baseCurrency)}
              </Text>
              <Text style={styles.muted}>
                Saldo atual: {formatMoney(report.forecast.currentBalanceCents, report.baseCurrency)}
              </Text>
              {report.forecast.projections.length === 0 ? (
                <Text style={styles.muted}>Sem base historica suficiente.</Text>
              ) : (
                report.forecast.projections.map((item) => (
                  <View key={item.monthKey} style={styles.block}>
                    <Text style={styles.value}>{item.monthKey}</Text>
                    <Text style={styles.muted}>
                      Saldo projetado: {formatMoney(item.projectedBalanceCents, report.baseCurrency)}
                    </Text>
                  </View>
                ))
              )}
            </Card>
          </>
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
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
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
  value: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  muted: {
    color: theme.colors.muted,
  },
  block: {
    gap: 4,
  },
})
