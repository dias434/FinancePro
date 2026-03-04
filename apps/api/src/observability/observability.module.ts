import { Module } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { PrismaModule } from "../prisma/prisma.module"
import { MetricsService } from "./metrics.service"
import { ObservabilityInterceptor } from "./observability.interceptor"
import { OpsController } from "./ops.controller"

@Module({
  imports: [PrismaModule],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ObservabilityInterceptor,
    },
  ],
  controllers: [OpsController],
  exports: [MetricsService],
})
export class ObservabilityModule {}
