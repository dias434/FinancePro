import { apiFetch } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"

export type AccountType = "CASH" | "CHECKING" | "SAVINGS" | "CREDIT_CARD"

export type AccountListItem = {
  id: string
  name: string
  type: AccountType
  currency: "BRL"
  balanceCents: number
  createdAt: string
  updatedAt: string
}

export type AccountListResponse = {
  page: number
  pageSize: number
  total: number
  items: AccountListItem[]
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

export async function listAccounts(input: {
  q?: string
  page?: number
  pageSize?: number
  sortBy?: "name" | "createdAt"
  sortDir?: "asc" | "desc"
}): Promise<AccountListResponse> {
  const params = new URLSearchParams()
  if (input.q) params.set("q", input.q)
  if (input.page) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  if (input.sortBy) params.set("sortBy", input.sortBy)
  if (input.sortDir) params.set("sortDir", input.sortDir)

  const path = `/api/accounts${params.size ? `?${params.toString()}` : ""}`
  return await withRefresh(() =>
    apiFetch<AccountListResponse>(path, { cache: "no-store" }),
  )
}

export async function createAccount(input: {
  name: string
  type?: AccountType
  currency?: "BRL"
}): Promise<{ id: string }> {
  return await withRefresh(async () => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.message ?? "Falha ao criar conta")
    return body as { id: string }
  })
}

export async function updateAccount(
  id: string,
  input: { name?: string; type?: AccountType; currency?: "BRL" },
): Promise<{ id: string }> {
  return await withRefresh(async () => {
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.message ?? "Falha ao atualizar conta")
    return body as { id: string }
  })
}

export async function deleteAccount(id: string): Promise<void> {
  await withRefresh(async () => {
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" })
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.message ?? "Falha ao remover conta")
  })
}

