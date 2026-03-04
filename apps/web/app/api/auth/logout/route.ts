import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { backendFetch } from "@/lib/auth/backend"
import { AUTH_COOKIES } from "@/lib/auth/constants"
import { backendUnavailable } from "@/lib/api/server-errors"

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value

  cookieStore.delete(AUTH_COOKIES.access)
  cookieStore.delete(AUTH_COOKIES.refresh)

  if (refreshToken) {
    try {
      await backendFetch("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
    } catch (error) {
      return backendUnavailable(error)
    }
  }

  return NextResponse.json({ ok: true })
}
