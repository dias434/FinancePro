import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common"
import { Prisma, TransactionType } from "@prisma/client"
import { randomUUID } from "crypto"

import { getSkipTake } from "../common/dto/pagination.query"
import { PrismaService } from "../prisma/prisma.service"

function toIso(date: Date) {
  return date.toISOString()
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function normalizeIdOrNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeSingleLine(value: string | null | undefined, maxLength: number) {
  if (value === undefined || value === null) return null
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

function normalizeLongText(value: string | null | undefined, maxLength: number) {
  if (value === undefined || value === null) return null
  const normalized = value.replace(/\r\n/g, "\n").trim()
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

function normalizeTags(value: string[] | null | undefined) {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const output: string[] = []

  for (const item of value) {
    if (typeof item !== "string") continue
    const normalized = item.replace(/\s+/g, " ").trim().slice(0, 24)
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    output.push(normalized)
    if (output.length >= 12) break
  }

  return output
}

function toTransactionOutput(t: any) {
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
  }
}

@Injectable()
export class TransactionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    input: {
      page?: number
      pageSize?: number
      q?: string
      type?: "INCOME" | "EXPENSE" | "TRANSFER"
      accountId?: string
      categoryId?: string
      from?: string
      to?: string
      sortBy?: "occurredAt" | "amountCents" | "createdAt"
      sortDir?: "asc" | "desc"
      limit?: number
    },
  ) {
    const pageSize =
      input.limit && Number.isFinite(input.limit) ? Math.min(500, Math.max(1, input.limit)) : input.pageSize

    const { skip, take } = getSkipTake({
      page: input.page,
      pageSize,
      defaultPage: 1,
      defaultPageSize: 50,
      maxPageSize: 500,
    })

    const fromDate = input.from ? new Date(input.from) : undefined
    const toDate = input.to ? new Date(input.to) : undefined

    if (fromDate && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException({
        code: "TRANSACTIONS_INVALID_FROM_DATE",
        message: "`from` invalido",
      })
    }

    if (toDate && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException({
        code: "TRANSACTIONS_INVALID_TO_DATE",
        message: "`to` invalido",
      })
    }

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(input.type ? { type: input.type as TransactionType } : null),
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
    }

    const sortBy = input.sortBy ?? "occurredAt"
    const sortDir = input.sortDir ?? "desc"

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
    ])

    return {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total,
      items: items.map((t) => toTransactionOutput(t)),
    }
  }

  private async assertAccountOwned(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } })
    if (!account) {
      throw new NotFoundException({
        code: "ACCOUNT_NOT_FOUND",
        message: "Conta nao encontrada",
      })
    }
    return account
  }

  private async assertCategoryOwned(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } })
    if (!category) {
      throw new NotFoundException({
        code: "CATEGORY_NOT_FOUND",
        message: "Categoria nao encontrada",
      })
    }
    return category
  }

  async create(
    userId: string,
    input: {
      type: "INCOME" | "EXPENSE" | "TRANSFER"
      occurredAt: Date
      amountCents: number
      accountId: string
      categoryId?: string | null
      transferAccountId?: string | null
      description?: string
      tags?: string[]
      costCenter?: string | null
      notes?: string | null
      installmentTotal?: number
    },
  ) {
    const categoryId = normalizeIdOrNull(input.categoryId)
    const transferAccountId = normalizeIdOrNull(input.transferAccountId)
    const description = normalizeSingleLine(input.description, 200)
    const tags = normalizeTags(input.tags)
    const costCenter = normalizeSingleLine(input.costCenter, 80)
    const notes = normalizeLongText(input.notes, 2000)

    const sourceAccount = await this.assertAccountOwned(userId, input.accountId)

    if (input.installmentTotal && input.type === "TRANSFER") {
      throw new UnprocessableEntityException({
        code: "INSTALLMENTS_NOT_ALLOWED_TRANSFER",
        message: "Parcelamento nao permitido em transferencias",
      })
    }

    if (input.type === "TRANSFER") {
      if (!transferAccountId) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_DESTINATION_REQUIRED",
          message: "Informe a conta de destino da transferencia",
        })
      }
      if (transferAccountId === input.accountId) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_SAME_ACCOUNT",
          message: "Conta de origem e destino devem ser diferentes",
        })
      }
      const targetAccount = await this.assertAccountOwned(userId, transferAccountId)
      if (sourceAccount.currency !== targetAccount.currency) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_CURRENCY_MISMATCH",
          message: "Transferencias entre moedas diferentes nao sao suportadas nesta versao.",
        })
      }
      if (categoryId) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_CATEGORY_NOT_ALLOWED",
          message: "Transferencias nao suportam categoria",
        })
      }
    } else {
      if (transferAccountId) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_ACCOUNT_NOT_ALLOWED",
          message: "A conta de destino so pode ser usada em transferencias",
        })
      }
      if (categoryId) {
        await this.assertCategoryOwned(userId, categoryId)
      }
    }

    const installmentTotal = input.installmentTotal && input.installmentTotal >= 2 ? input.installmentTotal : 1

    try {
      if (installmentTotal > 1) {
        const groupId = randomUUID()
        const baseAmount = Math.floor(input.amountCents / installmentTotal)
        const remainder = input.amountCents - baseAmount * installmentTotal
        const created: Array<{ id: string; occurredAt: Date; amountCents: number }> = []

        for (let i = 0; i < installmentTotal; i++) {
          const amountCents = i === installmentTotal - 1 ? baseAmount + remainder : baseAmount
          const occurredAt = addMonths(input.occurredAt, i)
          const t = await this.prisma.transaction.create({
            data: {
              userId,
              type: input.type as TransactionType,
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
          })
          created.push({ id: t.id, occurredAt: t.occurredAt, amountCents: t.amountCents })
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
        }
      }

      const created = await this.prisma.transaction.create({
        data: {
          userId,
          type: input.type as TransactionType,
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
      })

      return toTransactionOutput(created)
    } catch (error) {
      const prismaCode = (error as any)?.code
      if (prismaCode === "P2003") {
        throw new ConflictException({
          code: "TRANSACTION_REFERENCE_CONFLICT",
          message: "Referencia invalida (conta/categoria)",
        })
      }
      throw error
    }
  }

  async update(
    userId: string,
    id: string,
    input: {
      type?: "INCOME" | "EXPENSE" | "TRANSFER"
      occurredAt?: Date
      amountCents?: number
      accountId?: string
      categoryId?: string | null
      transferAccountId?: string | null
      description?: string | null
      tags?: string[]
      costCenter?: string | null
      notes?: string | null
    },
  ) {
    const existing = await this.prisma.transaction.findFirst({ where: { id, userId } })
    if (!existing) {
      throw new NotFoundException({
        code: "TRANSACTION_NOT_FOUND",
        message: "Transacao nao encontrada",
      })
    }

    const nextType = input.type ?? (existing.type as any)
    const nextAccountId = input.accountId ?? existing.accountId
    const nextCategoryId = input.categoryId !== undefined ? normalizeIdOrNull(input.categoryId) : existing.categoryId
    const nextTransferAccountId =
      input.transferAccountId !== undefined
        ? normalizeIdOrNull(input.transferAccountId)
        : (existing as any).transferAccountId ?? null
    const nextTags = input.tags !== undefined ? normalizeTags(input.tags) : Array.isArray((existing as any).tags) ? (existing as any).tags : []
    const nextCostCenter =
      input.costCenter !== undefined ? normalizeSingleLine(input.costCenter, 80) : ((existing as any).costCenter ?? null)
    const nextNotes =
      input.notes !== undefined ? normalizeLongText(input.notes, 2000) : ((existing as any).notes ?? null)

    const sourceAccount = await this.assertAccountOwned(userId, nextAccountId)

    if (nextType === "TRANSFER") {
      if (!nextTransferAccountId) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_DESTINATION_REQUIRED",
          message: "Informe a conta de destino da transferencia",
        })
      }
      if (nextTransferAccountId === nextAccountId) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_SAME_ACCOUNT",
          message: "Conta de origem e destino devem ser diferentes",
        })
      }
      const targetAccount = await this.assertAccountOwned(userId, nextTransferAccountId)
      if (sourceAccount.currency !== targetAccount.currency) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_CURRENCY_MISMATCH",
          message: "Transferencias entre moedas diferentes nao sao suportadas nesta versao.",
        })
      }
      if (nextCategoryId) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_CATEGORY_NOT_ALLOWED",
          message: "Transferencias nao suportam categoria",
        })
      }
    } else {
      if (nextTransferAccountId) {
        throw new UnprocessableEntityException({
          code: "TRANSFER_ACCOUNT_NOT_ALLOWED",
          message: "A conta de destino so pode ser usada em transferencias",
        })
      }
      if (nextCategoryId) {
        await this.assertCategoryOwned(userId, nextCategoryId)
      }
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type as TransactionType } : null),
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
    })

    return toTransactionOutput(updated)
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.transaction.findFirst({ where: { id, userId } })
    if (!existing) {
      throw new NotFoundException({
        code: "TRANSACTION_NOT_FOUND",
        message: "Transacao nao encontrada",
      })
    }

    await this.prisma.transaction.delete({ where: { id } })
    return { ok: true }
  }
}
