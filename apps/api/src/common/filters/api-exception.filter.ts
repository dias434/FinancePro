import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common"

type ApiErrorResponse = {
  statusCode: number
  code: string
  message: string
  timestamp: string
  path: string
  details?: unknown
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "BAD_REQUEST"
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED"
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN"
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND"
    case HttpStatus.CONFLICT:
      return "CONFLICT"
    case HttpStatus.TOO_MANY_REQUESTS:
      return "TOO_MANY_REQUESTS"
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return "UNPROCESSABLE_ENTITY"
    default:
      if (status >= 500) return "INTERNAL_SERVER_ERROR"
      return `HTTP_${status}`
  }
}

function normalizeMessage(input: unknown): string {
  if (typeof input === "string" && input.trim()) return input
  if (Array.isArray(input)) {
    const first = input.find((v) => typeof v === "string" && v.trim())
    if (typeof first === "string") return first
  }
  return "Unexpected error"
}

function prismaFriendlyMessage(code: string): { statusCode: number; code: string; message: string } | null {
  switch (code) {
    case "P2021":
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: "DB_SCHEMA_OUT_OF_SYNC",
        message: "Banco sem tabelas/colunas esperadas. Rode as migrations do Prisma (prisma migrate dev).",
      }
    case "P1001":
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: "DB_UNREACHABLE",
        message: "Não foi possível conectar no banco. Verifique host/porta/serviço do Postgres.",
      }
    case "P1000":
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        code: "DB_AUTH_FAILED",
        message: "Falha de autenticação no banco. Verifique usuário/senha no DATABASE_URL.",
      }
    default:
      return null
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<any>()
    const res = ctx.getResponse<any>()

    const timestamp = new Date().toISOString()
    const path = req?.originalUrl ?? req?.url ?? ""

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus()
      const response = exception.getResponse()

      const responseObj =
        typeof response === "object" && response !== null ? (response as Record<string, unknown>) : null

      const rawMessage = responseObj?.message ?? response
      const code =
        typeof responseObj?.code === "string" && responseObj.code.trim()
          ? responseObj.code
          : statusCode === HttpStatus.BAD_REQUEST && Array.isArray(rawMessage)
            ? "VALIDATION_ERROR"
            : defaultCodeForStatus(statusCode)

      const message = normalizeMessage(rawMessage)
      const details = responseObj
        ? {
            ...responseObj,
            message: Array.isArray(responseObj.message) ? responseObj.message : undefined,
          }
        : typeof response === "string"
          ? { message: response }
          : undefined

      const body: ApiErrorResponse = {
        statusCode,
        code,
        message,
        timestamp,
        path,
        ...(details ? { details } : null),
      }

      const correlationId = req?.correlationId as string | undefined
      const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"
      const logPayload = {
        level,
        timestamp,
        message: "http_error",
        correlationId: correlationId ?? null,
        path,
        statusCode,
        code,
        errorMessage: message,
      }
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(logPayload))

      return res.status(statusCode).json(body)
    }

    const prismaCode = (exception as any)?.code
    if (typeof prismaCode === "string") {
      const mapped = prismaFriendlyMessage(prismaCode)
      if (mapped) {
        const body: ApiErrorResponse = {
          statusCode: mapped.statusCode,
          code: mapped.code,
          message: mapped.message,
          timestamp,
          path,
          ...(process.env.NODE_ENV !== "production" ? { details: { prismaCode } } : null),
        }
        const correlationId = req?.correlationId as string | undefined
        const logPayload = {
          level: mapped.statusCode >= 500 ? "error" : "warn",
          timestamp,
          message: "http_error",
          correlationId: correlationId ?? null,
          path,
          statusCode: mapped.statusCode,
          code: mapped.code,
          errorMessage: mapped.message,
        }
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(logPayload))
        return res.status(mapped.statusCode).json(body)
      }
    }

    const correlationId = req?.correlationId as string | undefined
    const structuredError = {
      level: "error",
      timestamp: new Date().toISOString(),
      message: "http_error",
      correlationId: correlationId ?? null,
      path,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: defaultCodeForStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      error: exception instanceof Error ? exception.message : String(exception),
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(structuredError))
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("Unhandled error:", exception)
    }

    const body: ApiErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: defaultCodeForStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      message: "Internal server error",
      timestamp,
      path,
    }

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body)
  }
}
