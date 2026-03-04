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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const pagination_query_1 = require("../common/dto/pagination.query");
const prisma_service_1 = require("../prisma/prisma.service");
function toIso(date) {
    return date.toISOString();
}
let AlertsService = class AlertsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    toOutput(alert) {
        return {
            id: alert.id,
            type: alert.type,
            status: alert.status,
            sourceId: alert.sourceId,
            title: alert.title,
            message: alert.message,
            payload: alert.payload ?? undefined,
            firstTriggeredAt: toIso(alert.firstTriggeredAt),
            lastTriggeredAt: toIso(alert.lastTriggeredAt),
            readAt: alert.readAt ? toIso(alert.readAt) : null,
            resolvedAt: alert.resolvedAt ? toIso(alert.resolvedAt) : null,
            createdAt: toIso(alert.createdAt),
            updatedAt: toIso(alert.updatedAt),
        };
    }
    async list(userId, input) {
        const { skip, take } = (0, pagination_query_1.getSkipTake)({
            page: input.page,
            pageSize: input.pageSize,
            defaultPage: 1,
            defaultPageSize: 50,
            maxPageSize: 200,
        });
        const where = {
            userId,
            ...(input.status ? { status: input.status } : null),
            ...(input.type ? { type: input.type } : null),
        };
        const sortBy = input.sortBy ?? "lastTriggeredAt";
        const sortDir = input.sortDir ?? "desc";
        const [total, items] = await this.prisma.$transaction([
            this.prisma.systemAlert.count({ where }),
            this.prisma.systemAlert.findMany({
                where,
                orderBy: { [sortBy]: sortDir },
                skip,
                take,
            }),
        ]);
        return {
            page: Math.floor(skip / take) + 1,
            pageSize: take,
            total,
            items: items.map((item) => this.toOutput(item)),
        };
    }
    async markRead(userId, id) {
        const existing = await this.prisma.systemAlert.findFirst({
            where: { id, userId },
        });
        if (!existing)
            throw new common_1.NotFoundException("Alert not found");
        const now = new Date();
        const updated = await this.prisma.systemAlert.update({
            where: { id },
            data: {
                status: existing.status === "ACTIVE" ? client_1.SystemAlertStatus.READ : existing.status,
                readAt: existing.readAt ?? now,
            },
        });
        return this.toOutput(updated);
    }
    async markUnread(userId, id) {
        const existing = await this.prisma.systemAlert.findFirst({
            where: { id, userId },
        });
        if (!existing)
            throw new common_1.NotFoundException("Alert not found");
        if (existing.status === "RESOLVED") {
            return this.toOutput(existing);
        }
        const updated = await this.prisma.systemAlert.update({
            where: { id },
            data: {
                status: client_1.SystemAlertStatus.ACTIVE,
                readAt: null,
            },
        });
        return this.toOutput(updated);
    }
    async resolve(userId, id) {
        const existing = await this.prisma.systemAlert.findFirst({
            where: { id, userId },
        });
        if (!existing)
            throw new common_1.NotFoundException("Alert not found");
        if (existing.status === "RESOLVED") {
            return this.toOutput(existing);
        }
        const updated = await this.prisma.systemAlert.update({
            where: { id },
            data: {
                status: client_1.SystemAlertStatus.RESOLVED,
                resolvedAt: new Date(),
            },
        });
        return this.toOutput(updated);
    }
    async readAll(userId) {
        const now = new Date();
        const result = await this.prisma.systemAlert.updateMany({
            where: { userId, status: client_1.SystemAlertStatus.ACTIVE },
            data: { status: client_1.SystemAlertStatus.READ, readAt: now },
        });
        return { ok: true, updated: result.count };
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AlertsService);
