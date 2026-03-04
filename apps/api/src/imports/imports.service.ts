import { createHash } from "crypto"
import { mkdir, readdir, stat, writeFile } from "node:fs/promises"
import * as path from "node:path"

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  RequestTimeoutException,
  UnprocessableEntityException,
} from "@nestjs/common"
import { Prisma, TransactionType } from "@prisma/client"

import { getSkipTake } from "../common/dto/pagination.query"
import { PrismaService } from "../prisma/prisma.service"
import { ExportTransactionsQueryDto } from "./dto/export-transactions.query"
import { ImportLogsQueryDto } from "./dto/import-logs.query"
import { PreviewImportDto } from "./dto/preview-import.dto"
import { RunMonthlyBackupDto } from "./dto/run-monthly-backup.dto"
import { RunImportDto } from "./dto/run-import.dto"

export const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const IMPORT_MAX_ROWS = 5_000
const IMPORT_LOG_ITEM_CHUNK_SIZE = 500
const LOG_DEFAULT_ITEM_LIMIT = 100
const LOG_MAX_ITEM_LIMIT = 500
const IMPORT_DEFAULT_TIMEOUT_MS = 30_000
const IMPORT_MAX_TIMEOUT_MS = 120_000
const DEFAULT_MONTHLY_BACKUP_DIR = path.resolve(process.cwd(), "storage", "monthly-backups")

type ImportFormat = "CSV" | "OFX"
type ImportStatus = "COMPLETED" | "FAILED" | "ROLLED_BACK"
type ImportItemStatus = "IMPORTED" | "DUPLICATE" | "ERROR" | "ROLLED_BACK"

const IMPORT_STATUS = {
  COMPLETED: "COMPLETED" as ImportStatus,
  FAILED: "FAILED" as ImportStatus,
  ROLLED_BACK: "ROLLED_BACK" as ImportStatus,
}

const IMPORT_ITEM_STATUS = {
  IMPORTED: "IMPORTED" as ImportItemStatus,
  DUPLICATE: "DUPLICATE" as ImportItemStatus,
  ERROR: "ERROR" as ImportItemStatus,
  ROLLED_BACK: "ROLLED_BACK" as ImportItemStatus,
}

type UploadedImportFile = {
  originalname?: string
  mimetype?: string
  size?: number
  buffer?: Buffer
}

type CsvColumnMapping = {
  dateColumn?: string
  amountColumn?: string
  descriptionColumn?: string
  typeColumn?: string
  categoryColumn?: string
  accountColumn?: string
}

type ImportDefaults = {
  accountId?: string
  categoryId?: string
  type?: "INCOME" | "EXPENSE"
}

type NormalizedImportRow = {
  occurredAt: Date
  amountCents: number
  type: "INCOME" | "EXPENSE"
  accountId: string
  categoryId: string | null
  description: string | null
}

type ParsedImportRow = {
  rowIndex: number
  raw: Record<string, string>
  normalized: NormalizedImportRow | null
  issues: string[]
}

type LookupCache = {
  accountIds: Set<string>
  accountByName: Map<string, string>
  categoryIds: Set<string>
  categoryByName: Map<string, string>
}

type CsvParseOutput = {
  delimiter: string
  columns: string[]
  suggestedMapping: CsvColumnMapping
  effectiveMapping: CsvColumnMapping
  rows: ParsedImportRow[]
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase()
}

function normalizeDescription(value: string | null | undefined) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim()
  if (!normalized) return null
  return normalized.slice(0, 200)
}

function dayStartUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function addUtcDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, 0, 0, 0, 0))
}

function dayKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

function sanitizeFileName(fileName: string) {
  const stripped = fileName.replace(/[\\/:*?"<>|]+/g, "_").trim()
  if (!stripped) return "import.csv"
  return stripped.slice(0, 120)
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "user"
}

function monthKeyFromParts(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function resolveMonthlyBackupPeriod(input?: { year?: number; month?: number }) {
  const hasYear = typeof input?.year === "number"
  const hasMonth = typeof input?.month === "number"

  if (hasYear !== hasMonth) {
    throw new BadRequestException({
      code: "MONTHLY_BACKUP_PERIOD_INCOMPLETE",
      message: "Informe ano e mes juntos para gerar um backup especifico.",
    })
  }

  if (input?.year && input?.month) {
    const start = new Date(Date.UTC(input.year, input.month - 1, 1, 0, 0, 0, 0))
    const end = new Date(Date.UTC(input.year, input.month, 1, 0, 0, 0, 0))

    return {
      year: input.year,
      month: input.month,
      monthKey: monthKeyFromParts(input.year, input.month),
      start,
      end,
    }
  }

  const now = new Date()
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0))
  const year = lastMonthDate.getUTCFullYear()
  const month = lastMonthDate.getUTCMonth() + 1

  return {
    year,
    month,
    monthKey: monthKeyFromParts(year, month),
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
  }
}

function detectImportFormat(input: { format?: "CSV" | "OFX"; fileName: string; mimeType?: string }) {
  if (input.format) return input.format

  const ext = input.fileName.toLowerCase().split(".").pop()
  if (ext === "ofx") return "OFX" as const
  if (ext === "csv" || ext === "txt") return "CSV" as const

  const mime = (input.mimeType ?? "").toLowerCase()
  if (mime.includes("ofx")) return "OFX" as const
  if (mime.includes("csv") || mime.startsWith("text/")) return "CSV" as const

  throw new BadRequestException({
    code: "IMPORT_FORMAT_UNDETECTED",
    message: "Nao foi possivel identificar o formato do arquivo. Informe CSV ou OFX.",
  })
}

function decodeText(buffer: Buffer) {
  const utf8 = buffer.toString("utf8")
  if (utf8.includes("\uFFFD")) return buffer.toString("latin1")
  return utf8
}

function parseDateValue(input: string) {
  const value = input.trim()
  if (!value) return null

  const ofxMatch = value.match(/^(\d{4})(\d{2})(\d{2})/)
  if (ofxMatch) {
    const year = Number(ofxMatch[1])
    const month = Number(ofxMatch[2])
    const day = Number(ofxMatch[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    }
  }

  const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDateMatch) {
    return new Date(Date.UTC(Number(isoDateMatch[1]), Number(isoDateMatch[2]) - 1, Number(isoDateMatch[3]), 0, 0, 0, 0))
  }

  const brDateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brDateMatch) {
    return new Date(Date.UTC(Number(brDateMatch[3]), Number(brDateMatch[2]) - 1, Number(brDateMatch[1]), 0, 0, 0, 0))
  }

  const ymdDigitsMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (ymdDigitsMatch) {
    return new Date(Date.UTC(Number(ymdDigitsMatch[1]), Number(ymdDigitsMatch[2]) - 1, Number(ymdDigitsMatch[3]), 0, 0, 0, 0))
  }

  const fallback = new Date(value)
  if (Number.isNaN(fallback.getTime())) return null
  return new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate(), 0, 0, 0, 0))
}

function parseSignedAmountCents(input: string) {
  const value = input.trim()
  if (!value) return null

  const negativeByParens = value.startsWith("(") && value.endsWith(")")
  let cleaned = value.replace(/[()\s]/g, "").replace(/[R$]/gi, "")
  cleaned = cleaned.replace(/[^\d.,+-]/g, "")
  if (!cleaned) return null

  if (cleaned.includes(",") && cleaned.includes(".")) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".")
    } else {
      cleaned = cleaned.replace(/,/g, "")
    }
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".")
  }

  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) return null
  const signed = negativeByParens ? -Math.abs(parsed) : parsed
  return Math.round(signed * 100)
}

function parseTypeValue(input: string) {
  const token = normalizeToken(input)
  if (!token) return null

  const incomeTokens = new Set([
    "income",
    "entrada",
    "credit",
    "credito",
    "deposit",
    "dep",
    "directdep",
    "div",
    "int",
    "cr",
    "+",
  ])

  const expenseTokens = new Set([
    "expense",
    "saida",
    "debit",
    "debito",
    "payment",
    "check",
    "atm",
    "pos",
    "fee",
    "srvchg",
    "db",
    "-",
  ])

  if (incomeTokens.has(token)) return "INCOME" as const
  if (expenseTokens.has(token)) return "EXPENSE" as const
  if (token === "transfer" || token === "transferencia") return "TRANSFER" as const
  return null
}

function detectCsvDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ""
  const candidates = [",", ";", "\t", "|"]
  let best = ","
  let bestCount = -1
  for (const delimiter of candidates) {
    const count = firstLine.split(delimiter).length - 1
    if (count > bestCount) {
      best = delimiter
      bestCount = count
    }
  }
  return best
}

function parseCsvMatrix(content: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === delimiter) {
      row.push(cell)
      cell = ""
      continue
    }

    if (char === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      continue
    }

    if (char !== "\r") {
      cell += char
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

function parseJsonObject(input: string | undefined, label: string) {
  if (!input?.trim()) return {}
  try {
    const parsed = JSON.parse(input)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Object expected")
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new BadRequestException({
      code: "IMPORT_INVALID_JSON_FIELD",
      message: `Campo ${label} invalido. Use JSON valido.`,
    })
  }
}

function toDelimited(rows: string[][], delimiter: string) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const normalized = value ?? ""
          if (
            normalized.includes('"') ||
            normalized.includes("\n") ||
            normalized.includes("\r") ||
            normalized.includes(delimiter)
          ) {
            return `"${normalized.replace(/"/g, '""')}"`
          }
          return normalized
        })
        .join(delimiter),
    )
    .join("\r\n")
}

function toLogItemsLimit(input: number | undefined) {
  const value = Number.isFinite(input) ? Number(input) : LOG_DEFAULT_ITEM_LIMIT
  return Math.max(1, Math.min(LOG_MAX_ITEM_LIMIT, Math.trunc(value)))
}

function toImportTimeoutMs(raw: string | undefined) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return IMPORT_DEFAULT_TIMEOUT_MS
  const normalized = Math.trunc(parsed)
  if (normalized <= 0) return IMPORT_DEFAULT_TIMEOUT_MS
  return Math.min(IMPORT_MAX_TIMEOUT_MS, normalized)
}

function assertUploadMimeForFormat(format: ImportFormat, mimeType: string) {
  const mime = mimeType.trim().toLowerCase()
  if (!mime || mime === "application/octet-stream") return

  const isTextLike = mime.startsWith("text/")
  const isCsvMime = isTextLike || mime.includes("csv")
  const isOfxMime = isTextLike || mime.includes("ofx") || mime.includes("qfx")

  if (format === "CSV" && !isCsvMime) {
    throw new BadRequestException({
      code: "IMPORT_MIME_FORMAT_MISMATCH_CSV",
      message: "Tipo de arquivo nao corresponde ao formato CSV informado.",
    })
  }

  if (format === "OFX" && !isOfxMime) {
    throw new BadRequestException({
      code: "IMPORT_MIME_FORMAT_MISMATCH_OFX",
      message: "Tipo de arquivo nao corresponde ao formato OFX informado.",
    })
  }
}

function getOfxTagValue(source: string, tag: string) {
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i")
  const match = source.match(regex)
  return match?.[1]?.trim() ?? ""
}

@Injectable()
export class ImportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private getImportTimeoutMs() {
    return toImportTimeoutMs(process.env.IMPORT_PROCESSING_TIMEOUT_MS)
  }

  private async withImportTimeout<T>(task: Promise<T>) {
    const timeoutMs = this.getImportTimeoutMs()

    return await new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new RequestTimeoutException({
          code: "IMPORT_PROCESSING_TIMEOUT",
          message: "Importacao excedeu o tempo limite de processamento.",
        }))
      }, timeoutMs)

      task
        .then((value) => {
          clearTimeout(timeout)
          resolve(value)
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  async previewImport(userId: string, file: UploadedImportFile | undefined, dto: PreviewImportDto) {
    return await this.withImportTimeout((async () => {
      const upload = this.validateUpload(file)
      const fileName = sanitizeFileName(upload.originalname ?? "import.csv")
      const format = detectImportFormat({ format: dto.format, fileName, mimeType: upload.mimetype })
      assertUploadMimeForFormat(format, upload.mimetype ?? "")
      const content = decodeText(upload.buffer)
      const lookups = await this.loadLookups(userId)
      const defaults: ImportDefaults = dto.accountId?.trim() ? { accountId: dto.accountId.trim() } : {}

      if (format === "CSV") {
        const csv = this.parseCsvContent({
          content,
          delimiter: dto.delimiter,
          mapping: {},
          defaults,
          lookups,
        })

        const validRows = csv.rows.filter((row) => row.normalized && row.issues.length === 0).length
        const invalidRows = csv.rows.length - validRows

        return {
          format,
          fileName,
          delimiter: csv.delimiter,
          columns: csv.columns,
          suggestedMapping: csv.suggestedMapping,
          effectiveMapping: csv.effectiveMapping,
          totalRows: csv.rows.length,
          validRows,
          invalidRows,
          sample: csv.rows.slice(0, 20).map((row) => this.serializeParsedRow(row)),
        }
      }

      const ofxRows = this.parseOfxContent({
        content,
        defaults,
        lookups,
      })

      const validRows = ofxRows.filter((row) => row.normalized && row.issues.length === 0).length
      const invalidRows = ofxRows.length - validRows

      return {
        format,
        fileName,
        totalRows: ofxRows.length,
        validRows,
        invalidRows,
        sample: ofxRows.slice(0, 20).map((row) => this.serializeParsedRow(row)),
      }
    })())
  }

  async runImport(userId: string, file: UploadedImportFile | undefined, dto: RunImportDto) {
    return await this.withImportTimeout((async () => {
      const upload = this.validateUpload(file)
      const fileName = sanitizeFileName(upload.originalname ?? "import.csv")
      const format = detectImportFormat({ format: dto.format, fileName, mimeType: upload.mimetype })
      assertUploadMimeForFormat(format, upload.mimetype ?? "")
      const content = decodeText(upload.buffer)
      const lookups = await this.loadLookups(userId)
      const mapping = this.parseCsvMapping(dto.mapping)
      const defaults = this.parseImportDefaults(dto.defaults, dto.accountId)

      if (format === "CSV") {
        const csv = this.parseCsvContent({
          content,
          delimiter: dto.delimiter,
          mapping,
          defaults,
          lookups,
        })

        const result = await this.runImportRows(userId, {
          format,
          fileName,
          parsedRows: csv.rows,
          mapping: csv.effectiveMapping as unknown as Prisma.InputJsonValue,
          defaults: defaults as unknown as Prisma.InputJsonValue,
        })

        return {
          ...result,
          delimiter: csv.delimiter,
          columns: csv.columns,
          effectiveMapping: csv.effectiveMapping,
        }
      }

      const parsedRows = this.parseOfxContent({
        content,
        defaults,
        lookups,
      })

      return await this.runImportRows(userId, {
        format,
        fileName,
        parsedRows,
        defaults: defaults as unknown as Prisma.InputJsonValue,
      })
    })())
  }

  async listLogs(userId: string, query: ImportLogsQueryDto) {
    const prisma = this.prisma as any

    const { skip, take } = getSkipTake({
      page: query.page,
      pageSize: query.pageSize,
      defaultPage: 1,
      defaultPageSize: 20,
      maxPageSize: 100,
    })

    const itemLimit = toLogItemsLimit(query.itemLimit)

    const where = {
      userId,
      ...(query.status ? { status: query.status as ImportStatus } : null),
    }

    const [total, items] = await this.prisma.$transaction([
      prisma.importLog.count({ where }),
      prisma.importLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          replayedFrom: {
            select: {
              id: true,
              fileName: true,
              createdAt: true,
            },
          },
          items: {
            orderBy: { rowIndex: "asc" },
            take: itemLimit,
          },
        },
      }),
    ])

    return {
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      total,
      items: items.map((log: any) => this.serializeLog(log)),
    }
  }

  async getLog(userId: string, id: string, itemLimitRaw?: number) {
    const prisma = this.prisma as any

    const itemLimit = toLogItemsLimit(itemLimitRaw)

    const log = await prisma.importLog.findFirst({
      where: { id, userId },
      include: {
        replayedFrom: {
          select: {
            id: true,
            fileName: true,
            createdAt: true,
          },
        },
        items: {
          orderBy: { rowIndex: "asc" },
          take: itemLimit,
        },
      },
    })

    if (!log) {
      throw new NotFoundException({
        code: "IMPORT_LOG_NOT_FOUND",
        message: "Log de importacao nao encontrado",
      })
    }

    return this.serializeLog(log)
  }

  async replayLog(userId: string, id: string) {
    const prisma = this.prisma as any

    const source = await prisma.importLog.findFirst({
      where: { id, userId },
      include: {
        items: {
          orderBy: { rowIndex: "asc" },
        },
      },
    })

    if (!source) {
      throw new NotFoundException({
        code: "IMPORT_LOG_NOT_FOUND",
        message: "Log de importacao nao encontrado",
      })
    }

    const parsedRows: ParsedImportRow[] = source.items.map((item: any) => {
      const normalized = this.parseNormalizedFromJson(item.normalized)
      const issues: string[] = normalized ? [] : [item.errorMessage?.trim() || "Linha sem payload normalizado."]

      return {
        rowIndex: item.rowIndex,
        raw: this.parseRawRowFromJson(item.raw),
        normalized,
        issues,
      }
    })

    const replayFileName = sanitizeFileName(`replay-${source.fileName}`)

    const result = await this.runImportRows(userId, {
      format: source.format,
      fileName: replayFileName,
      parsedRows,
      mapping: source.mapping as Prisma.InputJsonValue | null,
      defaults: source.defaults as Prisma.InputJsonValue | null,
      replayedFromId: source.id,
    })

    return {
      sourceImportLogId: source.id,
      ...result,
    }
  }

  async rollbackLog(userId: string, id: string) {
    const prisma = this.prisma as any

    const log = await prisma.importLog.findFirst({
      where: { id, userId },
      include: {
        items: {
          where: {
            status: IMPORT_ITEM_STATUS.IMPORTED,
            transactionId: { not: null },
          },
          select: {
            id: true,
            transactionId: true,
          },
        },
      },
    })

    if (!log) {
      throw new NotFoundException({
        code: "IMPORT_LOG_NOT_FOUND",
        message: "Log de importacao nao encontrado",
      })
    }

    if (log.status === IMPORT_STATUS.ROLLED_BACK) {
      return {
        importLogId: log.id,
        status: log.status,
        deletedTransactions: 0,
        affectedRows: 0,
      }
    }

    const transactionIds: string[] = Array.from(
      new Set<string>(
        log.items
          .map((item: any): string | null =>
            typeof item.transactionId === "string" ? item.transactionId : null,
          )
          .filter((value: string | null): value is string => typeof value === "string" && value.length > 0),
      ),
    )

    let deletedTransactions = 0
    if (transactionIds.length > 0) {
      const deleted = await this.prisma.transaction.deleteMany({
        where: {
          userId,
          id: { in: transactionIds },
        },
      })
      deletedTransactions = deleted.count
    }

    await prisma.importLogItem.updateMany({
      where: {
        importLogId: log.id,
        status: IMPORT_ITEM_STATUS.IMPORTED,
      },
      data: {
        status: IMPORT_ITEM_STATUS.ROLLED_BACK,
      },
    })

    const updated = await prisma.importLog.update({
      where: { id: log.id },
      data: {
        status: IMPORT_STATUS.ROLLED_BACK,
        rolledBackAt: new Date(),
      },
    })

    return {
      importLogId: updated.id,
      status: updated.status,
      deletedTransactions,
      affectedRows: transactionIds.length,
      rolledBackAt: toIso(updated.rolledBackAt),
    }
  }

  private getMonthlyBackupRootDir() {
    return process.env.MONTHLY_BACKUP_DIR?.trim() || DEFAULT_MONTHLY_BACKUP_DIR
  }

  private getMonthlyBackupUserDir(userId: string) {
    return path.join(this.getMonthlyBackupRootDir(), sanitizePathSegment(userId))
  }

  private async buildTransactionExport(
    userId: string,
    query: {
      format?: "csv" | "excel"
      from?: string
      to?: string
      accountId?: string
      type?: "INCOME" | "EXPENSE" | "TRANSFER"
      fileName?: string
    },
  ) {
    const format = query.format ?? "csv"
    const fromDate = query.from ? new Date(query.from) : undefined
    const toDate = query.to ? new Date(query.to) : undefined

    if (fromDate && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException({
        code: "IMPORT_EXPORT_INVALID_FROM_DATE",
        message: "Parametro from invalido",
      })
    }
    if (toDate && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException({
        code: "IMPORT_EXPORT_INVALID_TO_DATE",
        message: "Parametro to invalido",
      })
    }

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(query.accountId ? { accountId: query.accountId } : null),
      ...(query.type ? { type: query.type as TransactionType } : null),
      ...(fromDate || toDate
        ? {
            occurredAt: {
              ...(fromDate ? { gte: fromDate } : null),
              ...(toDate ? { lte: toDate } : null),
            },
          }
        : null),
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 10_000,
    })

    const header = [
      "date",
      "type",
      "amount",
      "amountCents",
      "currency",
      "account",
      "category",
      "description",
      "tags",
      "costCenter",
      "notes",
    ]
    const rows = transactions.map((item) => [
      dayKey(item.occurredAt),
      item.type,
      (item.amountCents / 100).toFixed(2),
      String(item.amountCents),
      item.account?.currency ?? "BRL",
      item.account?.name ?? item.accountId,
      item.category?.name ?? "",
      (item.description ?? "").replace(/\s+/g, " ").trim(),
      Array.isArray((item as any).tags) ? (item as any).tags.join(", ") : "",
      ((item as any).costCenter ?? "").replace(/\s+/g, " ").trim(),
      (item as any).notes ?? "",
    ])

    const delimiter = format === "excel" ? "\t" : ";"
    const content = toDelimited([header, ...rows], delimiter)
    const now = new Date()
    const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}-${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}`
    const extension = format === "excel" ? "xls" : "csv"
    const mimeType = format === "excel" ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8"
    const fileName = query.fileName?.trim() ? sanitizeFileName(query.fileName.trim()) : `transactions-${stamp}.${extension}`

    return {
      format,
      fileName,
      mimeType,
      count: rows.length,
      content,
    }
  }

  async listMonthlyBackups(userId: string) {
    const directory = this.getMonthlyBackupUserDir(userId)

    try {
      const fileNames = await readdir(directory)
      const items = await Promise.all(
        fileNames
          .filter((fileName) => fileName.toLowerCase().endsWith(".csv") || fileName.toLowerCase().endsWith(".xls"))
          .map(async (fileName) => {
            const filePath = path.join(directory, fileName)
            const info = await stat(filePath)
            const match = fileName.match(/transactions-(\d{4}-\d{2})\./i)

            return {
              fileName,
              monthKey: match?.[1] ?? null,
              sizeBytes: info.size,
              updatedAt: info.mtime.toISOString(),
            }
          }),
      )

      items.sort((left, right) => right.fileName.localeCompare(left.fileName))
      return { items }
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
        return { items: [] as Array<{ fileName: string; monthKey: string | null; sizeBytes: number; updatedAt: string }> }
      }
      throw error
    }
  }

  async runMonthlyBackup(userId: string, dto: RunMonthlyBackupDto = {}) {
    const period = resolveMonthlyBackupPeriod(dto)
    const directory = this.getMonthlyBackupUserDir(userId)
    const fileName = `transactions-${period.monthKey}.csv`
    const filePath = path.join(directory, fileName)

    if (!dto.force) {
      try {
        const info = await stat(filePath)
        return {
          created: false,
          fileName,
          monthKey: period.monthKey,
          sizeBytes: info.size,
          updatedAt: info.mtime.toISOString(),
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
          throw error
        }
      }
    }

    await mkdir(directory, { recursive: true })

    const result = await this.buildTransactionExport(userId, {
      format: "csv",
      from: period.start.toISOString(),
      to: new Date(period.end.getTime() - 1).toISOString(),
      fileName,
    })

    await writeFile(filePath, result.content, "utf8")
    const info = await stat(filePath)

    return {
      created: true,
      fileName,
      monthKey: period.monthKey,
      sizeBytes: info.size,
      updatedAt: info.mtime.toISOString(),
      count: result.count,
    }
  }

  async runAutomaticMonthlyBackups() {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    })

    let created = 0
    let skipped = 0

    for (const user of users) {
      const result = await this.runMonthlyBackup(user.id, { force: false })
      if (result.created) {
        created += 1
      } else {
        skipped += 1
      }
    }

    return {
      users: users.length,
      created,
      skipped,
      monthKey: resolveMonthlyBackupPeriod().monthKey,
    }
  }

  async exportTransactions(userId: string, query: ExportTransactionsQueryDto) {
    return await this.buildTransactionExport(userId, query)
  }

  private validateUpload(file: UploadedImportFile | undefined) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException({
        code: "IMPORT_FILE_REQUIRED",
        message: "Arquivo obrigatorio",
      })
    }

    const mime = (file.mimetype ?? "").toLowerCase()
    if (
      mime &&
      !mime.startsWith("text/") &&
      !mime.includes("csv") &&
      !mime.includes("ofx") &&
      mime !== "application/octet-stream"
    ) {
      throw new BadRequestException({
        code: "IMPORT_INVALID_FILE_TYPE",
        message: "Tipo de arquivo nao permitido",
      })
    }

    const size = typeof file.size === "number" ? file.size : file.buffer.length
    if (size > IMPORT_MAX_FILE_SIZE_BYTES) {
      throw new UnprocessableEntityException({
        code: "IMPORT_FILE_TOO_LARGE",
        message: `Arquivo excede o limite de ${Math.floor(IMPORT_MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB`,
      })
    }

    return {
      originalname: file.originalname ?? "import.csv",
      mimetype: file.mimetype ?? "",
      size,
      buffer: file.buffer,
    }
  }

  private parseCsvMapping(rawMapping: string | undefined): CsvColumnMapping {
    const parsed = parseJsonObject(rawMapping, "mapping")

    const output: CsvColumnMapping = {}
    const keys: Array<keyof CsvColumnMapping> = [
      "dateColumn",
      "amountColumn",
      "descriptionColumn",
      "typeColumn",
      "categoryColumn",
      "accountColumn",
    ]

    for (const key of keys) {
      const value = parsed[key]
      if (typeof value === "string" && value.trim()) {
        output[key] = value.trim()
      }
    }

    return output
  }

  private parseImportDefaults(rawDefaults: string | undefined, accountIdFromDto?: string) {
    const parsed = parseJsonObject(rawDefaults, "defaults")
    const output: ImportDefaults = {}

    if (typeof parsed.accountId === "string" && parsed.accountId.trim()) {
      output.accountId = parsed.accountId.trim()
    } else if (accountIdFromDto?.trim()) {
      output.accountId = accountIdFromDto.trim()
    }

    if (typeof parsed.categoryId === "string" && parsed.categoryId.trim()) {
      output.categoryId = parsed.categoryId.trim()
    }

    if (typeof parsed.type === "string" && parsed.type.trim()) {
      const type = parsed.type.trim().toUpperCase()
      if (type !== "INCOME" && type !== "EXPENSE") {
        throw new BadRequestException({
          code: "IMPORT_DEFAULTS_INVALID_TYPE",
          message: "defaults.type deve ser INCOME ou EXPENSE",
        })
      }
      output.type = type
    }

    return output
  }

  private async loadLookups(userId: string): Promise<LookupCache> {
    const [accounts, categories] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
      this.prisma.category.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
    ])

    const accountIds = new Set(accounts.map((account) => account.id))
    const accountByName = new Map<string, string>()
    for (const account of accounts) {
      accountByName.set(normalizeToken(account.name), account.id)
    }

    const categoryIds = new Set(categories.map((category) => category.id))
    const categoryByName = new Map<string, string>()
    for (const category of categories) {
      categoryByName.set(normalizeToken(category.name), category.id)
    }

    return {
      accountIds,
      accountByName,
      categoryIds,
      categoryByName,
    }
  }

  private parseCsvContent(input: {
    content: string
    delimiter?: string
    mapping: CsvColumnMapping
    defaults: ImportDefaults
    lookups: LookupCache
  }): CsvParseOutput {
    const delimiter = input.delimiter?.trim() || detectCsvDelimiter(input.content)
    if (![",", ";", "\t", "|"].includes(delimiter)) {
      throw new BadRequestException({
        code: "IMPORT_INVALID_DELIMITER",
        message: "Delimiter invalido. Use uma das opcoes: ',', ';', TAB ou '|'.",
      })
    }

    const matrix = parseCsvMatrix(input.content, delimiter)
    if (matrix.length === 0) {
      throw new BadRequestException({
        code: "IMPORT_CSV_EMPTY",
        message: "CSV vazio",
      })
    }

    const headerRow = matrix[0]
    const normalizedHeaderSeen = new Map<string, number>()
    const columns = headerRow.map((value, index) => {
      const base = (value ?? "").replace(/^\uFEFF/, "").trim() || `column_${index + 1}`
      const count = normalizedHeaderSeen.get(base) ?? 0
      normalizedHeaderSeen.set(base, count + 1)
      return count === 0 ? base : `${base}_${count + 1}`
    })

    const suggestedMapping = this.suggestCsvMapping(columns)
    const resolvedMapping = this.resolveCsvMappingAgainstHeaders(columns, {
      ...suggestedMapping,
      ...input.mapping,
    })

    const rows: ParsedImportRow[] = []
    for (let rowIdx = 1; rowIdx < matrix.length; rowIdx += 1) {
      const cells = matrix[rowIdx]
      const raw: Record<string, string> = {}
      let hasAnyValue = false

      for (let colIdx = 0; colIdx < columns.length; colIdx += 1) {
        const key = columns[colIdx]
        const value = (cells[colIdx] ?? "").trim()
        if (value) hasAnyValue = true
        raw[key] = value
      }

      if (!hasAnyValue) continue

      if (rows.length >= IMPORT_MAX_ROWS) {
        throw new UnprocessableEntityException({
          code: "IMPORT_MAX_ROWS_REACHED",
          message: `O limite de ${IMPORT_MAX_ROWS} linhas por importacao foi atingido.`,
        })
      }

      rows.push(
        this.normalizeCsvRow({
          rowIndex: rowIdx + 1,
          raw,
          mapping: resolvedMapping,
          defaults: input.defaults,
          lookups: input.lookups,
        }),
      )
    }

    return {
      delimiter,
      columns,
      suggestedMapping,
      effectiveMapping: resolvedMapping,
      rows,
    }
  }

  private suggestCsvMapping(columns: string[]): CsvColumnMapping {
    const pick = (aliases: string[]) => {
      const normalizedAliases = aliases.map((value) => normalizeToken(value))
      return (
        columns.find((column) => normalizedAliases.includes(normalizeToken(column))) ??
        undefined
      )
    }

    return {
      dateColumn: pick(["data", "date", "dtposted", "occurredAt", "lancamento"]),
      amountColumn: pick(["valor", "amount", "amountCents", "trnamt"]),
      descriptionColumn: pick(["descricao", "description", "memo", "historico", "name"]),
      typeColumn: pick(["tipo", "type", "trntype"]),
      categoryColumn: pick(["categoria", "category", "categoryId"]),
      accountColumn: pick(["conta", "account", "accountId"]),
    }
  }

  private resolveCsvMappingAgainstHeaders(columns: string[], mapping: CsvColumnMapping): CsvColumnMapping {
    const resolve = (columnName?: string) => {
      if (!columnName?.trim()) return undefined
      const exact = columns.find((column) => column === columnName.trim())
      if (exact) return exact
      const token = normalizeToken(columnName)
      return columns.find((column) => normalizeToken(column) === token)
    }

    return {
      dateColumn: resolve(mapping.dateColumn),
      amountColumn: resolve(mapping.amountColumn),
      descriptionColumn: resolve(mapping.descriptionColumn),
      typeColumn: resolve(mapping.typeColumn),
      categoryColumn: resolve(mapping.categoryColumn),
      accountColumn: resolve(mapping.accountColumn),
    }
  }

  private normalizeCsvRow(input: {
    rowIndex: number
    raw: Record<string, string>
    mapping: CsvColumnMapping
    defaults: ImportDefaults
    lookups: LookupCache
  }): ParsedImportRow {
    const issues: string[] = []

    const dateRaw = input.mapping.dateColumn ? input.raw[input.mapping.dateColumn] ?? "" : ""
    if (!input.mapping.dateColumn) {
      issues.push("Mapeie a coluna de data (dateColumn).")
    }
    const occurredAt = parseDateValue(dateRaw)
    if (!occurredAt) {
      issues.push("Data invalida.")
    }

    const amountRaw = input.mapping.amountColumn ? input.raw[input.mapping.amountColumn] ?? "" : ""
    if (!input.mapping.amountColumn) {
      issues.push("Mapeie a coluna de valor (amountColumn).")
    }
    const signedAmountCents = parseSignedAmountCents(amountRaw)
    if (signedAmountCents === null) {
      issues.push("Valor invalido.")
    }

    const rawTypeValue = input.mapping.typeColumn ? input.raw[input.mapping.typeColumn] ?? "" : ""
    const parsedType = rawTypeValue ? parseTypeValue(rawTypeValue) : null

    let inferredType: "INCOME" | "EXPENSE" | null = null
    if (parsedType === "TRANSFER") {
      issues.push("Tipo TRANSFER nao e suportado na importacao.")
    } else if (parsedType === "INCOME" || parsedType === "EXPENSE") {
      inferredType = parsedType
    } else if (input.defaults.type) {
      inferredType = input.defaults.type
    } else if (signedAmountCents !== null) {
      inferredType = signedAmountCents < 0 ? "EXPENSE" : "INCOME"
    } else {
      issues.push("Nao foi possivel definir o tipo (INCOME/EXPENSE).")
    }

    const accountRaw = input.mapping.accountColumn ? input.raw[input.mapping.accountColumn] ?? "" : ""
    const accountId = this.resolveLookupId({
      candidate: accountRaw || input.defaults.accountId || "",
      type: "account",
      lookups: input.lookups,
    })
    if (!accountId) {
      issues.push("Conta nao encontrada. Informe accountId valido ou mapeie accountColumn.")
    }

    const categoryRaw = input.mapping.categoryColumn ? input.raw[input.mapping.categoryColumn] ?? "" : ""
    const categoryCandidate = categoryRaw || input.defaults.categoryId || ""
    const categoryId = categoryCandidate
      ? this.resolveLookupId({
          candidate: categoryCandidate,
          type: "category",
          lookups: input.lookups,
        })
      : null
    if (categoryCandidate && !categoryId) {
      issues.push("Categoria nao encontrada.")
    }

    const descriptionRaw = input.mapping.descriptionColumn ? input.raw[input.mapping.descriptionColumn] ?? "" : ""
    const description = normalizeDescription(descriptionRaw)
    const amountCents = signedAmountCents === null ? null : Math.abs(signedAmountCents)
    if (amountCents !== null && amountCents <= 0) {
      issues.push("Valor deve ser maior que zero.")
    }

    if (issues.length > 0 || !occurredAt || amountCents === null || !inferredType || !accountId) {
      return {
        rowIndex: input.rowIndex,
        raw: input.raw,
        normalized: null,
        issues,
      }
    }

    return {
      rowIndex: input.rowIndex,
      raw: input.raw,
      normalized: {
        occurredAt: dayStartUtc(occurredAt),
        amountCents,
        type: inferredType,
        accountId,
        categoryId,
        description,
      },
      issues,
    }
  }

  private parseOfxContent(input: {
    content: string
    defaults: ImportDefaults
    lookups: LookupCache
  }): ParsedImportRow[] {
    let blocks = Array.from(input.content.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)).map((match) => match[1])
    if (blocks.length === 0) {
      blocks = input.content
        .split(/<STMTTRN>/i)
        .slice(1)
        .map((chunk) => {
          const stop = chunk.split(/(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTRS>|<\/STMTTRNRS>)/i, 1)[0]
          return stop ?? ""
        })
        .filter((chunk) => chunk.trim().length > 0)
    }

    if (blocks.length === 0) {
      throw new BadRequestException({
        code: "IMPORT_OFX_EMPTY",
        message: "Arquivo OFX sem transacoes STMTTRN",
      })
    }

    const accountHint = getOfxTagValue(input.content, "ACCTID")
    const rows: ParsedImportRow[] = []

    for (let idx = 0; idx < blocks.length; idx += 1) {
      if (rows.length >= IMPORT_MAX_ROWS) {
        throw new UnprocessableEntityException({
          code: "IMPORT_MAX_ROWS_REACHED",
          message: `O limite de ${IMPORT_MAX_ROWS} linhas por importacao foi atingido.`,
        })
      }

      const block = blocks[idx]
      const raw: Record<string, string> = {
        DTPOSTED: getOfxTagValue(block, "DTPOSTED"),
        TRNAMT: getOfxTagValue(block, "TRNAMT"),
        TRNTYPE: getOfxTagValue(block, "TRNTYPE"),
        MEMO: getOfxTagValue(block, "MEMO"),
        NAME: getOfxTagValue(block, "NAME"),
        FITID: getOfxTagValue(block, "FITID"),
        ACCTID: accountHint,
      }

      const issues: string[] = []
      const occurredAt = parseDateValue(raw.DTPOSTED)
      if (!occurredAt) issues.push("Data invalida.")

      const signedAmountCents = parseSignedAmountCents(raw.TRNAMT)
      if (signedAmountCents === null) issues.push("Valor invalido.")

      const parsedType = parseTypeValue(raw.TRNTYPE)
      let type: "INCOME" | "EXPENSE" | null = null
      if (parsedType === "TRANSFER") {
        issues.push("Tipo TRANSFER nao e suportado na importacao.")
      } else if (parsedType === "INCOME" || parsedType === "EXPENSE") {
        type = parsedType
      } else if (input.defaults.type) {
        type = input.defaults.type
      } else if (signedAmountCents !== null) {
        type = signedAmountCents < 0 ? "EXPENSE" : "INCOME"
      }

      const amountCents = signedAmountCents === null ? null : Math.abs(signedAmountCents)
      if (amountCents !== null && amountCents <= 0) {
        issues.push("Valor deve ser maior que zero.")
      }

      const accountCandidate = input.defaults.accountId || raw.ACCTID
      const accountId = this.resolveLookupId({
        candidate: accountCandidate,
        type: "account",
        lookups: input.lookups,
      })
      if (!accountId) {
        issues.push("Conta nao encontrada. Informe defaults.accountId ou accountId no formulario.")
      }

      const categoryCandidate = input.defaults.categoryId
      const categoryId = categoryCandidate
        ? this.resolveLookupId({
            candidate: categoryCandidate,
            type: "category",
            lookups: input.lookups,
          })
        : null
      if (categoryCandidate && !categoryId) {
        issues.push("Categoria padrao nao encontrada.")
      }

      const description = normalizeDescription(raw.MEMO || raw.NAME || raw.FITID)

      rows.push({
        rowIndex: idx + 1,
        raw,
        normalized:
          issues.length > 0 || !occurredAt || !amountCents || !type || !accountId
            ? null
            : {
                occurredAt: dayStartUtc(occurredAt),
                amountCents,
                type,
                accountId,
                categoryId,
                description,
              },
        issues,
      })
    }

    return rows
  }

  private resolveLookupId(input: {
    candidate?: string
    type: "account" | "category"
    lookups: LookupCache
  }) {
    const raw = input.candidate?.trim()
    if (!raw) return null

    if (input.type === "account") {
      if (input.lookups.accountIds.has(raw)) return raw
      const byName = input.lookups.accountByName.get(normalizeToken(raw))
      return byName ?? null
    }

    if (input.lookups.categoryIds.has(raw)) return raw
    const byName = input.lookups.categoryByName.get(normalizeToken(raw))
    return byName ?? null
  }

  private serializeParsedRow(row: ParsedImportRow) {
    return {
      rowIndex: row.rowIndex,
      raw: row.raw,
      issues: row.issues,
      normalized: row.normalized
        ? {
            occurredAt: row.normalized.occurredAt.toISOString(),
            amountCents: row.normalized.amountCents,
            type: row.normalized.type,
            accountId: row.normalized.accountId,
            categoryId: row.normalized.categoryId,
            description: row.normalized.description ?? undefined,
          }
        : null,
    }
  }

  private buildDedupeKey(userId: string, row: NormalizedImportRow) {
    const payload = [
      userId,
      row.accountId,
      row.type,
      String(row.amountCents),
      dayKey(row.occurredAt),
      normalizeToken(row.description ?? ""),
    ].join("|")

    return createHash("sha256").update(payload).digest("hex")
  }

  private async loadExistingDedupeKeys(userId: string, rows: NormalizedImportRow[]) {
    if (rows.length === 0) return new Set<string>()

    const accountIds = Array.from(new Set(rows.map((row) => row.accountId)))
    const minDate = rows.reduce((min, row) => (row.occurredAt < min ? row.occurredAt : min), rows[0].occurredAt)
    const maxDate = rows.reduce((max, row) => (row.occurredAt > max ? row.occurredAt : max), rows[0].occurredAt)

    const existing = await this.prisma.transaction.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
        type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
        occurredAt: {
          gte: dayStartUtc(minDate),
          lt: addUtcDays(dayStartUtc(maxDate), 1),
        },
      },
      select: {
        occurredAt: true,
        amountCents: true,
        type: true,
        accountId: true,
        description: true,
      },
    })

    const keys = new Set<string>()
    for (const tx of existing) {
      keys.add(
        this.buildDedupeKey(userId, {
          occurredAt: dayStartUtc(tx.occurredAt),
          amountCents: tx.amountCents,
          type: tx.type === TransactionType.INCOME ? "INCOME" : "EXPENSE",
          accountId: tx.accountId,
          categoryId: null,
          description: normalizeDescription(tx.description),
        }),
      )
    }

    return keys
  }

  private async runImportRows(
    userId: string,
    input: {
      format: ImportFormat
      fileName: string
      parsedRows: ParsedImportRow[]
      mapping?: Prisma.InputJsonValue | null
      defaults?: Prisma.InputJsonValue | null
      replayedFromId?: string
    },
  ) {
    const prisma = this.prisma as any

    const log = await prisma.importLog.create({
      data: {
        userId,
        format: input.format,
        fileName: input.fileName,
        status: IMPORT_STATUS.FAILED,
        ...(input.mapping ? { mapping: input.mapping } : null),
        ...(input.defaults ? { defaults: input.defaults } : null),
        ...(input.replayedFromId ? { replayedFromId: input.replayedFromId } : null),
      },
    })

    const validRows = input.parsedRows
      .filter((row): row is ParsedImportRow & { normalized: NormalizedImportRow } => row.normalized !== null && row.issues.length === 0)
      .map((row) => row.normalized)

    const existingKeys = await this.loadExistingDedupeKeys(userId, validRows)
    const seenInBatch = new Set<string>()

    let importedRows = 0
    let duplicateRows = 0
    let errorRows = 0

    const logItems: Array<Record<string, unknown>> = []

    for (const row of input.parsedRows) {
      if (!row.normalized || row.issues.length > 0) {
        errorRows += 1
        logItems.push({
          importLogId: log.id,
          rowIndex: row.rowIndex,
          status: IMPORT_ITEM_STATUS.ERROR,
          raw: row.raw as unknown as Prisma.InputJsonValue,
          normalized: row.normalized ? this.normalizedToJson(row.normalized) : Prisma.JsonNull,
          errorMessage: row.issues.join(" "),
        })
        continue
      }

      const dedupeKey = this.buildDedupeKey(userId, row.normalized)
      if (existingKeys.has(dedupeKey) || seenInBatch.has(dedupeKey)) {
        duplicateRows += 1
        logItems.push({
          importLogId: log.id,
          rowIndex: row.rowIndex,
          status: IMPORT_ITEM_STATUS.DUPLICATE,
          dedupeKey,
          raw: row.raw as unknown as Prisma.InputJsonValue,
          normalized: this.normalizedToJson(row.normalized),
          errorMessage: "Linha duplicada (ja existe ou repetida no arquivo).",
        })
        continue
      }

      try {
        const created = await this.prisma.transaction.create({
          data: {
            userId,
            type: row.normalized.type as TransactionType,
            occurredAt: row.normalized.occurredAt,
            amountCents: row.normalized.amountCents,
            accountId: row.normalized.accountId,
            categoryId: row.normalized.categoryId,
            description: row.normalized.description ?? null,
          },
        })

        importedRows += 1
        seenInBatch.add(dedupeKey)
        existingKeys.add(dedupeKey)

        logItems.push({
          importLogId: log.id,
          rowIndex: row.rowIndex,
          status: IMPORT_ITEM_STATUS.IMPORTED,
          dedupeKey,
          raw: row.raw as unknown as Prisma.InputJsonValue,
          normalized: this.normalizedToJson(row.normalized),
          transactionId: created.id,
        })
      } catch (error) {
        errorRows += 1
        logItems.push({
          importLogId: log.id,
          rowIndex: row.rowIndex,
          status: IMPORT_ITEM_STATUS.ERROR,
          dedupeKey,
          raw: row.raw as unknown as Prisma.InputJsonValue,
          normalized: this.normalizedToJson(row.normalized),
          errorMessage: error instanceof Error ? error.message : "Falha ao inserir transacao",
        })
      }
    }

    for (let i = 0; i < logItems.length; i += IMPORT_LOG_ITEM_CHUNK_SIZE) {
      const chunk = logItems.slice(i, i + IMPORT_LOG_ITEM_CHUNK_SIZE)
      if (chunk.length > 0) {
        await prisma.importLogItem.createMany({ data: chunk })
      }
    }

    const status = importedRows > 0 || duplicateRows > 0 ? IMPORT_STATUS.COMPLETED : IMPORT_STATUS.FAILED

    const updatedLog = await prisma.importLog.update({
      where: { id: log.id },
      data: {
        status,
        totalRows: input.parsedRows.length,
        importedRows,
        duplicateRows,
        errorRows,
        completedAt: new Date(),
      },
      include: {
        items: {
          orderBy: { rowIndex: "asc" },
          take: 50,
        },
      },
    })

    return {
      importLogId: updatedLog.id,
      status: updatedLog.status,
      totals: {
        totalRows: updatedLog.totalRows,
        importedRows: updatedLog.importedRows,
        duplicateRows: updatedLog.duplicateRows,
        errorRows: updatedLog.errorRows,
      },
      itemsPreview: updatedLog.items.map((item: any) => ({
        rowIndex: item.rowIndex,
        status: item.status,
        errorMessage: item.errorMessage ?? undefined,
        transactionId: item.transactionId ?? undefined,
      })),
      completedAt: toIso(updatedLog.completedAt),
    }
  }

  private normalizedToJson(row: NormalizedImportRow): Prisma.InputJsonValue {
    return {
      occurredAt: row.occurredAt.toISOString(),
      amountCents: row.amountCents,
      type: row.type,
      accountId: row.accountId,
      categoryId: row.categoryId,
      description: row.description,
    } as Prisma.InputJsonValue
  }

  private parseNormalizedFromJson(payload: Prisma.JsonValue | null): NormalizedImportRow | null {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null
    const data = payload as Record<string, unknown>

    const occurredAtRaw = typeof data.occurredAt === "string" ? data.occurredAt : ""
    const occurredAt = new Date(occurredAtRaw)
    if (Number.isNaN(occurredAt.getTime())) return null

    const amountCents = typeof data.amountCents === "number" ? data.amountCents : Number.NaN
    if (!Number.isFinite(amountCents) || amountCents <= 0) return null

    const typeRaw = typeof data.type === "string" ? data.type : ""
    if (typeRaw !== "INCOME" && typeRaw !== "EXPENSE") return null

    const accountId = typeof data.accountId === "string" ? data.accountId.trim() : ""
    if (!accountId) return null

    const categoryId = typeof data.categoryId === "string" && data.categoryId.trim() ? data.categoryId.trim() : null

    const description =
      typeof data.description === "string" && data.description.trim()
        ? normalizeDescription(data.description)
        : null

    return {
      occurredAt: dayStartUtc(occurredAt),
      amountCents: Math.trunc(amountCents),
      type: typeRaw,
      accountId,
      categoryId,
      description,
    }
  }

  private parseRawRowFromJson(payload: Prisma.JsonValue | null): Record<string, string> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {}
    const output: Record<string, string> = {}
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      output[key] = typeof value === "string" ? value : JSON.stringify(value)
    }
    return output
  }

  private serializeLog(log: any) {
    return {
      id: log.id,
      format: log.format,
      fileName: log.fileName,
      status: log.status,
      mapping: log.mapping ?? null,
      defaults: log.defaults ?? null,
      totalRows: log.totalRows,
      importedRows: log.importedRows,
      duplicateRows: log.duplicateRows,
      errorRows: log.errorRows,
      replayedFrom: log.replayedFrom
        ? {
            id: log.replayedFrom.id,
            fileName: log.replayedFrom.fileName,
            createdAt: toIso(log.replayedFrom.createdAt),
          }
        : null,
      completedAt: toIso(log.completedAt),
      rolledBackAt: toIso(log.rolledBackAt),
      createdAt: toIso(log.createdAt),
      updatedAt: toIso(log.updatedAt),
      items: Array.isArray(log.items)
        ? log.items.map((item: any) => ({
            id: item.id,
            rowIndex: item.rowIndex,
            status: item.status,
            dedupeKey: item.dedupeKey ?? null,
            raw: item.raw ?? null,
            normalized: item.normalized ?? null,
            errorMessage: item.errorMessage ?? null,
            transactionId: item.transactionId ?? null,
            createdAt: toIso(item.createdAt),
            updatedAt: toIso(item.updatedAt),
          }))
        : [],
    }
  }
}
