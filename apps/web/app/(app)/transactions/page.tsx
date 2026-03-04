import { Page, PageHeader } from "@/components/ui/page"
import { TransactionsScreen } from "@/components/transactions/transactions-screen"

export default function TransactionsPage() {
  return (
    <Page>
      <PageHeader
        title="Transações"
        description="Entradas, saídas e transferências"
      />
      <TransactionsScreen />
    </Page>
  )
}
