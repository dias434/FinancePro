"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const crypto_1 = require("crypto");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const api_exception_filter_1 = require("./common/filters/api-exception.filter");
const cors_config_1 = require("./common/http/cors.config");
function readCorrelationId(raw) {
    if (Array.isArray(raw) && raw.length > 0) {
        const first = String(raw[0]).trim();
        return first || (0, crypto_1.randomUUID)();
    }
    if (typeof raw === "string" && raw.trim()) {
        return raw.trim();
    }
    return (0, crypto_1.randomUUID)();
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { cors: false });
    const config = app.get(config_1.ConfigService);
    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.disable?.("x-powered-by");
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new api_exception_filter_1.ApiExceptionFilter());
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: "no-referrer" },
    }));
    app.use((request, response, next) => {
        const correlationId = readCorrelationId(request?.headers?.["x-correlation-id"]);
        request.correlationId = correlationId;
        response.setHeader("X-Correlation-Id", correlationId);
        const startedAt = Date.now();
        response.on("finish", () => {
            const durationMs = Date.now() - startedAt;
            const statusCode = Number(response.statusCode ?? 0);
            const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
            const payload = {
                level,
                timestamp: new Date().toISOString(),
                message: "http_request",
                correlationId,
                method: request.method,
                path: request.originalUrl ?? request.url,
                statusCode,
                durationMs,
                userId: request?.user?.sub ?? null,
            };
            console.log(JSON.stringify(payload));
        });
        next();
    });
    const allowedOrigins = (0, cors_config_1.resolveCorsOrigins)({
        nodeEnv: config.get("NODE_ENV"),
        corsOrigin: config.get("CORS_ORIGIN"),
        corsOriginsDev: config.get("CORS_ORIGINS_DEV"),
        corsOriginsStaging: config.get("CORS_ORIGINS_STAGING"),
        corsOriginsProd: config.get("CORS_ORIGINS_PROD"),
    });
    app.enableCors({ origin: allowedOrigins, credentials: true });
    const port = Number(config.get("PORT") ?? 3001);
    await app.listen(port);
}
void bootstrap();
