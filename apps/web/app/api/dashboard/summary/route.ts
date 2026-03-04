import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { backendFetch } from "@/lib/auth/backend"
import { AUTH_COOKIES } from "@/lib/auth/constants"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const search = url.searchParams.toString()

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const res = await backendFetch(`/dashboard/summary${search ? `?${search}` : ""}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })

  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

