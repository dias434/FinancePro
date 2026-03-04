"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const alerts_module_1 = require("../alerts/alerts.module");
const imports_module_1 = require("../imports/imports.module");
const recurring_module_1 = require("../recurring/recurring.module");
const budget_goal_jobs_service_1 = require("./budget-goal-jobs.service");
const monthly_backup_jobs_service_1 = require("./monthly-backup-jobs.service");
const recurring_jobs_service_1 = require("./recurring-jobs.service");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [recurring_module_1.RecurringModule, imports_module_1.ImportsModule, alerts_module_1.AlertsModule],
        providers: [budget_goal_jobs_service_1.BudgetGoalJobsService, monthly_backup_jobs_service_1.MonthlyBackupJobsService, recurring_jobs_service_1.RecurringJobsService],
    })
], JobsModule);
