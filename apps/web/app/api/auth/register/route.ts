import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"

import { backendFetch } from "@/lib/auth/backend"
import {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  AUTH_COOKIES,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/auth/constants"
import { backendUnavailable, safeReadBody } from "@/lib/api/server-errors"

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  }

  let res: Response
  try {
    res = await backendFetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    })
  } catch (error) {
    return backendUnavailable(error)
  }

  const data = await safeReadBody(res)
  if (!res.ok) {
    return NextResponse.json(
      {
        message:
          typeof data === "object" && data && "message" in data
            ? String((data as any).message)
            : "Falha ao cadastrar",
        ...(process.env.NODE_ENV !== "production" &&
        typeof data === "object" &&
        data &&
        "code" in data
          ? { code: String((data as any).code) }
          : null),
      },
      { status: res.status },
    )
  }

  if (!data || typeof data !== "object") {
    return NextResponse.json(
      { message: "Resposta inválida da API" },
      { status: 502 },
    )
  }

  const { accessToken, refreshToken, user } = data as any
  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { message: "Resposta inválida da API" },
      { status: 502 },
    )
  }

  const cookieStore = await cookies()
  const secure = process.env.NODE_ENV === "production"

  cookieStore.set(AUTH_COOKIES.access, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  })
  cookieStore.set(AUTH_COOKIES.refresh, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  })

  return NextResponse.json({ user })
}
