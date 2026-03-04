import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"

import { AccessGuard } from "../auth/guards/access.guard"
import { GoalsService } from "./goals.service"
import { CreateGoalDto } from "./dto/create-goal.dto"
import { GoalListQueryDto } from "./dto/goal-list.query"
import { UpdateGoalDto } from "./dto/update-goal.dto"

@Controller("goals")
@UseGuards(AccessGuard)
export class GoalsController {
  constructor(@Inject(GoalsService) private readonly goals: GoalsService) {}

  @Get()
  list(@Req() req: any, @Query() query: GoalListQueryDto) {
    return this.goals.list(req.user.sub, {
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateGoalDto) {
    return this.goals.create(req.user.sub, dto)
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateGoalDto) {
    return this.goals.update(req.user.sub, id, dto)
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.goals.remove(req.user.sub, id)
  }
}