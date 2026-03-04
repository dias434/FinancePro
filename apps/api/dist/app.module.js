"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const auth_module_1 = require("./auth/auth.module");
const accounts_module_1 = require("./accounts/accounts.module");
const categories_module_1 = require("./categories/categories.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const health_controller_1 = require("./health/health.controller");
const prisma_module_1 = require("./prisma/prisma.module");
const docs_module_1 = require("./docs/docs.module");
const transactions_module_1 = require("./transactions/transactions.module");
const budgets_module_1 = require("./budgets/budgets.module");
const goals_module_1 = require("./goals/goals.module");
const jobs_module_1 = require("./jobs/jobs.module");
const alerts_module_1 = require("./alerts/alerts.module");
const imports_module_1 = require("./imports/imports.module");
const observability_module_1 = require("./observability/observability.module");
const recurring_module_1 = require("./recurring/recurring.module");
const rate_limit_guard_1 = require("./common/guards/rate-limit.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            observability_module_1.ObservabilityModule,
            recurring_module_1.RecurringModule,
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [".env", ".env.local"],
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            dashboard_module_1.DashboardModule,
            accounts_module_1.AccountsModule,
            categories_module_1.CategoriesModule,
            transactions_module_1.TransactionsModule,
            budgets_module_1.BudgetsModule,
            goals_module_1.GoalsModule,
            jobs_module_1.JobsModule,
            alerts_module_1.AlertsModule,
            imports_module_1.ImportsModule,
            docs_module_1.DocsModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: rate_limit_guard_1.RateLimitGuard,
            },
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
