import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"

import { AccessGuard } from "../auth/guards/access.guard"
import { AlertListQueryDto } from "./dto/alert-list.query"
import { DeactivatePushDeviceDto } from "./dto/deactivate-push-device.dto"
import { RegisterPushDeviceDto } from "./dto/register-push-device.dto"
import { AlertsService } from "./alerts.service"
import { PushNotificationsService } from "./push-notifications.service"

@Controller("alerts")
@UseGuards(AccessGuard)
export class AlertsController {
  constructor(
    @Inject(AlertsService) private readonly alerts: AlertsService,
    @Inject(PushNotificationsService) private readonly pushNotifications: PushNotificationsService,
  ) {}

  @Get()
  list(@Req() req: any, @Query() query: AlertListQueryDto) {
    return this.alerts.list(req.user.sub, {
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      type: query.type,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })
  }

  @Patch("read-all")
  readAll(@Req() req: any) {
    return this.alerts.readAll(req.user.sub)
  }

  @Post("push-devices")
  registerPushDevice(@Req() req: any, @Body() body: RegisterPushDeviceDto) {
    return this.pushNotifications.registerDevice(req.user.sub, body)
  }

  @Post("push-devices/deactivate")
  deactivatePushDevice(@Req() req: any, @Body() body: DeactivatePushDeviceDto) {
    return this.pushNotifications.deactivateDevice(req.user.sub, body.token)
  }

  @Patch(":id/read")
  markRead(@Req() req: any, @Param("id") id: string) {
    return this.alerts.markRead(req.user.sub, id)
  }

  @Patch(":id/unread")
  markUnread(@Req() req: any, @Param("id") id: string) {
    return this.alerts.markUnread(req.user.sub, id)
  }

  @Patch(":id/resolve")
  resolve(@Req() req: any, @Param("id") id: string) {
    return this.alerts.resolve(req.user.sub, id)
  }
}
