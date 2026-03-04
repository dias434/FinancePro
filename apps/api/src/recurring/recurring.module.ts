import { Module } from "@nestjs/common"

import { PrismaModule } from "../prisma/prisma.module"
import { RecurringController } from "./recurring.controller"
import { RecurringService } from "./recurring.service"

@Module({
  imports: [PrismaModule],
  controllers: [RecurringController],
  providers: [RecurringService],
  exports: [RecurringService],
})
export class RecurringModule {}
