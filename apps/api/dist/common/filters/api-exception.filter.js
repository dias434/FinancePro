"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
function defaultCodeForStatus(status) {
    switch (status) {
        case common_1.HttpStatus.BAD_REQUEST:
            return "BAD_REQUEST";
        case common_1.HttpStatus.UNAUTHORIZED:
            return "UNAUTHORIZED";
        case common_1.HttpStatus.FORBIDDEN:
            return "FORBIDDEN";
        case common_1.HttpStatus.NOT_FOUND:
            return "NOT_FOUND";
        case common_1.HttpStatus.CONFLICT:
            return "CONFLICT";
        case common_1.HttpStatus.TOO_MANY_REQUESTS:
            return "TOO_MANY_REQUESTS";
        case common_1.HttpStatus.UNPROCESSABLE_ENTITY:
            return "UNPROCESSABLE_ENTITY";
        default:
            if (status >= 500)
                return "INTERNAL_SERVER_ERROR";
            return `HTTP_${status}`;
    }
}
function normalizeMessage(input) {
    if (typeof input === "string" && input.trim())
        return input;
    if (Array.isArray(input)) {
        const first = input.find((v) => typeof v === "string" && v.trim());
        if (typeof first === "string")
            return first;
    }
    return "Unexpected error";
}
function prismaFriendlyMessage(code) {
    switch (code) {
        case "P2021":
            return {
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                code: "DB_SCHEMA_OUT_OF_SYNC",
                message: "Banco sem tabelas/colunas esperadas. Rode as migrations do Prisma (prisma migrate dev).",
            };
        case "P1001":
            return {
                statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                code: "DB_UNREACHABLE",
                message: "Não foi possível conectar no banco. Verifique host/porta/serviço do Postgres.",
            };
        case "P1000":
            return {
                statusCode: common_1.HttpStatus.UNAUTHORIZED,
                code: "DB_AUTH_FAILED",
                message: "Falha de autenticação no banco. Verifique usuário/senha no DATABASE_URL.",
            };
        default:
            return null;
    }
}
let ApiExceptionFilter = class ApiExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();
        const timestamp = new Date().toISOString();
        const path = req?.originalUrl ?? req?.url ?? "";
        if (exception instanceof common_1.HttpException) {
            const statusCode = exception.getStatus();
            const response = exception.getResponse();
            const responseObj = typeof response === "object" && response !== null ? response : null;
            const rawMessage = responseObj?.message ?? response;
            const code = typeof responseObj?.code === "string" && responseObj.code.trim()
                ? responseObj.code
                : statusCode === common_1.HttpStatus.BAD_REQUEST && Array.isArray(rawMessage)
                    ? "VALIDATION_ERROR"
                    : defaultCodeForStatus(statusCode);
            const message = normalizeMessage(rawMessage);
            const details = responseObj
                ? {
                    ...responseObj,
                    message: Array.isArray(responseObj.message) ? responseObj.message : undefined,
                }
                : typeof response === "string"
                    ? { message: response }
                    : undefined;
            const body = {
                statusCode,
                code,
                message,
                timestamp,
                path,
                ...(details ? { details } : null),
            };
            const correlationId = req?.correlationId;
            const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
            const logPayload = {
                level,
                timestamp,
                message: "http_error",
                correlationId: correlationId ?? null,
                path,
                statusCode,
                code,
                errorMessage: message,
            };
            console.log(JSON.stringify(logPayload));
            return res.status(statusCode).json(body);
        }
        const prismaCode = exception?.code;
        if (typeof prismaCode === "string") {
            const mapped = prismaFriendlyMessage(prismaCode);
            if (mapped) {
                const body = {
                    statusCode: mapped.statusCode,
                    code: mapped.code,
                    message: mapped.message,
                    timestamp,
                    path,
                    ...(process.env.NODE_ENV !== "production" ? { details: { prismaCode } } : null),
                };
                const correlationId = req?.correlationId;
                const logPayload = {
                    level: mapped.statusCode >= 500 ? "error" : "warn",
                    timestamp,
                    message: "http_error",
                    correlationId: correlationId ?? null,
                    path,
                    statusCode: mapped.statusCode,
                    code: mapped.code,
                    errorMessage: mapped.message,
                };
                console.log(JSON.stringify(logPayload));
                return res.status(mapped.statusCode).json(body);
            }
        }
        const correlationId = req?.correlationId;
        const structuredError = {
            level: "error",
            timestamp: new Date().toISOString(),
            message: "http_error",
            correlationId: correlationId ?? null,
            path,
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            code: defaultCodeForStatus(common_1.HttpStatus.INTERNAL_SERVER_ERROR),
            error: exception instanceof Error ? exception.message : String(exception),
        };
        console.log(JSON.stringify(structuredError));
        if (process.env.NODE_ENV !== "production") {
            console.error("Unhandled error:", exception);
        }
        const body = {
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            code: defaultCodeForStatus(common_1.HttpStatus.INTERNAL_SERVER_ERROR),
            message: "Internal server error",
            timestamp,
            path,
        };
        return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json(body);
    }
};
exports.ApiExceptionFilter = ApiExceptionFilter;
exports.ApiExceptionFilter = ApiExceptionFilter = __decorate([
    (0, common_1.Catch)()
], ApiExceptionFilter);
