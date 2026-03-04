import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma, SystemAlertStatus, SystemAlertType } from "@prisma/client"

import { getSkipTake } from "../common/dto/pagination.query"
import { PrismaService } from "../prisma/prisma.service"

function toIso(date: Date) {
  return date.toISOString()
}

@Injectable()
export class AlertsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private toOutput(alert: {
    id: string
    type: SystemAlertType
    status: SystemAlertStatus
    sourceId: string
    title: string
    message: string
    payload: Prisma.JsonValue | null
    firstTriggeredAt: Date
    lastTriggeredAt: Date
    readAt: Date | null
    resolvedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }) {
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
    }
  }

  async list(userId: string, input: {
    page?: number
    pageSize?: number
    status?: "ACTIVE" | "READ" | "RESOLVED"
    type?:
      | "BUDGET_THRESHOLD"
      | "BUDGET_OVER_LIMIT"
      | "GOAL_DUE_SOON"
      | "GOAL_OVERDUE"
      | "BILL_DUE_SOON"
      | "BILL_OVERDUE"
      | "SPENDING_SPIKE_WEEKLY"
      | "SPENDING_SPIKE_MONTHLY"
    sortBy?: "createdAt" | "lastTriggeredAt"
    sortDir?: "asc" | "desc"
  }) {
    const { skip, take } = getSkipTake({
      page: input.page,
      pageSize: input.pageSize,
      defaultPage: 1,
      defaultPageSize: 50,
      maxPageSize: 200,
    })

    const where: Prisma.SystemAlertWhereInput = {
      userId,
      ...(input.status ? { status: input.status as SystemAlertStatus } : null),
      ...(input.type ? { type: input.type as SystemAlertType } : null),
    }

    const sortBy = input.sortBy ?? "lastTriggeredAt"
    const sortDir = input.sortDir ?? "desc"

    const [total, items] = await this.prisma.$transaction([
      this.prisma.systemAlert.count({ where }),
      this.prisma.systemAlert.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip,
        take,
      }),
    ])

    return {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total,
      items: items.map((item) => this.toOutput(item)),
    }
  }

  async markRead(userId: string, id: string) {
    const existing = await this.prisma.systemAlert.findFirst({
      where: { id, userId },
    })
    if (!existing) throw new NotFoundException("Alert not found")

    const now = new Date()
    const updated = await this.prisma.systemAlert.update({
      where: { id },
      data: {
        status: existing.status === "ACTIVE" ? SystemAlertStatus.READ : existing.status,
        readAt: existing.readAt ?? now,
      },
    })

    return this.toOutput(updated)
  }

  async markUnread(userId: string, id: string) {
    const existing = await this.prisma.systemAlert.findFirst({
      where: { id, userId },
    })
    if (!existing) throw new NotFoundException("Alert not found")

    if (existing.status === "RESOLVED") {
      return this.toOutput(existing)
    }

    const updated = await this.prisma.systemAlert.update({
      where: { id },
      data: {
        status: SystemAlertStatus.ACTIVE,
        readAt: null,
      },
    })

    return this.toOutput(updated)
  }

  async resolve(userId: string, id: string) {
    const existing = await this.prisma.systemAlert.findFirst({
      where: { id, userId },
    })
    if (!existing) throw new NotFoundException("Alert not found")

    if (existing.status === "RESOLVED") {
      return this.toOutput(existing)
    }

    const updated = await this.prisma.systemAlert.update({
      where: { id },
      data: {
        status: SystemAlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    })

    return this.toOutput(updated)
  }

  async readAll(userId: string) {
    const now = new Date()
    const result = await this.prisma.systemAlert.updateMany({
      where: { userId, status: SystemAlertStatus.ACTIVE },
      data: { status: SystemAlertStatus.READ, readAt: now },
    })

    return { ok: true, updated: result.count }
  }
}
