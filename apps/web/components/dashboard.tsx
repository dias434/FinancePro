"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, Home, Target, PieChart, Settings, Plus } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface DashboardProps {
  userName: string
}

type Period = "week" | "month" | "semester" | "year"
type Screen = "home" | "budget" | "goals" | "reports" | "settings"

const chartData = {
  week: [
    { date: "Seg", value: 450 },
    { date: "Ter", value: 380 },
    { date: "Qua", value: 520 },
    { date: "Qui", value: 310 },
    { date: "Sex", value: 680 },
    { date: "Sáb", value: 290 },
    { date: "Dom", value: 150 },
  ],
  month: [
    { date: "Sem 1", value: 2450 },
    { date: "Sem 2", value: 3200 },
    { date: "Sem 3", value: 2800 },
    { date: "Sem 4", value: 3550 },
  ],
  semester: [
    { date: "Jan", value: 12450 },
    { date: "Fev", value: 13200 },
    { date: "Mar", value: 11800 },
    { date: "Abr", value: 14500 },
    { date: "Mai", value: 13900 },
    { date: "Jun", value: 15200 },
  ],
  year: [
    { date: "Jan", value: 12450 },
    { date: "Fev", value: 13200 },
    { date: "Mar", value: 11800 },
    { date: "Abr", value: 14500 },
    { date: "Mai", value: 13900 },
    { date: "Jun", value: 15200 },
    { date: "Jul", value: 14800 },
    { date: "Ago", value: 16100 },
    { date: "Set", value: 15500 },
    { date: "Out", value: 17200 },
    { date: "Nov", value: 16800 },
    { date: "Dez", value: 18500 },
  ],
}

export function Dashboard({ userName }: DashboardProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [period, setPeriod] = useState<Period>("month")

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-background to-muted">
      {currentScreen === "home" && (
        <div className="animate-fade-in">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-br from-primary to-accent p-6 pb-28 rounded-b-[2rem]">
            <div className="max-w-md mx-auto">
              <p className="text-primary-foreground/80 text-sm mb-1">Olá,</p>
              <h1 className="text-2xl font-bold text-primary-foreground mb-6">{userName}</h1>

              {/* Card de Saldo Principal */}
              <Card className="bg-card/95 backdrop-blur-xl border-0 shadow-2xl">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-2">Saldo Total</p>
                  <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    R$ 12.450,00
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-green-500/10">
                        <ArrowUpCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Entradas</p>
                        <p className="text-lg font-semibold">R$ 8.500</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-red-500/10">
                        <ArrowDownCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Saídas</p>
                        <p className="text-lg font-semibold">R$ 3.250</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="max-w-md mx-auto px-6 -mt-16 space-y-4">
            <Card className="backdrop-blur-xl bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={period === "week" ? "default" : "ghost"}
                    onClick={() => setPeriod("week")}
                    className="flex-1"
                  >
                    Semanal
                  </Button>
                  <Button
                    size="sm"
                    variant={period === "month" ? "default" : "ghost"}
                    onClick={() => setPeriod("month")}
                    className="flex-1"
                  >
                    Mensal
                  </Button>
                  <Button
                    size="sm"
                    variant={period === "semester" ? "default" : "ghost"}
                    onClick={() => setPeriod("semester")}
                    className="flex-1 text-xs"
                  >
                    6 Meses
                  </Button>
                  <Button
                    size="sm"
                    variant={period === "year" ? "default" : "ghost"}
                    onClick={() => setPeriod("year")}
                    className="flex-1"
                  >
                    Anual
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Fluxo de Caixa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    value: {
                      label: "Valor",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData[period]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Resumo por Categoria */}
            <Card className="backdrop-blur-xl bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Gastos por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Alimentação</span>
                    <span className="font-semibold">R$ 800</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-chart-1 to-chart-2 h-2.5 rounded-full"
                      style={{ width: "80%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Transporte</span>
                    <span className="font-semibold">R$ 300</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-chart-2 to-chart-3 h-2.5 rounded-full"
                      style={{ width: "60%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Lazer</span>
                    <span className="font-semibold">R$ 450</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-chart-3 to-chart-4 h-2.5 rounded-full"
                      style={{ width: "45%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Contas</span>
                    <span className="font-semibold">R$ 1.200</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-chart-4 to-chart-5 h-2.5 rounded-full"
                      style={{ width: "95%" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {currentScreen === "budget" && (
        <div className="animate-fade-in max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Orçamento</h2>
          <div className="space-y-4">
            <Card className="backdrop-blur-xl bg-card/50">
              <CardHeader>
                <CardTitle>Orçamento Mensal Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-2">R$ 5.000,00</p>
                <p className="text-sm text-muted-foreground">Gasto: R$ 3.250,00 (65%)</p>
                <div className="w-full bg-muted rounded-full h-3 mt-3">
                  <div className="bg-gradient-to-r from-primary to-accent h-3 rounded-full" style={{ width: "65%" }} />
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Detalhes por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Alimentação", budget: 1000, spent: 800 },
                  { name: "Transporte", budget: 500, spent: 300 },
                  { name: "Lazer", budget: 800, spent: 450 },
                  { name: "Contas", budget: 1500, spent: 1200 },
                  { name: "Saúde", budget: 600, spent: 350 },
                ].map((category) => (
                  <div key={category.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{category.name}</span>
                      <span className="font-semibold">
                        R$ {category.spent} / R$ {category.budget}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(category.spent / category.budget) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {currentScreen === "goals" && (
        <div className="animate-fade-in max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Objetivos Financeiros</h2>
          <div className="space-y-4">
            {[
              { name: "Viagem para Europa", target: 15000, current: 8500, icon: "✈️" },
              { name: "Fundo de Emergência", target: 30000, current: 22000, icon: "🛡️" },
              { name: "Carro Novo", target: 80000, current: 35000, icon: "🚗" },
              { name: "Investimento", target: 50000, current: 12000, icon: "📈" },
            ].map((goal) => {
              const percentage = (goal.current / goal.target) * 100
              return (
                <Card key={goal.name} className="backdrop-blur-xl bg-card/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="text-4xl">{goal.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{goal.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          R$ {goal.current.toLocaleString()} de R$ {goal.target.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 mb-2">
                      <div
                        className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-right text-muted-foreground">{percentage.toFixed(0)}% completo</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {currentScreen === "reports" && (
        <div className="animate-fade-in max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Relatórios</h2>
          <div className="space-y-4">
            <Card className="backdrop-blur-xl bg-card/50">
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Patrimônio Total</span>
                  <span className="text-xl font-bold">R$ 45.230,00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Economizado este mês</span>
                  <span className="text-lg font-semibold text-green-500">R$ 5.250,00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Taxa de poupança</span>
                  <span className="text-lg font-semibold">62%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl bg-card/50">
              <CardHeader>
                <CardTitle>Tendências</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Seus gastos diminuíram 12% este mês</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Você está 18% acima da meta de economia</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Gastos com lazer aumentaram 8%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {currentScreen === "settings" && (
        <div className="animate-fade-in max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Configurações</h2>
          <div className="space-y-4">
            <Card className="backdrop-blur-xl bg-card/50">
              <CardContent className="p-4 space-y-3">
                <Button variant="ghost" className="w-full justify-start">
                  Perfil
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Notificações
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Segurança
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Preferências
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Ajuda e Suporte
                </Button>
                <Button variant="ghost" className="w-full justify-start text-destructive">
                  Sair
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant={currentScreen === "home" ? "default" : "ghost"}
              size="sm"
              className="flex-col h-16 gap-1"
              onClick={() => setCurrentScreen("home")}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Início</span>
            </Button>

            <Button
              variant={currentScreen === "budget" ? "default" : "ghost"}
              size="sm"
              className="flex-col h-16 gap-1"
              onClick={() => setCurrentScreen("budget")}
            >
              <PieChart className="w-5 h-5" />
              <span className="text-xs">Orçamento</span>
            </Button>

            {/* Botão Central de Adicionar */}
            <Button size="lg" className="rounded-full w-14 h-14 shadow-2xl -mt-8">
              <Plus className="w-6 h-6" />
            </Button>

            <Button
              variant={currentScreen === "goals" ? "default" : "ghost"}
              size="sm"
              className="flex-col h-16 gap-1"
              onClick={() => setCurrentScreen("goals")}
            >
              <Target className="w-5 h-5" />
              <span className="text-xs">Objetivos</span>
            </Button>

            <Button
              variant={currentScreen === "reports" ? "default" : "ghost"}
              size="sm"
              className="flex-col h-16 gap-1"
              onClick={() => setCurrentScreen("reports")}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs">Relatórios</span>
            </Button>

            <Button
              variant={currentScreen === "settings" ? "default" : "ghost"}
              size="sm"
              className="flex-col h-16 gap-1"
              onClick={() => setCurrentScreen("settings")}
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">Config</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
