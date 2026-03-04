import { EmptyState } from "@/components/ui/empty"
import { Page, PageHeader } from "@/components/ui/page"

export default function SettingsPage() {
  return (
    <Page>
      <PageHeader title="Configurações" description="Preferências e manutenção" />
      <EmptyState
        title="Configurações"
        description="Preferências, exportação/importação e ajustes de conta."
      />
    </Page>
  )
}