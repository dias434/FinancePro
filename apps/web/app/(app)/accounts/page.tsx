import { AccountsScreen } from "@/components/accounts/accounts-screen"
import { Page, PageHeader } from "@/components/ui/page"

export default function AccountsPage() {
  return (
    <Page>
      <PageHeader title="Contas" description="Carteiras, bancos e cartões" />
      <AccountsScreen />
    </Page>
  )
}
