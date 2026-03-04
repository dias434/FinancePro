import { EmptyState } from "@/components/ui/empty"
import { Page, PageHeader } from "@/components/ui/page"

export default function CategoriesPage() {
  return (
    <Page>
      <PageHeader title="Categorias" description="Organização e filtros" />
      <EmptyState
        title="Categorias"
        description="Organize suas transações por categoria e configure ícones/cores."
      />
    </Page>
  )
}