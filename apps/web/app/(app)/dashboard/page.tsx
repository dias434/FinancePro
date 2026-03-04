import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { Page, PageHeader } from "@/components/ui/page"

export default function DashboardPage() {
  return (
    <Page>
      <PageHeader title="Dashboard" description="Visão geral" />
      <DashboardOverview />
    </Page>
  )
}