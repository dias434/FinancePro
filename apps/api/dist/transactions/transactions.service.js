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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const pagination_query_1 = require("../common/dto/pagination.query");
const prisma_service_1 = require("../prisma/prisma.service");
function toIso(date) {
    return date.toISOString();
}
function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}
function normalizeIdOrNull(value) {
    if (value === undefined || value === null)
        return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}
function normalizeSingleLine(value, maxLength) {
    if (value === undefined || value === null)
        return null;
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized)
        return null;
    return normalized.slice(0, maxLength);
}
function normalizeLongText(value, maxLength) {
    if (value === undefined || value === null)
        return null;
    const normalized = value.replace(/\r\n/g, "\n").trim();
    if (!normalized)
        return null;
    return normalized.slice(0, maxLength);
}
function normalizeTags(value) {
    if (!Array.isArray(value))
        return [];
    const seen = new Set();
    const output = [];
    for (const item of value) {
        if (typeof item !== "string")
            continue;
        const normalized = item.replace(/\s+/g, " ").trim().slice(0, 24);
        if (!normalized)
            continue;
        const key = normalized.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        output.push(normalized);
        if (output.length >= 12)
            break;
    }
    return output;
}
function toTransactionOutput(t) {
    return {
        id: t.id,
        type: t.type,
        occurredAt: toIso(t.occurredAt),
        amountCents: t.amountCents,
        accountId: t.accountId,
        categoryId: t.categoryId ?? null,
        transferAccountId: t.transferAccountId ?? null,
        description: t.description ?? undefined,
        tags: Array.isArray(t.tags) ? t.tags : [],
        costCenter: t.costCenter ?? null,
        notes: t.notes ?? null,
        installmentGroupId: t.installmentGroupId ?? null,
        installmentIndex: t.installmentIndex ?? null,
        installmentTotal: t.installmentTotal ?? null,
        createdAt: toIso(t.createdAt),
        updatedAt: toIso(t.updatedAt),
        account: t.account
            ? {
                id: t.account.id,
                name: t.account.name,
                type: t.account.type,
                currency: t.account.currency,
            }
            : undefined,
        transferAccount: t.transferAccount
            ? {
                id: t.transferAccount.id,
                name: t.transferAccount.name,
                type: t.transferAccount.type,
                currency: t.transferAccount.currency,
            }
            : undefined,
        category: t.category
            ? {
                id: t.category.id,
                name: t.category.name,
                type: t.category.type,
                icon: t.category.icon ?? undefined,
                color: t.category.color ?? undefined,
            }
            : undefined,
    };
}
let TransactionsService = class TransactionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId, input) {
        const pageSize = input.limit && Number.isFinite(input.limit) ? Math.min(500, Math.max(1, input.limit)) : input.pageSize;
        const { skip, take } = (0, pagination_query_1.getSkipTake)({
            page: input.page,
            pageSize,
            defaultPage: 1,
            defaultPageSize: 50,
            maxPageSize: 500,
        });
        const fromDate = input.from ? new Date(input.from) : undefined;
        const toDate = input.to ? new Date(input.to) : undefined;
        if (fromDate && Number.isNaN(fromDate.getTime())) {
            throw new common_1.BadRequestException({
                code: "TRANSACTIONS_INVALID_FROM_DATE",
                message: "`from` invalido",
            });
        }
        if (toDate && Number.isNaN(toDate.getTime())) {
            throw new common_1.BadRequestException({
                code: "TRANSACTIONS_INVALID_TO_DATE",
                message: "`to` invalido",
            });
        }
        const where = {
            userId,
            ...(input.type ? { type: input.type } : null),
            ...(input.categoryId ? { categoryId: input.categoryId } : null),
            ...(input.q ? { description: { contains: input.q, mode: "insensitive" } } : null),
            ...(input.accountId
                ? {
                    OR: [{ accountId: input.accountId }, { transferAccountId: input.accountId }],
                }
                : null),
            ...(fromDate || toDate
                ? { occurredAt: { ...(fromDate ? { gte: fromDate } : null), ...(toDate ? { lte: toDate } : null) } }
                : null),
        };
        const sortBy = input.sortBy ?? "occurredAt";
        const sortDir = input.sortDir ?? "desc";
        const [total, items] = await this.prisma.$transaction([
            this.prisma.transaction.count({ where }),
            this.prisma.transaction.findMany({
                where,
                orderBy: { [sortBy]: sortDir },
                skip,
                take,
                include: {
                    account: { select: { id: true, name: true, type: true, currency: true } },
                    transferAccount: { select: { id: true, name: true, type: true, currency: true } },
                    category: { select: { id: true, name: true, type: true, icon: true, color: true } },
                },
            }),
        ]);
        return {
            page: Math.floor(skip / take) + 1,
            pageSize: take,
            total,
            items: items.map((t) => toTransactionOutput(t)),
        };
    }
    async assertAccountOwned(userId, accountId) {
        const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
        if (!account) {
            throw new common_1.NotFoundException({
                code: "ACCOUNT_NOT_FOUND",
                message: "Conta nao encontrada",
            });
        }
        return account;
    }
    async assertCategoryOwned(userId, categoryId) {
        const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
        if (!category) {
            throw new common_1.NotFoundException({
                code: "CATEGORY_NOT_FOUND",
                message: "Categoria nao encontrada",
            });
        }
        return category;
    }
    async create(userId, input) {
        const categoryId = normalizeIdOrNull(input.categoryId);
        const transferAccountId = normalizeIdOrNull(input.transferAccountId);
        const description = normalizeSingleLine(input.description, 200);
        const tags = normalizeTags(input.tags);
        const costCenter = normalizeSingleLine(input.costCenter, 80);
        const notes = normalizeLongText(input.notes, 2000);
        const sourceAccount = await this.assertAccountOwned(userId, input.accountId);
        if (input.installmentTotal && input.type === "TRANSFER") {
            throw new common_1.UnprocessableEntityException({
                code: "INSTALLMENTS_NOT_ALLOWED_TRANSFER",
                message: "Parcelamento nao permitido em transferencias",
            });
        }
        if (input.type === "TRANSFER") {
            if (!transferAccountId) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_DESTINATION_REQUIRED",
                    message: "Informe a conta de destino da transferencia",
                });
            }
            if (transferAccountId === input.accountId) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_SAME_ACCOUNT",
                    message: "Conta de origem e destino devem ser diferentes",
                });
            }
            const targetAccount = await this.assertAccountOwned(userId, transferAccountId);
            if (sourceAccount.currency !== targetAccount.currency) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_CURRENCY_MISMATCH",
                    message: "Transferencias entre moedas diferentes nao sao suportadas nesta versao.",
                });
            }
            if (categoryId) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_CATEGORY_NOT_ALLOWED",
                    message: "Transferencias nao suportam categoria",
                });
            }
        }
        else {
            if (transferAccountId) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_ACCOUNT_NOT_ALLOWED",
                    message: "A conta de destino so pode ser usada em transferencias",
                });
            }
            if (categoryId) {
                await this.assertCategoryOwned(userId, categoryId);
            }
        }
        const installmentTotal = input.installmentTotal && input.installmentTotal >= 2 ? input.installmentTotal : 1;
        try {
            if (installmentTotal > 1) {
                const groupId = (0, crypto_1.randomUUID)();
                const baseAmount = Math.floor(input.amountCents / installmentTotal);
                const remainder = input.amountCents - baseAmount * installmentTotal;
                const created = [];
                for (let i = 0; i < installmentTotal; i++) {
                    const amountCents = i === installmentTotal - 1 ? baseAmount + remainder : baseAmount;
                    const occurredAt = addMonths(input.occurredAt, i);
                    const t = await this.prisma.transaction.create({
                        data: {
                            userId,
                            type: input.type,
                            occurredAt,
                            amountCents,
                            accountId: input.accountId,
                            categoryId: input.type === "TRANSFER" ? null : categoryId,
                            transferAccountId: input.type === "TRANSFER" ? transferAccountId : null,
                            description: description
                                ? `${description} (${i + 1}/${installmentTotal})`
                                : `Parcela ${i + 1}/${installmentTotal}`,
                            tags,
                            costCenter,
                            notes,
                            installmentGroupId: groupId,
                            installmentIndex: i + 1,
                            installmentTotal,
                        },
                    });
                    created.push({ id: t.id, occurredAt: t.occurredAt, amountCents: t.amountCents });
                }
                return {
                    ids: created.map((c) => c.id),
                    installmentGroupId: groupId,
                    installmentTotal,
                    firstId: created[0].id,
                    type: input.type,
                    totalAmountCents: input.amountCents,
                    items: created.map((c, i) => ({
                        id: c.id,
                        installmentIndex: i + 1,
                        amountCents: c.amountCents,
                        occurredAt: toIso(c.occurredAt),
                    })),
                };
            }
            const created = await this.prisma.transaction.create({
                data: {
                    userId,
                    type: input.type,
                    occurredAt: input.occurredAt,
                    amountCents: input.amountCents,
                    accountId: input.accountId,
                    categoryId: input.type === "TRANSFER" ? null : categoryId,
                    transferAccountId: input.type === "TRANSFER" ? transferAccountId : null,
                    description,
                    tags,
                    costCenter,
                    notes,
                },
            });
            return toTransactionOutput(created);
        }
        catch (error) {
            const prismaCode = error?.code;
            if (prismaCode === "P2003") {
                throw new common_1.ConflictException({
                    code: "TRANSACTION_REFERENCE_CONFLICT",
                    message: "Referencia invalida (conta/categoria)",
                });
            }
            throw error;
        }
    }
    async update(userId, id, input) {
        const existing = await this.prisma.transaction.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new common_1.NotFoundException({
                code: "TRANSACTION_NOT_FOUND",
                message: "Transacao nao encontrada",
            });
        }
        const nextType = input.type ?? existing.type;
        const nextAccountId = input.accountId ?? existing.accountId;
        const nextCategoryId = input.categoryId !== undefined ? normalizeIdOrNull(input.categoryId) : existing.categoryId;
        const nextTransferAccountId = input.transferAccountId !== undefined
            ? normalizeIdOrNull(input.transferAccountId)
            : existing.transferAccountId ?? null;
        const nextTags = input.tags !== undefined ? normalizeTags(input.tags) : Array.isArray(existing.tags) ? existing.tags : [];
        const nextCostCenter = input.costCenter !== undefined ? normalizeSingleLine(input.costCenter, 80) : (existing.costCenter ?? null);
        const nextNotes = input.notes !== undefined ? normalizeLongText(input.notes, 2000) : (existing.notes ?? null);
        const sourceAccount = await this.assertAccountOwned(userId, nextAccountId);
        if (nextType === "TRANSFER") {
            if (!nextTransferAccountId) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_DESTINATION_REQUIRED",
                    message: "Informe a conta de destino da transferencia",
                });
            }
            if (nextTransferAccountId === nextAccountId) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_SAME_ACCOUNT",
                    message: "Conta de origem e destino devem ser diferentes",
                });
            }
            const targetAccount = await this.assertAccountOwned(userId, nextTransferAccountId);
            if (sourceAccount.currency !== targetAccount.currency) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_CURRENCY_MISMATCH",
                    message: "Transferencias entre moedas diferentes nao sao suportadas nesta versao.",
                });
            }
            if (nextCategoryId) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_CATEGORY_NOT_ALLOWED",
                    message: "Transferencias nao suportam categoria",
                });
            }
        }
        else {
            if (nextTransferAccountId) {
                throw new common_1.UnprocessableEntityException({
                    code: "TRANSFER_ACCOUNT_NOT_ALLOWED",
                    message: "A conta de destino so pode ser usada em transferencias",
                });
            }
            if (nextCategoryId) {
                await this.assertCategoryOwned(userId, nextCategoryId);
            }
        }
        const updated = await this.prisma.transaction.update({
            where: { id },
            data: {
                ...(input.type !== undefined ? { type: input.type } : null),
                ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : null),
                ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : null),
                ...(input.accountId !== undefined ? { accountId: input.accountId } : null),
                ...(input.categoryId !== undefined
                    ? { categoryId: nextType === "TRANSFER" ? null : nextCategoryId }
                    : null),
                ...(input.transferAccountId !== undefined
                    ? { transferAccountId: nextType === "TRANSFER" ? nextTransferAccountId : null }
                    : null),
                ...(input.description !== undefined ? { description: normalizeSingleLine(input.description, 200) } : null),
                ...(input.tags !== undefined ? { tags: nextTags } : null),
                ...(input.costCenter !== undefined ? { costCenter: nextCostCenter } : null),
                ...(input.notes !== undefined ? { notes: nextNotes } : null),
            },
        });
        return toTransactionOutput(updated);
    }
    async remove(userId, id) {
        const existing = await this.prisma.transaction.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new common_1.NotFoundException({
                code: "TRANSACTION_NOT_FOUND",
                message: "Transacao nao encontrada",
            });
        }
        await this.prisma.transaction.delete({ where: { id } });
        return { ok: true };
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransactionsService);
