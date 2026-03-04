import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { CategoryType, Prisma } from "@prisma/client"

import { getSkipTake } from "../common/dto/pagination.query"
import { PrismaService } from "../prisma/prisma.service"

function toIso(date: Date) {
  return date.toISOString()
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, input: {
    page?: number
    pageSize?: number
    q?: string
    type?: "INCOME" | "EXPENSE"
    sortBy?: "name" | "createdAt"
    sortDir?: "asc" | "desc"
  }) {
    const { skip, take } = getSkipTake({
      page: input.page,
      pageSize: input.pageSize,
      defaultPage: 1,
      defaultPageSize: 50,
      maxPageSize: 200,
    })

    const where: Prisma.CategoryWhereInput = {
      userId,
      ...(input.type ? { type: input.type as CategoryType } : null),
      ...(input.q ? { name: { contains: input.q, mode: "insensitive" } } : null),
    }

    const sortBy = input.sortBy ?? "createdAt"
    const sortDir = input.sortDir ?? "desc"

    const [total, categories] = await this.prisma.$transaction([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
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
      items: categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon ?? undefined,
        color: c.color ?? undefined,
        createdAt: toIso(c.createdAt),
        updatedAt: toIso(c.updatedAt),
      })),
    }
  }

  async create(userId: string, input: {
    name: string
    type?: "INCOME" | "EXPENSE"
    icon?: string
    color?: string
  }) {
    try {
      const created = await this.prisma.category.create({
        data: {
          userId,
          name: input.name.trim(),
          type: (input.type as CategoryType | undefined) ?? CategoryType.EXPENSE,
          icon: input.icon,
          color: input.color,
        },
      })

      return {
        id: created.id,
        name: created.name,
        type: created.type,
        icon: created.icon ?? undefined,
        color: created.color ?? undefined,
        createdAt: toIso(created.createdAt),
        updatedAt: toIso(created.updatedAt),
      }
    } catch (error) {
      const prismaCode = (error as any)?.code
      if (prismaCode === "P2002") {
        throw new ConflictException("JÇ­ existe uma categoria com esse nome", {
          cause: error as any,
          description: "UNIQUE_CATEGORY_NAME",
        } as any)
      }
      throw error
    }
  }

  async update(userId: string, id: string, input: {
    name?: string
    type?: "INCOME" | "EXPENSE"
    icon?: string
    color?: string
  }) {
    const existing = await this.prisma.category.findFirst({ where: { id, userId } })
    if (!existing) throw new NotFoundException("Categoria nÇœo encontrada")

    try {
      const updated = await this.prisma.category.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : null),
          ...(input.type !== undefined ? { type: input.type as CategoryType } : null),
          ...(input.icon !== undefined ? { icon: input.icon } : null),
          ...(input.color !== undefined ? { color: input.color } : null),
        },
      })

      return {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        icon: updated.icon ?? undefined,
        color: updated.color ?? undefined,
        createdAt: toIso(updated.createdAt),
        updatedAt: toIso(updated.updatedAt),
      }
    } catch (error) {
      const prismaCode = (error as any)?.code
      if (prismaCode === "P2002") {
        throw new ConflictException("JÇ­ existe uma categoria com esse nome", {
          cause: error as any,
          description: "UNIQUE_CATEGORY_NAME",
        } as any)
      }
      throw error
    }
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.category.findFirst({ where: { id, userId } })
    if (!existing) throw new NotFoundException("Categoria nÇœo encontrada")

    await this.prisma.category.delete({ where: { id } })
    return { ok: true }
  }
}

