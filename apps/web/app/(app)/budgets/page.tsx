import { EmptyState } from "@/components/ui/empty"
import { Page, PageHeader } from "@/components/ui/page"

export default function BudgetsPage() {
  return (
    <Page>
      <PageHeader title="Orçamentos" description="Limites por categoria" />
      <EmptyState
        title="Orçamentos"
        description="Defina limites mensais por categoria e acompanhe o consumido."
      />
    </Page>
  )
}