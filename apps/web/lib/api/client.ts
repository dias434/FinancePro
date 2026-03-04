import { ApiError } from "@/lib/api/errors"
import { optionalEnv } from "@/lib/env"

function getBaseUrl() {
  return optionalEnv("NEXT_PUBLIC_API_URL") ?? ""
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { parseAs?: "json" | "text" } = {},
): Promise<T> {
  const baseUrl = getBaseUrl()
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`

  const parseAs = init.parseAs ?? "json"
  const { parseAs: _parseAs, ...requestInit } = init

  const res = await fetch(url, {
    ...requestInit,
    headers: {
      Accept: "application/json",
      ...(requestInit.body ? { "Content-Type": "application/json" } : null),
      ...(requestInit.headers ?? {}),
    },
    credentials: "include",
  })

  if (!res.ok) {
    let body: unknown = undefined
    try {
      body = await res.json()
    } catch {
      try {
        body = await res.text()
      } catch {
        body = undefined
      }
    }

    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as any).message)
        : `Request failed (${res.status})`

    const code =
      typeof body === "object" && body && "code" in body ? String((body as any).code) : undefined

    throw new ApiError(message, { status: res.status, code, details: body })
  }

  if (parseAs === "text") {
    return (await res.text()) as T
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

