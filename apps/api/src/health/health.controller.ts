import { Controller, Get } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

import { PrismaService } from "../prisma/prisma.service"

type HealthCheck = {
  name: string
  status: "ok" | "degraded" | "down"
  latencyMs?: number
  message?: string
}

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  health() {
    return { ok: true }
  }

  @Get("live")
  live() {
    return { ok: true, status: "alive" }
  }

  @Get("ready")
  async ready() {
    const checks: HealthCheck[] = []
    let overall: "ok" | "degraded" | "down" = "ok"

    const dbStart = Date.now()
    try {
      await this.prisma.$queryRaw`SELECT 1`
      checks.push({
        name: "database",
        status: "ok",
        latencyMs: Date.now() - dbStart,
      })
    } catch (err) {
      checks.push({
        name: "database",
        status: "down",
        latencyMs: Date.now() - dbStart,
        message: err instanceof Error ? err.message : "Unknown error",
      })
      overall = "down"
    }

    const jobsEnabled = String(this.config.get("JOBS_ENABLED") ?? "true").toLowerCase()
    const jobsOk = jobsEnabled === "true" || jobsEnabled === "1"
    checks.push({
      name: "jobs",
      status: jobsOk ? "ok" : "degraded",
      message: jobsOk ? "Cron jobs ativos" : "Jobs desativados (JOBS_ENABLED=false)",
    })
    if (!jobsOk && overall === "ok") overall = "degraded"

    return {
      ok: overall === "ok",
      status: overall,
      checks,
      timestamp: new Date().toISOString(),
    }
  }
}
