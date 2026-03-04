import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { AUTH_COOKIES } from "@/lib/auth/constants"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/accounts",
  "/transactions",
  "/categories",
  "/budgets",
  "/goals",
  "/settings",
]

const AUTH_ROUTES = ["/login", "/register"]

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))

  const hasSession = Boolean(req.cookies.get(AUTH_COOKIES.refresh)?.value)

  if (pathname === "/") {
    const url = req.nextUrl.clone()
    url.pathname = hasSession ? "/dashboard" : "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon.png).*)",
  ],
}
