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
exports.RecurringService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const pagination_query_1 = require("../common/dto/pagination.query");
const prisma_service_1 = require("../prisma/prisma.service");
function toIso(date) {
    return date.toISOString();
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}
function addYears(date, years) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
}
function nextRunFrom(start, lastRun, frequency) {
    switch (frequency) {
        case "WEEKLY":
            return addDays(lastRun, 7);
        case "MONTHLY":
            return addMonths(lastRun, 1);
        case "ANNUAL":
            return addYears(lastRun, 1);
        default:
            return addMonths(lastRun, 1);
    }
}
let RecurringService = class RecurringService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId, input) {
        const { skip, take } = (0, pagination_query_1.getSkipTake)({
            page: input.page,
            pageSize: input.pageSize,
            defaultPage: 1,
            defaultPageSize: 20,
            maxPageSize: 100,
        });
        const where = {
            userId,
            ...(input.status ? { status: input.status } : null),
        };
        const [total, items] = await this.prisma.$transaction([
            this.prisma.recurringTransaction.count({ where }),
            this.prisma.recurringTransaction.findMany({
                where,
                orderBy: { nextRunAt: "asc" },
                skip,
                take,
                include: {
                    account: { select: { id: true, name: true, type: true } },
                    category: { select: { id: true, name: true, type: true } },
                },
            }),
        ]);
        return {
            page: Math.floor(skip / take) + 1,
            pageSize: take,
            total,
            items: items.map((r) => ({
                id: r.id,
                accountId: r.accountId,
                categoryId: r.categoryId ?? null,
                type: r.type,
                amountCents: r.amountCents,
                description: r.description ?? undefined,
                frequency: r.frequency,
                startDate: toIso(r.startDate),
                endDate: r.endDate ? toIso(r.endDate) : null,
                nextRunAt: toIso(r.nextRunAt),
                status: r.status,
                account: r.account,
                category: r.category ?? undefined,
                createdAt: toIso(r.createdAt),
            })),
        };
    }
    async create(userId, input) {
        await this.assertAccountOwned(userId, input.accountId);
        if (input.categoryId) {
            await this.assertCategoryOwned(userId, input.categoryId);
        }
        const startDate = new Date(input.startDate);
        const nextRunAt = new Date(startDate);
        if (input.endDate && new Date(input.endDate) < nextRunAt) {
            throw new common_1.BadRequestException({
                code: "RECURRING_END_BEFORE_START",
                message: "Data fim deve ser posterior à data início",
            });
        }
        try {
            const created = await this.prisma.recurringTransaction.create({
                data: {
                    userId,
                    accountId: input.accountId,
                    categoryId: input.categoryId ?? null,
                    type: input.type,
                    amountCents: input.amountCents,
                    description: input.description?.trim() || null,
                    frequency: input.frequency,
                    startDate,
                    endDate: input.endDate ?? null,
                    nextRunAt,
                    status: client_1.RecurringStatus.ACTIVE,
                },
            });
            return {
                id: created.id,
                accountId: created.accountId,
                categoryId: created.categoryId ?? null,
                type: created.type,
                amountCents: created.amountCents,
                description: created.description ?? undefined,
                frequency: created.frequency,
                startDate: toIso(created.startDate),
                endDate: created.endDate ? toIso(created.endDate) : null,
                nextRunAt: toIso(created.nextRunAt),
                status: created.status,
                createdAt: toIso(created.createdAt),
            };
        }
        catch (error) {
            const prismaCode = error?.code;
            if (prismaCode === "P2003") {
                throw new common_1.ConflictException({
                    code: "RECURRING_REFERENCE_INVALID",
                    message: "Conta ou categoria inválida",
                });
            }
            throw error;
        }
    }
    async update(userId, id, input) {
        const existing = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new common_1.NotFoundException({
                code: "RECURRING_NOT_FOUND",
                message: "Lançamento recorrente não encontrado",
            });
        }
        if (input.accountId)
            await this.assertAccountOwned(userId, input.accountId);
        if (input.categoryId)
            await this.assertCategoryOwned(userId, input.categoryId);
        const updated = await this.prisma.recurringTransaction.update({
            where: { id },
            data: {
                ...(input.accountId !== undefined ? { accountId: input.accountId } : null),
                ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : null),
                ...(input.type !== undefined ? { type: input.type } : null),
                ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : null),
                ...(input.description !== undefined ? { description: input.description?.trim() || null } : null),
                ...(input.frequency !== undefined ? { frequency: input.frequency } : null),
                ...(input.startDate !== undefined ? { startDate: input.startDate } : null),
                ...(input.endDate !== undefined ? { endDate: input.endDate } : null),
                ...(input.status !== undefined ? { status: input.status } : null),
            },
        });
        return {
            id: updated.id,
            accountId: updated.accountId,
            categoryId: updated.categoryId ?? null,
            type: updated.type,
            amountCents: updated.amountCents,
            description: updated.description ?? undefined,
            frequency: updated.frequency,
            startDate: toIso(updated.startDate),
            endDate: updated.endDate ? toIso(updated.endDate) : null,
            nextRunAt: toIso(updated.nextRunAt),
            status: updated.status,
            updatedAt: toIso(updated.updatedAt),
        };
    }
    async pause(userId, id) {
        return this.update(userId, id, { status: "PAUSED" });
    }
    async resume(userId, id) {
        return this.update(userId, id, { status: "ACTIVE" });
    }
    async cancel(userId, id) {
        return this.update(userId, id, { status: "CANCELLED" });
    }
    async remove(userId, id) {
        const existing = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new common_1.NotFoundException({
                code: "RECURRING_NOT_FOUND",
                message: "Lançamento recorrente não encontrado",
            });
        }
        await this.prisma.recurringTransaction.delete({ where: { id } });
        return { ok: true };
    }
    async processDueRecurring(userId) {
        const now = new Date();
        const where = {
            status: client_1.RecurringStatus.ACTIVE,
            nextRunAt: { lte: now },
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
            ...(userId ? { userId } : null),
        };
        const due = await this.prisma.recurringTransaction.findMany({ where });
        let processed = 0;
        for (const r of due) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    const occurredAt = new Date(r.nextRunAt);
                    await tx.transaction.create({
                        data: {
                            userId: r.userId,
                            accountId: r.accountId,
                            categoryId: r.categoryId,
                            type: r.type,
                            amountCents: r.amountCents,
                            occurredAt,
                            description: r.description,
                            recurringTransactionId: r.id,
                        },
                    });
                    const nextRun = nextRunFrom(r.startDate, occurredAt, r.frequency);
                    await tx.recurringTransaction.update({
                        where: { id: r.id },
                        data: { nextRunAt: nextRun, updatedAt: now },
                    });
                });
                processed++;
            }
            catch (err) {
                console.error(`[recurring] Failed to process ${r.id}:`, err);
            }
        }
        return { processed };
    }
    async assertAccountOwned(userId, accountId) {
        const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
        if (!account) {
            throw new common_1.NotFoundException({
                code: "ACCOUNT_NOT_FOUND",
                message: "Conta não encontrada",
            });
        }
    }
    async assertCategoryOwned(userId, categoryId) {
        const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
        if (!category) {
            throw new common_1.NotFoundException({
                code: "CATEGORY_NOT_FOUND",
                message: "Categoria não encontrada",
            });
        }
    }
};
exports.RecurringService = RecurringService;
exports.RecurringService = RecurringService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecurringService);
