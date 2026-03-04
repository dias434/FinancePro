"use client"

import { notify } from "@/lib/notify"

export type AuthUser = {
  id: string
  email: string
  name?: string | null
}

export async function login(input: { email: string; password: string }) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Falha ao entrar")
  }

  return (await res.json()) as { user: AuthUser }
}

export async function register(input: {
  email: string
  password: string
  name?: string
}) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Falha ao cadastrar")
  }

  return (await res.json()) as { user: AuthUser }
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => null)
  notify.info("Sessão encerrada")
}

export async function me(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" })
  if (res.status === 401) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST" })
    if (!refreshed.ok) return null

    const retry = await fetch("/api/auth/me", { cache: "no-store" })
    if (!retry.ok) return null
    return (await retry.json()) as AuthUser
  }
  if (!res.ok) return null
  return (await res.json()) as AuthUser
}