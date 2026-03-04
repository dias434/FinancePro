import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="min-h-svh bg-linear-to-b from-background to-muted">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">FinancePro</h1>
            <p className="text-muted-foreground">
              Controle financeiro premium.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">Abrir app</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Offline</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Registra e consulta sem internet.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sync</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Sincronização com Nest + Prisma + PostgreSQL.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Multi-dispositivo</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Conflitos resolvidos por regra simples (fase 2).
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
