import { Module } from "@nestjs/common"

import { PrismaModule } from "../prisma/prisma.module"
import { AlertsController } from "./alerts.controller"
import { AlertsService } from "./alerts.service"
import { PushNotificationsService } from "./push-notifications.service"

@Module({
  imports: [PrismaModule],
  controllers: [AlertsController],
  providers: [AlertsService, PushNotificationsService],
  exports: [PushNotificationsService],
})
export class AlertsModule {}
