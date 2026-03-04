"use client"

import * as React from "react"
import Link from "next/link"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { PlusIcon, TagsIcon } from "lucide-react"

import { me, type AuthUser } from "@/lib/auth/client"
import {
  getDashboardSummary,
  type DashboardRange,
  type DashboardSummary,
} from "@/lib/dashboard/client"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatCentsBRL(cents: number) {
  return formatCurrencyBRL(cents / 100)
}

function getDisplayName(user: AuthUser | null) {
  if (!user) return "—"
  if (user.name?.trim()) return user.name.trim()
  return user.email.split("@")[0] ?? user.email
}

function getCategoryPercent(expenseCents: number, totalExpenseCents: number) {
  if (totalExpenseCents <= 0) return 0
  return Math.max(0, Math.min(100, (expenseCents / totalExpenseCents) * 100))
}

export function DashboardOverview() {
  const [range, setRange] = React.useState<DashboardRange>("month")
  const [accountId, setAccountId] = React.useState<string>("all")

  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loadingUser, setLoadingUser] = React.useState(true)

  const [summary, setSummary] = React.useState<DashboardSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    me()
      .then((u) => {
        if (!alive) return
        setUser(u)
      })
      .finally(() => {
        if (!alive) return
        setLoadingUser(false)
      })
    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    let alive = true
    setLoadingSummary(true)

    const now = new Date()
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1

    getDashboardSummary({ range, accountId, year, month })
      .then((data) => {
        if (!alive) return
        setSummary(data)
      })
      .catch((error) => {
        if (!alive) return
        setSummary(null)
        notify.error(
          error instanceof Error ? error.message : "Falha ao carregar o dashboard",
        )
      })
      .finally(() => {
        if (!alive) return
        setLoadingSummary(false)
      })

    return () => {
      alive = false
    }
  }, [range, accountId])

  const chartData = (summary?.series ?? []).map((p) => ({
    label: p.label,
    net: p.netCents / 100,
  }))

  const totalExpenseCents = summary?.expenseCents ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-muted-foreground text-sm">Olá,</div>
          <div className="truncate text-xl font-semibold tracking-tight">
            {loadingUser ? "Carregando…" : getDisplayName(user)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ButtonGroup className="w-full md:w-auto">
            <Button
              type="button"
              variant={range === "month" ? "default" : "outline"}
              onClick={() => setRange("month")}
            >
              Mês
            </Button>
            <Button
              type="button"
              variant={range === "year" ? "default" : "outline"}
              onClick={() => setRange("year")}
            >
              Ano
            </Button>
          </ButtonGroup>

          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              <SelectItem value="main" disabled>
                Conta principal (em breve)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saldo total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {loadingSummary || !summary ? "—" : formatCentsBRL(summary.balanceCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Entradas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {loadingSummary || !summary ? "—" : formatCentsBRL(summary.incomeCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saídas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {loadingSummary || !summary ? "—" : formatCentsBRL(summary.expenseCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {loadingSummary || !summary ? "—" : formatCentsBRL(summary.netCents)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate">Evolução do saldo</CardTitle>
              <div className="text-muted-foreground text-sm">
                {range === "month" ? "Este mês" : "Este ano"} ·{" "}
                {accountId === "all" ? "todas as contas" : "conta selecionada"}
              </div>
            </div>
            <div className="text-muted-foreground text-sm tabular-nums">
              Total: {loadingSummary || !summary ? "—" : formatCentsBRL(summary.netCents)}
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[260px] w-full"
              config={{
                net: { label: "Saldo", color: "hsl(var(--primary))" },
              }}
            >
              <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(Number(value))
                  }
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="var(--color-net)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingSummary ? (
              <div className="text-muted-foreground text-sm">Carregando…</div>
            ) : !summary || summary.byCategory.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                Sem despesas no período.
              </div>
            ) : (
              summary.byCategory.map((item) => (
                <div key={item.categoryId ?? item.categoryName} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="truncate text-sm font-medium">
                      {item.categoryName}
                    </div>
                    <div className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {formatCentsBRL(item.expenseCents)}
                    </div>
                  </div>
                  <Progress
                    value={getCategoryPercent(item.expenseCents, totalExpenseCents)}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <Button asChild className="w-full md:w-auto">
          <Link href="/transactions" className="gap-2">
            <PlusIcon className="size-4" />
            Nova transação
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full md:w-auto">
          <Link href="/categories" className="gap-2">
            <TagsIcon className="size-4" />
            Criar categoria
          </Link>
        </Button>
      </div>
    </div>
  )
}