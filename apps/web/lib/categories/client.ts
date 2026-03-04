import { apiFetch } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"

export type CategoryType = "INCOME" | "EXPENSE"

export type CategoryListItem = {
  id: string
  name: string
  type: CategoryType
  icon?: string
  color?: string
  createdAt: string
  updatedAt: string
}

export type CategoryListResponse = {
  page: number
  pageSize: number
  total: number
  items: CategoryListItem[]
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

export async function listCategories(input: {
  q?: string
  type?: CategoryType
  page?: number
  pageSize?: number
  sortBy?: "name" | "createdAt"
  sortDir?: "asc" | "desc"
}): Promise<CategoryListResponse> {
  const params = new URLSearchParams()
  if (input.q) params.set("q", input.q)
  if (input.type) params.set("type", input.type)
  if (input.page) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  if (input.sortBy) params.set("sortBy", input.sortBy)
  if (input.sortDir) params.set("sortDir", input.sortDir)

  const path = `/api/categories${params.size ? `?${params.toString()}` : ""}`
  return await withRefresh(() =>
    apiFetch<CategoryListResponse>(path, { cache: "no-store" }),
  )
}

