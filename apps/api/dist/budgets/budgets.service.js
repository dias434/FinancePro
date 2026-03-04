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
exports.BudgetsService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const pagination_query_1 = require("../common/dto/pagination.query");
const prisma_service_1 = require("../prisma/prisma.service");
function toIso(date) {
    return date.toISOString();
}
function startOfMonthUtc(year, month1To12) {
    return new Date(Date.UTC(year, month1To12 - 1, 1, 0, 0, 0, 0));
}
function addMonthsUtc(date, months) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0));
}
function monthKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
let BudgetsService = class BudgetsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    rowToRecord(row) {
        return {
            id: row.id,
            month: row.month,
            limitCents: row.limit_cents,
            alertPercent: row.alert_percent,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            category: {
                id: row.category_id,
                name: row.category_name,
                type: row.category_type,
                icon: row.category_icon,
                color: row.category_color,
            },
        };
    }
    async getBudgetRowById(userId, id) {
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        b."id" AS id,
        b."month" AS month,
        b."limitCents" AS limit_cents,
        b."alertPercent" AS alert_percent,
        b."createdAt" AS created_at,
        b."updatedAt" AS updated_at,
        c."id" AS category_id,
        c."name" AS category_name,
        c."type" AS category_type,
        c."icon" AS category_icon,
        c."color" AS category_color
      FROM "Budget" b
      INNER JOIN "Category" c ON c."id" = b."categoryId"
      WHERE b."id" = ${id}
        AND b."userId" = ${userId}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async assertExpenseCategoryOwned(userId, categoryId) {
        const category = await this.prisma.category.findFirst({
            where: { id: categoryId, userId },
            select: { id: true, name: true, type: true, icon: true, color: true },
        });
        if (!category)
            throw new common_1.NotFoundException("Category not found");
        if (category.type !== client_1.CategoryType.EXPENSE) {
            throw new common_1.BadRequestException("Budget category must be EXPENSE");
        }
        return category;
    }
    async getConsumedMap(userId, budgets) {
        if (budgets.length === 0)
            return new Map();
        const categoryIds = Array.from(new Set(budgets.map((b) => b.category.id)));
        const minStart = new Date(Math.min(...budgets.map((b) => b.month.getTime())));
        const maxEnd = addMonthsUtc(new Date(Math.max(...budgets.map((b) => b.month.getTime()))), 1);
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        t."categoryId" AS category_id,
        date_trunc('month', t."occurredAt") AS month_start,
        COALESCE(SUM(t."amountCents"), 0)::int AS consumed_cents
      FROM "Transaction" t
      WHERE t."userId" = ${userId}
        AND t."type" = 'EXPENSE'
        AND t."categoryId" IN (${client_1.Prisma.join(categoryIds)})
        AND t."occurredAt" >= ${minStart}
        AND t."occurredAt" < ${maxEnd}
      GROUP BY 1, 2
    `);
        const map = new Map();
        for (const row of rows) {
            map.set(`${row.category_id}|${monthKey(row.month_start)}`, row.consumed_cents ?? 0);
        }
        return map;
    }
    mapBudgetOutput(record, consumedMap) {
        const consumedCents = consumedMap.get(`${record.category.id}|${monthKey(record.month)}`) ?? 0;
        const remainingCents = record.limitCents - consumedCents;
        const usedPercent = record.limitCents > 0
            ? Math.round((consumedCents / record.limitCents) * 10000) / 100
            : 0;
        const alertReached = usedPercent >= record.alertPercent;
        const overLimit = consumedCents > record.limitCents;
        return {
            id: record.id,
            year: record.month.getUTCFullYear(),
            month: record.month.getUTCMonth() + 1,
            monthStart: toIso(record.month),
            monthEnd: toIso(addMonthsUtc(record.month, 1)),
            limitCents: record.limitCents,
            consumedCents,
            remainingCents,
            usedPercent,
            alertPercent: record.alertPercent,
            alertReached,
            overLimit,
            category: {
                id: record.category.id,
                name: record.category.name,
                type: record.category.type,
                icon: record.category.icon ?? undefined,
                color: record.category.color ?? undefined,
            },
            createdAt: toIso(record.createdAt),
            updatedAt: toIso(record.updatedAt),
        };
    }
    async list(userId, input) {
        const now = new Date();
        const selectedYear = input.year ?? now.getUTCFullYear();
        const rangeStart = input.month
            ? startOfMonthUtc(selectedYear, input.month)
            : startOfMonthUtc(selectedYear, 1);
        const rangeEnd = input.month
            ? addMonthsUtc(rangeStart, 1)
            : startOfMonthUtc(selectedYear + 1, 1);
        const conditions = [
            client_1.Prisma.sql `b."userId" = ${userId}`,
            client_1.Prisma.sql `b."month" >= ${rangeStart}`,
            client_1.Prisma.sql `b."month" < ${rangeEnd}`,
        ];
        if (input.categoryId) {
            conditions.push(client_1.Prisma.sql `b."categoryId" = ${input.categoryId}`);
        }
        if (input.q?.trim()) {
            conditions.push(client_1.Prisma.sql `c."name" ILIKE ${`%${input.q.trim()}%`}`);
        }
        const whereSql = client_1.Prisma.join(conditions, " AND ");
        const { skip, take } = (0, pagination_query_1.getSkipTake)({
            page: input.page,
            pageSize: input.pageSize,
            defaultPage: 1,
            defaultPageSize: 50,
            maxPageSize: 200,
        });
        const sortBy = input.sortBy ?? "month";
        const sortDir = input.sortDir ?? "desc";
        const orderBySql = sortBy === "limitCents"
            ? client_1.Prisma.raw(`b."limitCents"`)
            : sortBy === "createdAt"
                ? client_1.Prisma.raw(`b."createdAt"`)
                : client_1.Prisma.raw(`b."month"`);
        const orderDirSql = sortDir === "asc" ? client_1.Prisma.raw(`ASC`) : client_1.Prisma.raw(`DESC`);
        const [countRow] = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT COUNT(*)::int AS total
      FROM "Budget" b
      INNER JOIN "Category" c ON c."id" = b."categoryId"
      WHERE ${whereSql}
    `);
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        b."id" AS id,
        b."month" AS month,
        b."limitCents" AS limit_cents,
        b."alertPercent" AS alert_percent,
        b."createdAt" AS created_at,
        b."updatedAt" AS updated_at,
        c."id" AS category_id,
        c."name" AS category_name,
        c."type" AS category_type,
        c."icon" AS category_icon,
        c."color" AS category_color
      FROM "Budget" b
      INNER JOIN "Category" c ON c."id" = b."categoryId"
      WHERE ${whereSql}
      ORDER BY ${orderBySql} ${orderDirSql}
      LIMIT ${take}
      OFFSET ${skip}
    `);
        const budgets = rows.map((row) => this.rowToRecord(row));
        const consumedMap = await this.getConsumedMap(userId, budgets);
        return {
            page: Math.floor(skip / take) + 1,
            pageSize: take,
            total: countRow?.total ?? 0,
            items: budgets.map((budget) => this.mapBudgetOutput(budget, consumedMap)),
        };
    }
    async create(userId, input) {
        const category = await this.assertExpenseCategoryOwned(userId, input.categoryId);
        const month = startOfMonthUtc(input.year, input.month);
        const id = (0, crypto_1.randomUUID)();
        let created;
        try {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        INSERT INTO "Budget" ("id", "userId", "categoryId", "month", "limitCents", "alertPercent", "createdAt", "updatedAt")
        VALUES (
          ${id},
          ${userId},
          ${input.categoryId},
          ${month},
          ${input.limitCents},
          ${input.alertPercent ?? 80},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING "id", "month", "limitCents", "alertPercent", "createdAt", "updatedAt"
      `);
            created = rows[0];
        }
        catch (error) {
            if (error?.code === "23505") {
                throw new common_1.ConflictException("Budget for this category/month already exists");
            }
            throw error;
        }
        const record = {
            id: created.id,
            month: created.month,
            limitCents: created.limitCents,
            alertPercent: created.alertPercent,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
            category,
        };
        const consumedMap = await this.getConsumedMap(userId, [record]);
        return this.mapBudgetOutput(record, consumedMap);
    }
    async update(userId, id, input) {
        const existingRow = await this.getBudgetRowById(userId, id);
        if (!existingRow)
            throw new common_1.NotFoundException("Budget not found");
        const existing = this.rowToRecord(existingRow);
        const nextCategoryId = input.categoryId ?? existing.category.id;
        const nextCategory = await this.assertExpenseCategoryOwned(userId, nextCategoryId);
        const nextYear = input.year ?? existing.month.getUTCFullYear();
        const nextMonth = input.month ?? existing.month.getUTCMonth() + 1;
        const nextMonthDate = startOfMonthUtc(nextYear, nextMonth);
        let updated;
        try {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        UPDATE "Budget"
        SET
          "categoryId" = ${nextCategoryId},
          "month" = ${nextMonthDate},
          "limitCents" = ${input.limitCents ?? existing.limitCents},
          "alertPercent" = ${input.alertPercent ?? existing.alertPercent},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
          AND "userId" = ${userId}
        RETURNING "id", "month", "limitCents", "alertPercent", "createdAt", "updatedAt"
      `);
            updated = rows[0];
        }
        catch (error) {
            if (error?.code === "23505") {
                throw new common_1.ConflictException("Budget for this category/month already exists");
            }
            throw error;
        }
        if (!updated)
            throw new common_1.NotFoundException("Budget not found");
        const record = {
            id: updated.id,
            month: updated.month,
            limitCents: updated.limitCents,
            alertPercent: updated.alertPercent,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            category: nextCategory,
        };
        const consumedMap = await this.getConsumedMap(userId, [record]);
        return this.mapBudgetOutput(record, consumedMap);
    }
    async remove(userId, id) {
        const deleted = await this.prisma.$executeRaw(client_1.Prisma.sql `
      DELETE FROM "Budget"
      WHERE "id" = ${id}
        AND "userId" = ${userId}
    `);
        if (!deleted)
            throw new common_1.NotFoundException("Budget not found");
        return { ok: true };
    }
};
exports.BudgetsService = BudgetsService;
exports.BudgetsService = BudgetsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BudgetsService);
