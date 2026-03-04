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
exports.GoalsService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const pagination_query_1 = require("../common/dto/pagination.query");
const prisma_service_1 = require("../prisma/prisma.service");
function toIso(date) {
    return date.toISOString();
}
function rowToOutput(goal) {
    const progressPercent = goal.target_cents > 0
        ? Math.round((goal.current_cents / goal.target_cents) * 10000) / 100
        : 0;
    const remainingCents = Math.max(0, goal.target_cents - goal.current_cents);
    const completed = goal.current_cents >= goal.target_cents;
    const now = new Date();
    const daysRemaining = Math.ceil((goal.target_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
        id: goal.id,
        name: goal.name,
        targetCents: goal.target_cents,
        currentCents: goal.current_cents,
        targetDate: toIso(goal.target_date),
        progressPercent,
        remainingCents,
        completed,
        daysRemaining,
        createdAt: toIso(goal.created_at),
        updatedAt: toIso(goal.updated_at),
    };
}
function writeRowToRow(goal) {
    return {
        id: goal.id,
        name: goal.name,
        target_cents: goal.targetCents,
        current_cents: goal.currentCents,
        target_date: goal.targetDate,
        created_at: goal.createdAt,
        updated_at: goal.updatedAt,
    };
}
let GoalsService = class GoalsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getGoalRowById(userId, id) {
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        g."id" AS id,
        g."name" AS name,
        g."targetCents" AS target_cents,
        g."currentCents" AS current_cents,
        g."targetDate" AS target_date,
        g."createdAt" AS created_at,
        g."updatedAt" AS updated_at
      FROM "Goal" g
      WHERE g."id" = ${id}
        AND g."userId" = ${userId}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async list(userId, input) {
        const { skip, take } = (0, pagination_query_1.getSkipTake)({
            page: input.page,
            pageSize: input.pageSize,
            defaultPage: 1,
            defaultPageSize: 50,
            maxPageSize: 200,
        });
        const conditions = [client_1.Prisma.sql `g."userId" = ${userId}`];
        if (input.q?.trim()) {
            conditions.push(client_1.Prisma.sql `g."name" ILIKE ${`%${input.q.trim()}%`}`);
        }
        const whereSql = client_1.Prisma.join(conditions, " AND ");
        const sortBy = input.sortBy ?? "targetDate";
        const sortDir = input.sortDir ?? "asc";
        const orderBySql = sortBy === "name"
            ? client_1.Prisma.raw(`g."name"`)
            : sortBy === "targetCents"
                ? client_1.Prisma.raw(`g."targetCents"`)
                : sortBy === "createdAt"
                    ? client_1.Prisma.raw(`g."createdAt"`)
                    : client_1.Prisma.raw(`g."targetDate"`);
        const orderDirSql = sortDir === "asc" ? client_1.Prisma.raw(`ASC`) : client_1.Prisma.raw(`DESC`);
        const [countRow] = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT COUNT(*)::int AS total
      FROM "Goal" g
      WHERE ${whereSql}
    `);
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        g."id" AS id,
        g."name" AS name,
        g."targetCents" AS target_cents,
        g."currentCents" AS current_cents,
        g."targetDate" AS target_date,
        g."createdAt" AS created_at,
        g."updatedAt" AS updated_at
      FROM "Goal" g
      WHERE ${whereSql}
      ORDER BY ${orderBySql} ${orderDirSql}
      LIMIT ${take}
      OFFSET ${skip}
    `);
        return {
            page: Math.floor(skip / take) + 1,
            pageSize: take,
            total: countRow?.total ?? 0,
            items: rows.map((row) => rowToOutput(row)),
        };
    }
    async create(userId, input) {
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      INSERT INTO "Goal" (
        "id",
        "userId",
        "name",
        "targetCents",
        "currentCents",
        "targetDate",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${(0, crypto_1.randomUUID)()},
        ${userId},
        ${input.name.trim()},
        ${input.targetCents},
        ${input.currentCents ?? 0},
        ${input.targetDate},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING "id", "name", "targetCents", "currentCents", "targetDate", "createdAt", "updatedAt"
    `);
        return rowToOutput(writeRowToRow(rows[0]));
    }
    async update(userId, id, input) {
        const existing = await this.getGoalRowById(userId, id);
        if (!existing)
            throw new common_1.NotFoundException("Goal not found");
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      UPDATE "Goal"
      SET
        "name" = ${input.name !== undefined ? input.name.trim() : existing.name},
        "targetCents" = ${input.targetCents ?? existing.target_cents},
        "currentCents" = ${input.currentCents ?? existing.current_cents},
        "targetDate" = ${input.targetDate ?? existing.target_date},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
        AND "userId" = ${userId}
      RETURNING "id", "name", "targetCents", "currentCents", "targetDate", "createdAt", "updatedAt"
    `);
        if (!rows[0])
            throw new common_1.NotFoundException("Goal not found");
        return rowToOutput(writeRowToRow(rows[0]));
    }
    async remove(userId, id) {
        const deleted = await this.prisma.$executeRaw(client_1.Prisma.sql `
      DELETE FROM "Goal"
      WHERE "id" = ${id}
        AND "userId" = ${userId}
    `);
        if (!deleted)
            throw new common_1.NotFoundException("Goal not found");
        return { ok: true };
    }
};
exports.GoalsService = GoalsService;
exports.GoalsService = GoalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GoalsService);
