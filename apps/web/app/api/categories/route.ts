import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { backendUnavailable, safeReadBody } from "@/lib/api/server-errors"
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

  let res: Response
  try {
    res = await backendFetch(`/categories${search ? `?${search}` : ""}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
  } catch (error) {
    return backendUnavailable(error)
  }

  const data = await safeReadBody(res)
  return NextResponse.json(data, { status: res.status })
}

