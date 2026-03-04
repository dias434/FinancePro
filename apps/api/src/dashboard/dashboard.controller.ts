import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common"

import { AccessGuard } from "../auth/guards/access.guard"
import { DashboardAdvancedQueryDto } from "./dto/dashboard-advanced.query"
import { DashboardSummaryQueryDto } from "./dto/dashboard-summary.query"
import { DashboardService } from "./dashboard.service"

@Controller("dashboard")
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  @Get("summary")
  @UseGuards(AccessGuard)
  summary(@Req() req: any, @Query() query: DashboardSummaryQueryDto) {
    return this.dashboard.getSummary({
      userId: req.user.sub,
      range: query.range,
      year: query.year,
      month: query.month,
      accountId: query.accountId,
      baseCurrency: query.baseCurrency,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })
  }

  @Get("advanced")
  @UseGuards(AccessGuard)
  advanced(@Req() req: any, @Query() query: DashboardAdvancedQueryDto) {
    return this.dashboard.getAdvancedReport({
      userId: req.user.sub,
      baseCurrency: query.baseCurrency,
    })
  }
}
