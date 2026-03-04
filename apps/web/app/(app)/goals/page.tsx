import { EmptyState } from "@/components/ui/empty"
import { Page, PageHeader } from "@/components/ui/page"

export default function GoalsPage() {
  return (
    <Page>
      <PageHeader title="Metas" description="Objetivos e progresso" />
      <EmptyState
        title="Metas"
        description="Crie metas (ex: juntar X até a data Y) e acompanhe o progresso."
      />
    </Page>
  )
}