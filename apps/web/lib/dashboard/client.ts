import { apiFetch } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"

export type DashboardRange = "month" | "year"

export type DashboardSummary = {
  range: DashboardRange
  start: string
  end: string
  balanceCents: number
  incomeCents: number
  expenseCents: number
  netCents: number
  series: Array<{ label: string; netCents: number }>
  byCategory: Array<{
    categoryId: string | null
    categoryName: string
    expenseCents: number
  }>
}

export async function getDashboardSummary(input: {
  range: DashboardRange
  accountId?: string
  year?: number
  month?: number
}): Promise<DashboardSummary> {
  const params = new URLSearchParams()
  params.set("range", input.range)
  if (input.accountId) params.set("accountId", input.accountId)
  if (input.year) params.set("year", String(input.year))
  if (input.month) params.set("month", String(input.month))

  const path = `/api/dashboard/summary?${params.toString()}`

  try {
    return await apiFetch<DashboardSummary>(path, { cache: "no-store" })
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      const refreshed = await fetch("/api/auth/refresh", { method: "POST" })
      if (!refreshed.ok) throw error
      return await apiFetch<DashboardSummary>(path, { cache: "no-store" })
    }
    throw error
  }
}

