import { randomUUID } from "crypto"

import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { getSkipTake } from "../common/dto/pagination.query"
import { PrismaService } from "../prisma/prisma.service"

function toIso(date: Date) {
  return date.toISOString()
}

type GoalRow = {
  id: string
  name: string
  target_cents: number
  current_cents: number
  target_date: Date
  created_at: Date
  updated_at: Date
}

type GoalWriteRow = {
  id: string
  name: string
  targetCents: number
  currentCents: number
  targetDate: Date
  createdAt: Date
  updatedAt: Date
}

function rowToOutput(goal: GoalRow) {
  const progressPercent =
    goal.target_cents > 0
      ? Math.round((goal.current_cents / goal.target_cents) * 10000) / 100
      : 0

  const remainingCents = Math.max(0, goal.target_cents - goal.current_cents)
  const completed = goal.current_cents >= goal.target_cents

  const now = new Date()
  const daysRemaining = Math.ceil((goal.target_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

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
  }
}

function writeRowToRow(goal: GoalWriteRow): GoalRow {
  return {
    id: goal.id,
    name: goal.name,
    target_cents: goal.targetCents,
    current_cents: goal.currentCents,
    target_date: goal.targetDate,
    created_at: goal.createdAt,
    updated_at: goal.updatedAt,
  }
}

@Injectable()
export class GoalsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async getGoalRowById(userId: string, id: string) {
    const rows = await this.prisma.$queryRaw<GoalRow[]>(Prisma.sql`
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
    `)

    return rows[0] ?? null
  }

  async list(userId: string, input: {
    page?: number
    pageSize?: number
    q?: string
    sortBy?: "name" | "targetDate" | "targetCents" | "createdAt"
    sortDir?: "asc" | "desc"
  }) {
    const { skip, take } = getSkipTake({
      page: input.page,
      pageSize: input.pageSize,
      defaultPage: 1,
      defaultPageSize: 50,
      maxPageSize: 200,
    })

    const conditions: Prisma.Sql[] = [Prisma.sql`g."userId" = ${userId}`]
    if (input.q?.trim()) {
      conditions.push(Prisma.sql`g."name" ILIKE ${`%${input.q.trim()}%`}`)
    }

    const whereSql = Prisma.join(conditions, " AND ")

    const sortBy = input.sortBy ?? "targetDate"
    const sortDir = input.sortDir ?? "asc"

    const orderBySql =
      sortBy === "name"
        ? Prisma.raw(`g."name"`)
        : sortBy === "targetCents"
          ? Prisma.raw(`g."targetCents"`)
          : sortBy === "createdAt"
            ? Prisma.raw(`g."createdAt"`)
            : Prisma.raw(`g."targetDate"`)

    const orderDirSql = sortDir === "asc" ? Prisma.raw(`ASC`) : Prisma.raw(`DESC`)

    const [countRow] = await this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM "Goal" g
      WHERE ${whereSql}
    `)

    const rows = await this.prisma.$queryRaw<GoalRow[]>(Prisma.sql`
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
    `)

    return {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total: countRow?.total ?? 0,
      items: rows.map((row) => rowToOutput(row)),
    }
  }

  async create(userId: string, input: {
    name: string
    targetCents: number
    currentCents?: number
    targetDate: Date
  }) {
    const rows = await this.prisma.$queryRaw<GoalWriteRow[]>(Prisma.sql`
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
        ${randomUUID()},
        ${userId},
        ${input.name.trim()},
        ${input.targetCents},
        ${input.currentCents ?? 0},
        ${input.targetDate},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING "id", "name", "targetCents", "currentCents", "targetDate", "createdAt", "updatedAt"
    `)

    return rowToOutput(writeRowToRow(rows[0]))
  }

  async update(userId: string, id: string, input: {
    name?: string
    targetCents?: number
    currentCents?: number
    targetDate?: Date
  }) {
    const existing = await this.getGoalRowById(userId, id)
    if (!existing) throw new NotFoundException("Goal not found")

    const rows = await this.prisma.$queryRaw<GoalWriteRow[]>(Prisma.sql`
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
    `)

    if (!rows[0]) throw new NotFoundException("Goal not found")

    return rowToOutput(writeRowToRow(rows[0]))
  }

  async remove(userId: string, id: string) {
    const deleted = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM "Goal"
      WHERE "id" = ${id}
        AND "userId" = ${userId}
    `)

    if (!deleted) throw new NotFoundException("Goal not found")
    return { ok: true }
  }
}
