import { Controller, Get } from "@nestjs/common"

import { MetricsService } from "./metrics.service"
import { PrismaService } from "../prisma/prisma.service"

@Controller("ops")
export class OpsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("metrics")
  async getMetrics() {
    const [importsTotal, importsLast24h] = await Promise.all([
      this.prisma.importLog.count(),
      this.prisma.importLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    return this.metrics.getSnapshot(importsTotal, importsLast24h)
  }

  @Get("dashboard")
  async dashboard() {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [importsTotal, importsLast24h, recentImports] = await Promise.all([
      this.prisma.importLog.count(),
      this.prisma.importLog.count({
        where: { createdAt: { gte: cutoff24h } },
      }),
      this.prisma.importLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          format: true,
          status: true,
          createdAt: true,
          totalRows: true,
          importedRows: true,
          errorRows: true,
        },
      }),
    ])

    const snapshot = this.metrics.getSnapshot(importsTotal, importsLast24h)
    const recentErrors = this.metrics.getRecentErrors()

    const topEndpoints = Object.entries(snapshot.endpoints)
      .map(([key, m]) => ({
        endpoint: key,
        totalRequests: m.totalRequests,
        errorCount: m.errorCount,
        avgLatencyMs: m.totalRequests > 0 ? Math.round(m.latencySumMs / m.totalRequests) : 0,
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 20)

    return {
      uptimeSeconds: snapshot.uptimeSeconds,
      collectedAt: snapshot.collectedAt,
      imports: {
        total: importsTotal,
        last24h: importsLast24h,
        recent: recentImports,
      },
      requests: {
        topEndpoints,
        recentErrors,
      },
    }
  }
}
