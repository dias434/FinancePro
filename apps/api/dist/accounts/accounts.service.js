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
exports.AccountsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const currency_1 = require("../common/currency");
const pagination_query_1 = require("../common/dto/pagination.query");
const prisma_service_1 = require("../prisma/prisma.service");
function toDbAccountType(type) {
    if (!type)
        return undefined;
    if (type === "CREDIT_CARD")
        return client_1.AccountType.CREDIT;
    return type;
}
function toApiAccountType(type) {
    if (type === client_1.AccountType.CREDIT)
        return "CREDIT_CARD";
    return type;
}
function toIso(date) {
    return date.toISOString();
}
function toAccountOutput(a, balanceCents) {
    const isCredit = a.type === client_1.AccountType.CREDIT;
    const debtCents = isCredit && balanceCents < 0 ? Math.abs(balanceCents) : 0;
    const availableCents = isCredit && a.limitCents != null ? Math.max(0, a.limitCents - debtCents) : undefined;
    return {
        id: a.id,
        name: a.name,
        type: toApiAccountType(a.type),
        currency: a.currency,
        limitCents: a.limitCents ?? undefined,
        closingDay: a.closingDay ?? undefined,
        dueDay: a.dueDay ?? undefined,
        balanceCents,
        debtCents: isCredit ? debtCents : undefined,
        availableCents,
        createdAt: toIso(a.createdAt),
        updatedAt: toIso(a.updatedAt),
    };
}
let AccountsService = class AccountsService {
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
            ...(input.q
                ? { name: { contains: input.q, mode: "insensitive" } }
                : null),
        };
        const sortBy = input.sortBy ?? "createdAt";
        const sortDir = input.sortDir ?? "desc";
        const [total, accounts, balances] = await this.prisma.$transaction([
            this.prisma.account.count({ where }),
            this.prisma.account.findMany({
                where,
                orderBy: { [sortBy]: sortDir },
                skip,
                take,
            }),
            this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT
          a."id" AS account_id,
          COALESCE(SUM(
            CASE
              WHEN t."accountId" = a."id" AND t."type" = 'INCOME' THEN t."amountCents"
              WHEN t."accountId" = a."id" AND t."type" = 'EXPENSE' THEN -t."amountCents"
              WHEN t."accountId" = a."id" AND t."type" = 'TRANSFER' THEN -t."amountCents"
              WHEN t."transferAccountId" = a."id" AND t."type" = 'TRANSFER' THEN t."amountCents"
              ELSE 0
            END
          ), 0)::int AS balance_cents
        FROM "Account" a
        LEFT JOIN "Transaction" t ON (t."accountId" = a."id" OR t."transferAccountId" = a."id")
        WHERE a."userId" = ${userId}
        GROUP BY a."id"
      `),
        ]);
        const balanceByAccountId = new Map();
        for (const row of balances) {
            balanceByAccountId.set(row.account_id, row.balance_cents ?? 0);
        }
        return {
            page: Math.floor(skip / take) + 1,
            pageSize: take,
            total,
            items: accounts.map((a) => toAccountOutput(a, balanceByAccountId.get(a.id) ?? 0)),
        };
    }
    async create(userId, input) {
        const currency = (0, currency_1.assertSupportedCurrency)(input.currency, {
            code: "ACCOUNT_CURRENCY_INVALID",
            message: "Moeda da conta invalida.",
        });
        try {
            const created = await this.prisma.account.create({
                data: {
                    userId,
                    name: input.name.trim(),
                    type: toDbAccountType(input.type) ?? client_1.AccountType.CHECKING,
                    currency,
                    limitCents: input.limitCents ?? null,
                    closingDay: input.closingDay ?? null,
                    dueDay: input.dueDay ?? null,
                },
            });
            return toAccountOutput(created, 0);
        }
        catch (error) {
            const prismaCode = error?.code;
            if (prismaCode === "P2002") {
                throw new common_1.ConflictException("JÇ­ existe uma conta com esse nome", {
                    cause: error,
                    description: "UNIQUE_ACCOUNT_NAME",
                });
            }
            throw error;
        }
    }
    async get(userId, id) {
        const account = await this.prisma.account.findFirst({ where: { id, userId } });
        if (!account)
            throw new common_1.NotFoundException("Conta nao encontrada");
        const [balanceRow] = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT COALESCE(SUM(
        CASE
          WHEN t."accountId" = a."id" AND t."type" = 'INCOME' THEN t."amountCents"
          WHEN t."accountId" = a."id" AND t."type" = 'EXPENSE' THEN -t."amountCents"
          WHEN t."accountId" = a."id" AND t."type" = 'TRANSFER' THEN -t."amountCents"
          WHEN t."transferAccountId" = a."id" AND t."type" = 'TRANSFER' THEN t."amountCents"
          ELSE 0
        END
      ), 0)::int AS balance_cents
      FROM "Account" a
      LEFT JOIN "Transaction" t ON (t."accountId" = a."id" OR t."transferAccountId" = a."id")
      WHERE a."id" = ${id} AND a."userId" = ${userId}
      GROUP BY a."id"
    `);
        const balanceCents = balanceRow?.balance_cents ?? 0;
        return toAccountOutput(account, balanceCents);
    }
    async update(userId, id, input) {
        const existing = await this.prisma.account.findFirst({ where: { id, userId } });
        if (!existing)
            throw new common_1.NotFoundException("Conta nao encontrada");
        const currency = input.currency !== undefined
            ? (0, currency_1.assertSupportedCurrency)(input.currency, {
                code: "ACCOUNT_CURRENCY_INVALID",
                message: "Moeda da conta invalida.",
            })
            : undefined;
        try {
            const updated = await this.prisma.account.update({
                where: { id },
                data: {
                    ...(input.name !== undefined ? { name: input.name.trim() } : null),
                    ...(input.type !== undefined ? { type: toDbAccountType(input.type) } : null),
                    ...(currency !== undefined ? { currency } : null),
                    ...(input.limitCents !== undefined ? { limitCents: input.limitCents } : null),
                    ...(input.closingDay !== undefined ? { closingDay: input.closingDay } : null),
                    ...(input.dueDay !== undefined ? { dueDay: input.dueDay } : null),
                },
            });
            const [balanceRow] = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT COALESCE(SUM(
          CASE
            WHEN t."accountId" = a."id" AND t."type" = 'INCOME' THEN t."amountCents"
            WHEN t."accountId" = a."id" AND t."type" = 'EXPENSE' THEN -t."amountCents"
            WHEN t."accountId" = a."id" AND t."type" = 'TRANSFER' THEN -t."amountCents"
            WHEN t."transferAccountId" = a."id" AND t."type" = 'TRANSFER' THEN t."amountCents"
            ELSE 0
          END
        ), 0)::int AS balance_cents
        FROM "Account" a
        LEFT JOIN "Transaction" t ON (t."accountId" = a."id" OR t."transferAccountId" = a."id")
        WHERE a."id" = ${id} AND a."userId" = ${userId}
        GROUP BY a."id"
      `);
            return toAccountOutput(updated, balanceRow?.balance_cents ?? 0);
        }
        catch (error) {
            const prismaCode = error?.code;
            if (prismaCode === "P2002") {
                throw new common_1.ConflictException("JÇ­ existe uma conta com esse nome", {
                    cause: error,
                    description: "UNIQUE_ACCOUNT_NAME",
                });
            }
            throw error;
        }
    }
    async remove(userId, id) {
        const account = await this.prisma.account.findFirst({ where: { id, userId } });
        if (!account)
            throw new common_1.NotFoundException("Conta nÇœo encontrada");
        const transferRefs = await this.prisma.transaction.count({
            where: { userId, transferAccountId: id },
        });
        if (transferRefs > 0) {
            throw new common_1.ConflictException("Essa conta estÇ­ sendo usada como destino de transferÇ¦ncias. Remova/edite essas transferÇ¦ncias antes de apagar a conta.");
        }
        await this.prisma.account.delete({ where: { id } });
        return { ok: true };
    }
    async reconcile(userId, accountId, input) {
        const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
        if (!account)
            throw new common_1.NotFoundException("Conta nao encontrada");
        const recorded = await this.prisma.reconciliationRecord.create({
            data: {
                accountId,
                userId,
                recordedAt: new Date(),
                expectedBalanceCents: input.expectedBalanceCents,
                actualBalanceCents: input.actualBalanceCents,
                note: input.note?.trim() || null,
            },
        });
        return {
            id: recorded.id,
            accountId,
            recordedAt: toIso(recorded.recordedAt),
            expectedBalanceCents: recorded.expectedBalanceCents,
            actualBalanceCents: recorded.actualBalanceCents,
            diffCents: recorded.actualBalanceCents - recorded.expectedBalanceCents,
            note: recorded.note ?? undefined,
        };
    }
    async listBills(userId, accountId, input) {
        const account = await this.prisma.account.findFirst({
            where: { id: accountId, userId },
        });
        if (!account)
            throw new common_1.NotFoundException("Conta nao encontrada");
        if (account.type !== client_1.AccountType.CREDIT) {
            throw new common_1.BadRequestException({
                code: "ACCOUNT_NOT_CREDIT",
                message: "Listagem de faturas so disponivel para contas do tipo cartao de credito",
            });
        }
        const closingDay = account.closingDay ?? 10;
        const dueDay = account.dueDay ?? 15;
        const limit = Math.min(input.limit ?? 12, 24);
        const bills = [];
        const now = new Date();
        for (let i = 0; i < limit; i++) {
            const periodEnd = new Date(now.getFullYear(), now.getMonth() - i, closingDay, 23, 59, 59);
            const periodStart = new Date(periodEnd);
            periodStart.setMonth(periodStart.getMonth() - 1);
            periodStart.setDate(periodStart.getDate() + 1);
            periodStart.setHours(0, 0, 0, 0);
            const dueDate = new Date(periodEnd);
            if (dueDay >= closingDay) {
                dueDate.setDate(dueDay);
            }
            else {
                dueDate.setMonth(dueDate.getMonth() + 1);
                dueDate.setDate(dueDay);
            }
            const [totals] = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT
          COALESCE(SUM(CASE WHEN t."accountId" = ${accountId} AND t."type" = 'EXPENSE' THEN t."amountCents" ELSE 0 END), 0)::int AS expense_cents,
          COALESCE(SUM(CASE WHEN t."transferAccountId" = ${accountId} AND t."type" = 'TRANSFER' THEN t."amountCents" ELSE 0 END), 0)::int AS payment_cents
        FROM "Transaction" t
        WHERE (t."accountId" = ${accountId} OR t."transferAccountId" = ${accountId})
          AND t."occurredAt" >= ${periodStart}
          AND t."occurredAt" <= ${periodEnd}
      `);
            const expenseCents = totals?.expense_cents ?? 0;
            const paymentCents = totals?.payment_cents ?? 0;
            const totalCents = expenseCents;
            const paidCents = paymentCents;
            const remainingCents = Math.max(0, totalCents - paidCents);
            bills.push({
                month: `${periodEnd.getFullYear()}-${String(periodEnd.getMonth() + 1).padStart(2, "0")}`,
                dueDate: dueDate.toISOString().slice(0, 10),
                totalCents,
                paidCents,
                remainingCents,
                periodStart: periodStart.toISOString().slice(0, 10),
                periodEnd: periodEnd.toISOString().slice(0, 10),
            });
        }
        return { bills };
    }
    async listReconciliations(userId, accountId, input) {
        const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
        if (!account)
            throw new common_1.NotFoundException("Conta nao encontrada");
        const { skip, take } = (0, pagination_query_1.getSkipTake)({
            page: input.page,
            pageSize: input.pageSize,
            defaultPage: 1,
            defaultPageSize: 20,
            maxPageSize: 50,
        });
        const [total, items] = await this.prisma.$transaction([
            this.prisma.reconciliationRecord.count({ where: { accountId } }),
            this.prisma.reconciliationRecord.findMany({
                where: { accountId },
                orderBy: { recordedAt: "desc" },
                skip,
                take,
            }),
        ]);
        return {
            page: Math.floor(skip / take) + 1,
            pageSize: take,
            total,
            items: items.map((r) => ({
                id: r.id,
                recordedAt: toIso(r.recordedAt),
                expectedBalanceCents: r.expectedBalanceCents,
                actualBalanceCents: r.actualBalanceCents,
                diffCents: r.actualBalanceCents - r.expectedBalanceCents,
                note: r.note ?? undefined,
            })),
        };
    }
};
exports.AccountsService = AccountsService;
exports.AccountsService = AccountsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccountsService);
