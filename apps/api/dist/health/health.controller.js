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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let HealthController = class HealthController {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    health() {
        return { ok: true };
    }
    live() {
        return { ok: true, status: "alive" };
    }
    async ready() {
        const checks = [];
        let overall = "ok";
        const dbStart = Date.now();
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            checks.push({
                name: "database",
                status: "ok",
                latencyMs: Date.now() - dbStart,
            });
        }
        catch (err) {
            checks.push({
                name: "database",
                status: "down",
                latencyMs: Date.now() - dbStart,
                message: err instanceof Error ? err.message : "Unknown error",
            });
            overall = "down";
        }
        const jobsEnabled = String(this.config.get("JOBS_ENABLED") ?? "true").toLowerCase();
        const jobsOk = jobsEnabled === "true" || jobsEnabled === "1";
        checks.push({
            name: "jobs",
            status: jobsOk ? "ok" : "degraded",
            message: jobsOk ? "Cron jobs ativos" : "Jobs desativados (JOBS_ENABLED=false)",
        });
        if (!jobsOk && overall === "ok")
            overall = "degraded";
        return {
            ok: overall === "ok",
            status: overall,
            checks,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "health", null);
__decorate([
    (0, common_1.Get)("live"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "live", null);
__decorate([
    (0, common_1.Get)("ready"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)("health"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], HealthController);
