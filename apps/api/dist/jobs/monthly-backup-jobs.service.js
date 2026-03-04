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
var MonthlyBackupJobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonthlyBackupJobsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const imports_service_1 = require("../imports/imports.service");
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
let MonthlyBackupJobsService = MonthlyBackupJobsService_1 = class MonthlyBackupJobsService {
    imports;
    config;
    logger = new common_1.Logger(MonthlyBackupJobsService_1.name);
    timer = null;
    jobsEnabled;
    intervalMinutes;
    constructor(imports, config) {
        this.imports = imports;
        this.config = config;
        this.jobsEnabled = parseBoolean(this.config.get("JOBS_ENABLED"), true);
        this.intervalMinutes = parsePositiveInt(this.config.get("JOBS_MONTHLY_BACKUP_INTERVAL_MINUTES"), 720);
    }
    onModuleInit() {
        if (!this.jobsEnabled) {
            this.logger.log("Backup mensal automatico desativado (JOBS_ENABLED=false).");
            return;
        }
        this.logger.log(`Backup mensal automatico ativado: intervalo=${this.intervalMinutes}m`);
        void this.runBackups("startup");
        this.timer = setInterval(() => {
            void this.runBackups("interval");
        }, this.intervalMinutes * 60_000);
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async runBackups(source) {
        try {
            const result = await this.imports.runAutomaticMonthlyBackups();
            if (source === "startup" || result.created > 0) {
                this.logger.log(`[monthly-backup/${source}] mes=${result.monthKey} usuarios=${result.users} criados=${result.created} ignorados=${result.skipped}`);
            }
        }
        catch (error) {
            this.logger.error(`[monthly-backup/${source}] erro ao gerar backups mensais`, error instanceof Error ? error.stack : undefined);
        }
    }
};
exports.MonthlyBackupJobsService = MonthlyBackupJobsService;
exports.MonthlyBackupJobsService = MonthlyBackupJobsService = MonthlyBackupJobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(imports_service_1.ImportsService)),
    __param(1, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [imports_service_1.ImportsService,
        config_1.ConfigService])
], MonthlyBackupJobsService);
