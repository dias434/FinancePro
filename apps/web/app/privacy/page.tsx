import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
    body: "No web usamos cookies httpOnly para sessao e aplicamos controles tecnicos para reduzir risco de uso indevido. No mobile, o token pode ficar protegido no dispositivo para manter sua autenticacao.",
  },
  {
    title: "Compartilhamento e retencao",
    body: "Nao vendemos dados pessoais. O compartilhamento ocorre apenas com provedores de infraestrutura necessarios para operar o servico. Mantemos os dados enquanto a conta estiver ativa ou pelo periodo exigido para auditoria, seguranca e obrigacoes legais.",
  },
  {
    title: "Direitos do usuario",
    body: "Voce pode solicitar revisao, exportacao ou exclusao dos seus dados pelos canais oficiais de suporte publicados pelo produto.",
  },
] as const

export default function PrivacyPage() {
  return (
    <main className="min-h-svh bg-gradient-to-b from-background to-muted">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl items-start justify-center p-6 md:p-10">
        <div className="w-full space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Política de Privacidade</CardTitle>
              <CardDescription>Versão mínima (Fase 1).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm leading-relaxed">
              <p className="text-xs text-muted-foreground">Vigencia: 2026-03-03</p>
              <p>
                Coletamos apenas os dados necessários para autenticação e funcionamento do
                serviço (ex.: e-mail, nome opcional, senha em formato protegido/hasheado e tokens
                de sessão).
              </p>
              <p>
                No web, usamos cookies HTTP-only para manter sua sessão. Você pode encerrar a
                sessão a qualquer momento pelo botão de logout.
              </p>
              <p>
                Não vendemos seus dados. Podemos processar informações para fornecer o serviço,
                garantir segurança e melhorar a experiência do produto.
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
              <Link href="/terms">Ver Termos de Uso</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
