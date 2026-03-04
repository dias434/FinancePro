import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { backendUnavailable, safeReadBody } from "@/lib/api/server-errors"
import { backendFetch } from "@/lib/auth/backend"
import { AUTH_COOKIES } from "@/lib/auth/constants"

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)

  let res: Response
  try {
    res = await backendFetch(`/transactions/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    return backendUnavailable(error)
  }

  const data = await safeReadBody(res)
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let res: Response
  try {
    res = await backendFetch(`/transactions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (error) {
    return backendUnavailable(error)
  }

  const data = await safeReadBody(res)
  return NextResponse.json(data, { status: res.status })
}
