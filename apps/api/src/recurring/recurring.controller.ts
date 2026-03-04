import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"

import { AccessGuard } from "../auth/guards/access.guard"
import { CreateRecurringDto } from "./dto/create-recurring.dto"
import { UpdateRecurringDto } from "./dto/update-recurring.dto"
import { RecurringService } from "./recurring.service"

@Controller("recurring")
@UseGuards(AccessGuard)
export class RecurringController {
  constructor(@Inject(RecurringService) private readonly recurring: RecurringService) {}

  @Get()
  list(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: "ACTIVE" | "PAUSED" | "CANCELLED",
  ) {
    return this.recurring.list(req.user.sub, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
    })
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateRecurringDto) {
    return this.recurring.create(req.user.sub, dto)
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateRecurringDto) {
    return this.recurring.update(req.user.sub, id, dto)
  }

  @Post(":id/pause")
  pause(@Req() req: any, @Param("id") id: string) {
    return this.recurring.pause(req.user.sub, id)
  }

  @Post(":id/resume")
  resume(@Req() req: any, @Param("id") id: string) {
    return this.recurring.resume(req.user.sub, id)
  }

  @Post(":id/cancel")
  cancel(@Req() req: any, @Param("id") id: string) {
    return this.recurring.cancel(req.user.sub, id)
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.recurring.remove(req.user.sub, id)
  }
}
