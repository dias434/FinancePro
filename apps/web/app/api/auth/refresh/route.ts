import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { backendFetch } from "@/lib/auth/backend"
import {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  AUTH_COOKIES,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/auth/constants"
import { backendUnavailable, safeReadBody } from "@/lib/api/server-errors"

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value
  if (!refreshToken) {
    return NextResponse.json({ message: "Sem sessão" }, { status: 401 })
  }

  let res: Response
  try {
    res = await backendFetch("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
  } catch (error) {
    cookieStore.delete(AUTH_COOKIES.access)
    cookieStore.delete(AUTH_COOKIES.refresh)
    return backendUnavailable(error)
  }

  const data = await safeReadBody(res)
  if (!res.ok) {
    cookieStore.delete(AUTH_COOKIES.access)
    cookieStore.delete(AUTH_COOKIES.refresh)
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 })
  }

  if (!data || typeof data !== "object") {
    cookieStore.delete(AUTH_COOKIES.access)
    cookieStore.delete(AUTH_COOKIES.refresh)
    return NextResponse.json({ message: "Resposta inválida da API" }, { status: 502 })
  }

  const { accessToken, refreshToken: newRefreshToken } = data as any
  if (!accessToken || !newRefreshToken) {
    cookieStore.delete(AUTH_COOKIES.access)
    cookieStore.delete(AUTH_COOKIES.refresh)
    return NextResponse.json({ message: "Resposta inválida da API" }, { status: 502 })
  }

  const secure = process.env.NODE_ENV === "production"
  cookieStore.set(AUTH_COOKIES.access, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  })
  cookieStore.set(AUTH_COOKIES.refresh, newRefreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  })

  return NextResponse.json({ ok: true })
}
