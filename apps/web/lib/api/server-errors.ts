import { NextResponse } from "next/server"

export function backendUnavailable(error: unknown) {
  console.error("backend unavailable:", error)
  return NextResponse.json(
    {
      message: "API indisponível. Confirme se a API está rodando em http://localhost:3001.",
      code: "BACKEND_UNAVAILABLE",
    },
    { status: 502 },
  )
}

export async function safeReadBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return await res.json().catch(() => null)
  }
  return await res.text().catch(() => null)
}

