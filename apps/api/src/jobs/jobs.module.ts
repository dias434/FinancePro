import { Module } from "@nestjs/common"

import { AlertsModule } from "../alerts/alerts.module"
import { ImportsModule } from "../imports/imports.module"
import { RecurringModule } from "../recurring/recurring.module"
import { BudgetGoalJobsService } from "./budget-goal-jobs.service"
import { MonthlyBackupJobsService } from "./monthly-backup-jobs.service"
import { RecurringJobsService } from "./recurring-jobs.service"

@Module({
  imports: [RecurringModule, ImportsModule, AlertsModule],
  providers: [BudgetGoalJobsService, MonthlyBackupJobsService, RecurringJobsService],
})
export class JobsModule {}
