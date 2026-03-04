import type React from "react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh bg-gradient-to-b from-background to-muted">
      <div className="mx-auto grid min-h-svh w-full max-w-6xl grid-cols-1 items-center gap-10 p-6 md:grid-cols-2 md:p-10">
        <aside className="hidden md:block">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <span className="text-sm font-bold tracking-wide">FP</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">FinancePro</h1>
                <p className="text-muted-foreground text-sm">
                  Controle financeiro premium.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Organize contas, categorias e transações com uma experiência rápida e consistente.
              </p>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
                  Autenticação segura com sessão persistente (cookies HTTP-only no web).
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
                  Dashboard com visão do mês/ano e gastos por categoria.
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
                  Web e Mobile com a mesma API (Nest + Prisma + PostgreSQL).
                </li>
              </ul>
            </div>
          </div>
        </aside>

        <div className="flex w-full justify-center md:justify-end">
          {children}
        </div>
      </div>
    </main>
  )
}
