import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"

import { AccessGuard } from "../auth/guards/access.guard"
import { BudgetsService } from "./budgets.service"
import { BudgetListQueryDto } from "./dto/budget-list.query"
import { CreateBudgetDto } from "./dto/create-budget.dto"
import { UpdateBudgetDto } from "./dto/update-budget.dto"

@Controller("budgets")
@UseGuards(AccessGuard)
export class BudgetsController {
  constructor(@Inject(BudgetsService) private readonly budgets: BudgetsService) {}

  @Get()
  list(@Req() req: any, @Query() query: BudgetListQueryDto) {
    return this.budgets.list(req.user.sub, {
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
      categoryId: query.categoryId,
      year: query.year,
      month: query.month,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateBudgetDto) {
    return this.budgets.create(req.user.sub, dto)
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgets.update(req.user.sub, id, dto)
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.budgets.remove(req.user.sub, id)
  }
}