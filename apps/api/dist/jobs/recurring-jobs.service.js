"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RecurringJobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringJobsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const recurring_service_1 = require("../recurring/recurring.service");
function parseBoolean(value, fallback) {
    if (value === undefined || value === null || value === "")
        return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes")
        return true;
    if (normalized === "false" || normalized === "0" || normalized === "no")
        return false;
    return fallback;
}
function parsePositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    if (!Number.isInteger(parsed) || parsed <= 0)
        return fallback;
    return parsed;
}
let RecurringJobsService = RecurringJobsService_1 = class RecurringJobsService {
    recurring;
    config;
    logger = new common_1.Logger(RecurringJobsService_1.name);
    timer = null;
    jobsEnabled;
    intervalMinutes;
    constructor(recurring, config) {
        this.recurring = recurring;
        this.config = config;
        this.jobsEnabled = parseBoolean(this.config.get("JOBS_ENABLED"), true);
        this.intervalMinutes = parsePositiveInt(this.config.get("JOBS_RECURRING_INTERVAL_MINUTES"), 60);
    }
    onModuleInit() {
        if (!this.jobsEnabled) {
            this.logger.log("Jobs de recorrencia desativados (JOBS_ENABLED=false).");
            return;
        }
        this.logger.log(`Jobs de recorrencia ativados: intervalo=${this.intervalMinutes}m`);
        void this.runRecurring("startup");
        this.timer = setInterval(() => {
            void this.runRecurring("interval");
        }, this.intervalMinutes * 60_000);
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async runRecurring(source) {
        try {
            const { processed } = await this.recurring.processDueRecurring();
            if (processed > 0 || source === "startup") {
                this.logger.log(`[recurring/${source}] processados=${processed}`);
            }
        }
        catch (error) {
            this.logger.error(`[recurring/${source}] erro ao processar recorrentes`, error instanceof Error ? error.stack : undefined);
        }
    }
};
exports.RecurringJobsService = RecurringJobsService;
exports.RecurringJobsService = RecurringJobsService = RecurringJobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(recurring_service_1.RecurringService)),
    __param(1, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [recurring_service_1.RecurringService,
        config_1.ConfigService])
], RecurringJobsService);
