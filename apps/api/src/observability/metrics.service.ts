import { Injectable } from "@nestjs/common"

export type EndpointMetrics = {
  totalRequests: number
  errorCount: number
  latencySumMs: number
  lastRequestAt: string | null
}

export type MetricsSnapshot = {
  endpoints: Record<string, EndpointMetrics>
  importsTotal: number
  importsLast24h: number
  uptimeSeconds: number
  collectedAt: string
}

const MAX_ENDPOINTS = 200
const MAX_RECENT_ERRORS = 50

function normalizePath(path: string): string {
  if (!path || path === "/") return path
  // Replace UUIDs and numeric IDs with placeholders for aggregation
  return path
    .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, "/:id")
    .replace(/\/[0-9a-fA-F-]{36}/g, "/:id")
    .replace(/\/\d+/g, "/:id")
}

@Injectable()
export class MetricsService {
  private readonly endpoints = new Map<string, EndpointMetrics>()
  private readonly recentErrors: Array<{
    path: string
    statusCode: number
    timestamp: string
    correlationId?: string
  }> = []
  private readonly startTime = Date.now()

  recordRequest(params: {
    method: string
    path: string
    statusCode: number
    durationMs: number
    correlationId?: string
  }): void {
    const key = `${params.method} ${normalizePath(params.path)}`
    const existing = this.endpoints.get(key)

    const metrics: EndpointMetrics = existing
      ? {
          totalRequests: existing.totalRequests + 1,
          errorCount: existing.errorCount + (params.statusCode >= 400 ? 1 : 0),
          latencySumMs: existing.latencySumMs + params.durationMs,
          lastRequestAt: new Date().toISOString(),
        }
      : {
          totalRequests: 1,
          errorCount: params.statusCode >= 400 ? 1 : 0,
          latencySumMs: params.durationMs,
          lastRequestAt: new Date().toISOString(),
        }

    this.endpoints.set(key, metrics)

    if (params.statusCode >= 400) {
      this.recentErrors.push({
        path: params.path,
        statusCode: params.statusCode,
        timestamp: new Date().toISOString(),
        correlationId: params.correlationId,
      })
      if (this.recentErrors.length > MAX_RECENT_ERRORS) {
        this.recentErrors.shift()
      }
    }

    if (this.endpoints.size > MAX_ENDPOINTS) {
      const entries = Array.from(this.endpoints.entries())
      entries.sort((a, b) => (b[1].lastRequestAt ?? "").localeCompare(a[1].lastRequestAt ?? ""))
      const toDelete = entries.slice(MAX_ENDPOINTS).map(([k]) => k)
      toDelete.forEach((k) => this.endpoints.delete(k))
    }
  }

  getSnapshot(importsTotal: number, importsLast24h: number): MetricsSnapshot {
    const endpoints: Record<string, EndpointMetrics> = {}
    for (const [key, val] of this.endpoints) {
      endpoints[key] = { ...val }
    }
    return {
      endpoints,
      importsTotal,
      importsLast24h,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      collectedAt: new Date().toISOString(),
    }
  }

  getRecentErrors(): typeof this.recentErrors {
    return [...this.recentErrors].reverse()
  }
}
