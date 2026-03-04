import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common"
import { Observable } from "rxjs"
import { tap, catchError } from "rxjs/operators"

import { MetricsService } from "./metrics.service"

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp()
    const req = http.getRequest<any>()
    const res = http.getResponse<any>()

    const correlationId = req?.correlationId as string | undefined
    const method = req?.method ?? "GET"
    const path = req?.originalUrl ?? req?.url ?? ""
    const start = Date.now()

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start
        const statusCode = res?.statusCode ?? 200
        this.metrics.recordRequest({
          method,
          path,
          statusCode,
          durationMs,
          correlationId,
        })
      }),
      catchError((err) => {
        const durationMs = Date.now() - start
        const statusCode = err?.status ?? err?.statusCode ?? 500
        this.metrics.recordRequest({
          method,
          path,
          statusCode: Number(statusCode),
          durationMs,
          correlationId,
        })
        throw err
      }),
    )
  }
}
