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
exports.OpsController = void 0;
const common_1 = require("@nestjs/common");
const metrics_service_1 = require("./metrics.service");
const prisma_service_1 = require("../prisma/prisma.service");
let OpsController = class OpsController {
    metrics;
    prisma;
    constructor(metrics, prisma) {
        this.metrics = metrics;
        this.prisma = prisma;
    }
    async getMetrics() {
        const [importsTotal, importsLast24h] = await Promise.all([
            this.prisma.importLog.count(),
            this.prisma.importLog.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);
        return this.metrics.getSnapshot(importsTotal, importsLast24h);
    }
    async dashboard() {
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [importsTotal, importsLast24h, recentImports] = await Promise.all([
            this.prisma.importLog.count(),
            this.prisma.importLog.count({
                where: { createdAt: { gte: cutoff24h } },
            }),
            this.prisma.importLog.findMany({
                take: 10,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    format: true,
                    status: true,
                    createdAt: true,
                    totalRows: true,
                    importedRows: true,
                    errorRows: true,
                },
            }),
        ]);
        const snapshot = this.metrics.getSnapshot(importsTotal, importsLast24h);
        const recentErrors = this.metrics.getRecentErrors();
        const topEndpoints = Object.entries(snapshot.endpoints)
            .map(([key, m]) => ({
            endpoint: key,
            totalRequests: m.totalRequests,
            errorCount: m.errorCount,
            avgLatencyMs: m.totalRequests > 0 ? Math.round(m.latencySumMs / m.totalRequests) : 0,
        }))
            .sort((a, b) => b.totalRequests - a.totalRequests)
            .slice(0, 20);
        return {
            uptimeSeconds: snapshot.uptimeSeconds,
            collectedAt: snapshot.collectedAt,
            imports: {
                total: importsTotal,
                last24h: importsLast24h,
                recent: recentImports,
            },
            requests: {
                topEndpoints,
                recentErrors,
            },
        };
    }
};
exports.OpsController = OpsController;
__decorate([
    (0, common_1.Get)("metrics"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpsController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)("dashboard"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpsController.prototype, "dashboard", null);
exports.OpsController = OpsController = __decorate([
    (0, common_1.Controller)("ops"),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService,
        prisma_service_1.PrismaService])
], OpsController);
