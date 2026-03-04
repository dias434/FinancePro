import { CanActivate, ExecutionContext, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtService } from "@nestjs/jwt"

type RateBucket = {
  windowStartMs: number
  count: number
}

type JwtPayload = {
  sub?: string
}

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const normalized = Math.trunc(parsed)
  return normalized > 0 ? normalized : fallback
}

function normalizeIp(raw: string | null | undefined) {
  const value = (raw ?? "").trim()
  if (!value) return "unknown"

  if (value === "::1") return "127.0.0.1"
  if (value.startsWith("::ffff:")) return value.slice("::ffff:".length)
  return value
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly ipWindowMs: number
  private readonly ipMaxRequests: number

  private readonly userWindowMs: number
  private readonly userMaxRequests: number

  private readonly authIpWindowMs: number
  private readonly authIpMaxRequests: number

  private readonly skippedPathPrefixes = ["/health", "/docs", "/openapi.json"]

  private readonly ipBuckets = new Map<string, RateBucket>()
  private readonly userBuckets = new Map<string, RateBucket>()
  private readonly authIpBuckets = new Map<string, RateBucket>()
  private requestCount = 0

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {
    this.ipWindowMs = toPositiveInt(this.config.get("RATE_LIMIT_IP_WINDOW_MS"), 60_000)
    this.ipMaxRequests = toPositiveInt(this.config.get("RATE_LIMIT_IP_MAX_REQUESTS"), 120)

    this.userWindowMs = toPositiveInt(this.config.get("RATE_LIMIT_USER_WINDOW_MS"), 60_000)
    this.userMaxRequests = toPositiveInt(this.config.get("RATE_LIMIT_USER_MAX_REQUESTS"), 240)

    this.authIpWindowMs = toPositiveInt(this.config.get("RATE_LIMIT_AUTH_IP_WINDOW_MS"), 60_000)
    this.authIpMaxRequests = toPositiveInt(this.config.get("RATE_LIMIT_AUTH_IP_MAX_REQUESTS"), 30)
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp()
    const request = http.getRequest<any>()
    const response = http.getResponse<any>()

    const path = this.getPath(request)
    if (this.shouldSkip(path)) return true

    const now = Date.now()
    this.cleanupStaleBuckets(now)

    const ip = this.extractClientIp(request)
    const userId = this.extractUserId(request)

    if (path.startsWith("/auth/")) {
      const authState = this.consumeBucket(this.authIpBuckets, `auth-ip:${ip}`, this.authIpWindowMs, now)
      this.setRateHeaders(response, "auth-ip", this.authIpMaxRequests, this.authIpWindowMs, authState)

      if (authState.count > this.authIpMaxRequests) {
        this.setRetryAfter(response, authState.windowStartMs + this.authIpWindowMs - now)
        throw new HttpException(
          {
            code: "RATE_LIMIT_AUTH_IP_EXCEEDED",
            message: "Too many authentication requests from this IP",
          },
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
    }

    const ipState = this.consumeBucket(this.ipBuckets, `ip:${ip}`, this.ipWindowMs, now)
    this.setRateHeaders(response, "ip", this.ipMaxRequests, this.ipWindowMs, ipState)
    if (ipState.count > this.ipMaxRequests) {
      this.setRetryAfter(response, ipState.windowStartMs + this.ipWindowMs - now)
      throw new HttpException(
        {
          code: "RATE_LIMIT_IP_EXCEEDED",
          message: "Too many requests from this IP",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    if (userId) {
      const userState = this.consumeBucket(this.userBuckets, `user:${userId}`, this.userWindowMs, now)
      this.setRateHeaders(response, "user", this.userMaxRequests, this.userWindowMs, userState)
      if (userState.count > this.userMaxRequests) {
        this.setRetryAfter(response, userState.windowStartMs + this.userWindowMs - now)
        throw new HttpException(
          {
            code: "RATE_LIMIT_USER_EXCEEDED",
            message: "Too many requests for this authenticated user",
          },
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
    }

    return true
  }

  private shouldSkip(path: string) {
    return this.skippedPathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  }

  private getPath(request: any) {
    if (typeof request?.path === "string" && request.path.trim()) return request.path
    if (typeof request?.url === "string" && request.url.trim()) {
      const [path] = request.url.split("?")
      return path || "/"
    }
    return "/"
  }

  private extractClientIp(request: any) {
    const forwardedFor = request?.headers?.["x-forwarded-for"]
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return normalizeIp(String(forwardedFor[0]).split(",")[0])
    }
    if (typeof forwardedFor === "string" && forwardedFor.trim()) {
      return normalizeIp(forwardedFor.split(",")[0])
    }

    const realIp = request?.headers?.["x-real-ip"]
    if (typeof realIp === "string" && realIp.trim()) return normalizeIp(realIp)

    if (typeof request?.ip === "string" && request.ip.trim()) return normalizeIp(request.ip)
    if (typeof request?.socket?.remoteAddress === "string" && request.socket.remoteAddress.trim()) {
      return normalizeIp(request.socket.remoteAddress)
    }

    return "unknown"
  }

  private extractUserId(request: any): string | null {
    const header = request?.headers?.authorization
    if (typeof header !== "string" || !header.startsWith("Bearer ")) return null

    const accessSecret = this.config.get<string>("JWT_ACCESS_SECRET")
    if (!accessSecret) return null

    const token = header.slice("Bearer ".length).trim()
    if (!token) return null

    try {
      const payload = this.jwt.verify<JwtPayload>(token, { secret: accessSecret })
      const sub = typeof payload?.sub === "string" ? payload.sub.trim() : ""
      return sub || null
    } catch {
      return null
    }
  }

  private consumeBucket(map: Map<string, RateBucket>, key: string, windowMs: number, now: number) {
    const existing = map.get(key)
    if (!existing || now - existing.windowStartMs >= windowMs) {
      const next = { windowStartMs: now, count: 1 }
      map.set(key, next)
      return next
    }

    existing.count += 1
    return existing
  }

  private setRateHeaders(
    response: any,
    scope: "ip" | "user" | "auth-ip",
    limit: number,
    windowMs: number,
    state: RateBucket,
  ) {
    if (!response || typeof response.setHeader !== "function") return

    const suffix = scope === "auth-ip" ? "Auth-Ip" : scope === "user" ? "User" : "Ip"
    const remaining = Math.max(0, limit - state.count)
    const resetEpochSeconds = Math.ceil((state.windowStartMs + windowMs) / 1000)

    response.setHeader(`X-RateLimit-${suffix}-Limit`, String(limit))
    response.setHeader(`X-RateLimit-${suffix}-Remaining`, String(remaining))
    response.setHeader(`X-RateLimit-${suffix}-Reset`, String(resetEpochSeconds))
  }

  private setRetryAfter(response: any, msUntilReset: number) {
    if (!response || typeof response.setHeader !== "function") return
    const seconds = Math.max(1, Math.ceil(msUntilReset / 1000))
    response.setHeader("Retry-After", String(seconds))
  }

  private cleanupStaleBuckets(now: number) {
    this.requestCount += 1
    if (this.requestCount % 200 !== 0) return

    this.cleanupMap(this.ipBuckets, this.ipWindowMs, now)
    this.cleanupMap(this.userBuckets, this.userWindowMs, now)
    this.cleanupMap(this.authIpBuckets, this.authIpWindowMs, now)
  }

  private cleanupMap(map: Map<string, RateBucket>, windowMs: number, now: number) {
    for (const [key, value] of map.entries()) {
      if (now - value.windowStartMs >= windowMs * 2) {
        map.delete(key)
      }
    }
  }
}
