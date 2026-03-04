import { apiFetch } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER"

export type TransactionListItem = {
  id: string
  type: TransactionType
  occurredAt: string
  amountCents: number
  accountId: string
  categoryId: string | null
  transferAccountId: string | null
  description?: string
  createdAt: string
  updatedAt: string
  account?: { id: string; name: string; type: string; currency: string }
  transferAccount?: { id: string; name: string; type: string; currency: string }
  category?: { id: string; name: string; type: string; icon?: string; color?: string }
}

export type TransactionListResponse = {
  page: number
  pageSize: number
  total: number
  items: TransactionListItem[]
}

async function withRefresh<T>(fn: () => Promise<T>) {
  try {
    return await fn()
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      const refreshed = await fetch("/api/auth/refresh", { method: "POST" })
      if (!refreshed.ok) throw error
      return await fn()
    }
    throw error
  }
}

export async function listTransactions(input: {
  q?: string
  type?: TransactionType
  accountId?: string
  categoryId?: string
  from?: string
  to?: string
  sortBy?: "occurredAt" | "amountCents" | "createdAt"
  sortDir?: "asc" | "desc"
  page?: number
  pageSize?: number
  limit?: number
}): Promise<TransactionListResponse> {
  const params = new URLSearchParams()
  if (input.q) params.set("q", input.q)
  if (input.type) params.set("type", input.type)
  if (input.accountId) params.set("accountId", input.accountId)
  if (input.categoryId) params.set("categoryId", input.categoryId)
  if (input.from) params.set("from", input.from)
  if (input.to) params.set("to", input.to)
  if (input.sortBy) params.set("sortBy", input.sortBy)
  if (input.sortDir) params.set("sortDir", input.sortDir)
  if (input.page) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  if (input.limit) params.set("limit", String(input.limit))

  const path = `/api/transactions${params.size ? `?${params.toString()}` : ""}`
  return await withRefresh(() =>
    apiFetch<TransactionListResponse>(path, { cache: "no-store" }),
  )
}

export async function createTransaction(input: {
  type: TransactionType
  occurredAt: string
  amountCents: number
  accountId: string
  categoryId?: string | null
  transferAccountId?: string | null
  description?: string
}): Promise<{ id: string }> {
  return await withRefresh(async () => {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.message ?? "Falha ao criar transação")
    return body as { id: string }
  })
}

export async function updateTransaction(
  id: string,
  input: Partial<{
    type: TransactionType
    occurredAt: string
    amountCents: number
    accountId: string
    categoryId: string | null
    transferAccountId: string | null
    description: string | null
  }>,
): Promise<{ id: string }> {
  return await withRefresh(async () => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.message ?? "Falha ao atualizar transação")
    return body as { id: string }
  })
}

export async function deleteTransaction(id: string): Promise<void> {
  await withRefresh(async () => {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.message ?? "Falha ao remover transação")
  })
}

