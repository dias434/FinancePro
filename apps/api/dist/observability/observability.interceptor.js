"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const metrics_service_1 = require("./metrics.service");
let ObservabilityInterceptor = class ObservabilityInterceptor {
    metrics;
    constructor(metrics) {
        this.metrics = metrics;
    }
    intercept(context, next) {
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();
        const correlationId = req?.correlationId;
        const method = req?.method ?? "GET";
        const path = req?.originalUrl ?? req?.url ?? "";
        const start = Date.now();
        return next.handle().pipe((0, operators_1.tap)(() => {
            const durationMs = Date.now() - start;
            const statusCode = res?.statusCode ?? 200;
            this.metrics.recordRequest({
                method,
                path,
                statusCode,
                durationMs,
                correlationId,
            });
        }), (0, operators_1.catchError)((err) => {
            const durationMs = Date.now() - start;
            const statusCode = err?.status ?? err?.statusCode ?? 500;
            this.metrics.recordRequest({
                method,
                path,
                statusCode: Number(statusCode),
                durationMs,
                correlationId,
            });
            throw err;
        }));
    }
};
exports.ObservabilityInterceptor = ObservabilityInterceptor;
exports.ObservabilityInterceptor = ObservabilityInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService])
], ObservabilityInterceptor);
