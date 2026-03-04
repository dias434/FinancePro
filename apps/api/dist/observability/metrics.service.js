"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const MAX_ENDPOINTS = 200;
const MAX_RECENT_ERRORS = 50;
function normalizePath(path) {
    if (!path || path === "/")
        return path;
    return path
        .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, "/:id")
        .replace(/\/[0-9a-fA-F-]{36}/g, "/:id")
        .replace(/\/\d+/g, "/:id");
}
let MetricsService = class MetricsService {
    endpoints = new Map();
    recentErrors = [];
    startTime = Date.now();
    recordRequest(params) {
        const key = `${params.method} ${normalizePath(params.path)}`;
        const existing = this.endpoints.get(key);
        const metrics = existing
            ? {
                totalRequests: existing.totalRequests + 1,
                errorCount: existing.errorCount + (params.statusCode >= 400 ? 1 : 0),
                latencySumMs: existing.latencySumMs + params.durationMs,
                lastRequestAt: new Date().toISOString(),
            }
            : {
                totalRequests: 1,
                errorCount: params.statusCode >= 400 ? 1 : 0,
                latencySumMs: params.durationMs,
                lastRequestAt: new Date().toISOString(),
            };
        this.endpoints.set(key, metrics);
        if (params.statusCode >= 400) {
            this.recentErrors.push({
                path: params.path,
                statusCode: params.statusCode,
                timestamp: new Date().toISOString(),
                correlationId: params.correlationId,
            });
            if (this.recentErrors.length > MAX_RECENT_ERRORS) {
                this.recentErrors.shift();
            }
        }
        if (this.endpoints.size > MAX_ENDPOINTS) {
            const entries = Array.from(this.endpoints.entries());
            entries.sort((a, b) => (b[1].lastRequestAt ?? "").localeCompare(a[1].lastRequestAt ?? ""));
            const toDelete = entries.slice(MAX_ENDPOINTS).map(([k]) => k);
            toDelete.forEach((k) => this.endpoints.delete(k));
        }
    }
    getSnapshot(importsTotal, importsLast24h) {
        const endpoints = {};
        for (const [key, val] of this.endpoints) {
            endpoints[key] = { ...val };
        }
        return {
            endpoints,
            importsTotal,
            importsLast24h,
            uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
            collectedAt: new Date().toISOString(),
        };
    }
    getRecentErrors() {
        return [...this.recentErrors].reverse();
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)()
], MetricsService);
