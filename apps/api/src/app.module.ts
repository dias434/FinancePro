import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_GUARD } from "@nestjs/core"

import { AuthModule } from "./auth/auth.module"
import { AccountsModule } from "./accounts/accounts.module"
import { CategoriesModule } from "./categories/categories.module"
import { DashboardModule } from "./dashboard/dashboard.module"
import { HealthController } from "./health/health.controller"
import { PrismaModule } from "./prisma/prisma.module"
import { DocsModule } from "./docs/docs.module"
import { TransactionsModule } from "./transactions/transactions.module"
import { BudgetsModule } from "./budgets/budgets.module"
import { GoalsModule } from "./goals/goals.module"
import { JobsModule } from "./jobs/jobs.module"
import { AlertsModule } from "./alerts/alerts.module"
import { ImportsModule } from "./imports/imports.module"
import { ObservabilityModule } from "./observability/observability.module"
import { RecurringModule } from "./recurring/recurring.module"
import { RateLimitGuard } from "./common/guards/rate-limit.guard"

@Module({
  imports: [
    ObservabilityModule,
    RecurringModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
    }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    GoalsModule,
    JobsModule,
    AlertsModule,
    ImportsModule,
    DocsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  controllers: [HealthController],
})
export class AppModule {}
