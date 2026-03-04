import "reflect-metadata"
import { randomUUID } from "crypto"

import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import helmet from "helmet"

import { AppModule } from "./app.module"
import { ApiExceptionFilter } from "./common/filters/api-exception.filter"
import { resolveCorsOrigins } from "./common/http/cors.config"

function readCorrelationId(raw: unknown) {
  if (Array.isArray(raw) && raw.length > 0) {
    const first = String(raw[0]).trim()
    return first || randomUUID()
  }

  if (typeof raw === "string" && raw.trim()) {
    return raw.trim()
  }

  return randomUUID()
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false })
  const config = app.get(ConfigService)
  const httpAdapter = app.getHttpAdapter().getInstance()
  httpAdapter.disable?.("x-powered-by")

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.useGlobalFilters(new ApiExceptionFilter())
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "no-referrer" },
    }),
  )
  app.use((request: any, response: any, next: () => void) => {
    const correlationId = readCorrelationId(request?.headers?.["x-correlation-id"])
    request.correlationId = correlationId
    response.setHeader("X-Correlation-Id", correlationId)

    const startedAt = Date.now()
    response.on("finish", () => {
      const durationMs = Date.now() - startedAt
      const statusCode = Number(response.statusCode ?? 0)
      const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"
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
      }
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(payload))
    })
    next()
  })

  const allowedOrigins = resolveCorsOrigins({
    nodeEnv: config.get("NODE_ENV"),
    corsOrigin: config.get("CORS_ORIGIN"),
    corsOriginsDev: config.get("CORS_ORIGINS_DEV"),
    corsOriginsStaging: config.get("CORS_ORIGINS_STAGING"),
    corsOriginsProd: config.get("CORS_ORIGINS_PROD"),
  })

  app.enableCors({ origin: allowedOrigins, credentials: true })

  const port = Number(config.get("PORT") ?? 3001)
  await app.listen(port)
}

void bootstrap()
