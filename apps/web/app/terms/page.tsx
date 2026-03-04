import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
    body: "Podemos limitar ou suspender contas em caso de abuso, risco de seguranca ou exigencia legal. Tambem podemos atualizar funcionalidades e estes termos; a versao publicada passa a valer na data indicada.",
  },
  {
    title: "Limites de responsabilidade",
    body: "O usuario continua responsavel por conferir saldos, impostos, vencimentos e demais obrigacoes antes de tomar decisoes financeiras.",
  },
] as const

export default function TermsPage() {
  return (
    <main className="min-h-svh bg-gradient-to-b from-background to-muted">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl items-start justify-center p-6 md:p-10">
        <div className="w-full space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Termos de Uso</CardTitle>
              <CardDescription>Versão mínima (Fase 1).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm leading-relaxed">
              <p className="text-xs text-muted-foreground">Vigencia: 2026-03-03</p>
              <p>
                Ao criar uma conta e usar o FinancePro, você concorda em utilizar o serviço de
                boa-fé e em manter suas credenciais em segurança.
              </p>
              <p>
                O FinancePro é uma ferramenta de organização financeira. Ele não oferece
                aconselhamento financeiro, contábil ou jurídico.
              </p>
              <p>
                Podemos atualizar estes termos para melhorar o produto e cumprir obrigações
                legais. Quando isso acontecer, a versão publicada nesta página passa a valer.
              </p>
              {sections.map((section) => (
                <section key={section.title} className="space-y-2">
                  <h2 className="font-semibold">{section.title}</h2>
                  <p>{section.body}</p>
                </section>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href="/register">Voltar</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/privacy">Ver Política de Privacidade</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
