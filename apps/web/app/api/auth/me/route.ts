import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { backendFetch } from "@/lib/auth/backend"
import { AUTH_COOKIES } from "@/lib/auth/constants"
import { backendUnavailable, safeReadBody } from "@/lib/api/server-errors"

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let res: Response
  try {
    res = await backendFetch("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
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
            : "Unauthorized",
      },
      { status: 401 },
    )
  }

  return NextResponse.json(data)
}
