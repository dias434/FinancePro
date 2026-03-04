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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
function toPositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    const normalized = Math.trunc(parsed);
    return normalized > 0 ? normalized : fallback;
}
function normalizeIp(raw) {
    const value = (raw ?? "").trim();
    if (!value)
        return "unknown";
    if (value === "::1")
        return "127.0.0.1";
    if (value.startsWith("::ffff:"))
        return value.slice("::ffff:".length);
    return value;
}
let RateLimitGuard = class RateLimitGuard {
    config;
    jwt;
    ipWindowMs;
    ipMaxRequests;
    userWindowMs;
    userMaxRequests;
    authIpWindowMs;
    authIpMaxRequests;
    skippedPathPrefixes = ["/health", "/docs", "/openapi.json"];
    ipBuckets = new Map();
    userBuckets = new Map();
    authIpBuckets = new Map();
    requestCount = 0;
    constructor(config, jwt) {
        this.config = config;
        this.jwt = jwt;
        this.ipWindowMs = toPositiveInt(this.config.get("RATE_LIMIT_IP_WINDOW_MS"), 60_000);
        this.ipMaxRequests = toPositiveInt(this.config.get("RATE_LIMIT_IP_MAX_REQUESTS"), 120);
        this.userWindowMs = toPositiveInt(this.config.get("RATE_LIMIT_USER_WINDOW_MS"), 60_000);
        this.userMaxRequests = toPositiveInt(this.config.get("RATE_LIMIT_USER_MAX_REQUESTS"), 240);
        this.authIpWindowMs = toPositiveInt(this.config.get("RATE_LIMIT_AUTH_IP_WINDOW_MS"), 60_000);
        this.authIpMaxRequests = toPositiveInt(this.config.get("RATE_LIMIT_AUTH_IP_MAX_REQUESTS"), 30);
    }
    canActivate(context) {
        const http = context.switchToHttp();
        const request = http.getRequest();
        const response = http.getResponse();
        const path = this.getPath(request);
        if (this.shouldSkip(path))
            return true;
        const now = Date.now();
        this.cleanupStaleBuckets(now);
        const ip = this.extractClientIp(request);
        const userId = this.extractUserId(request);
        if (path.startsWith("/auth/")) {
            const authState = this.consumeBucket(this.authIpBuckets, `auth-ip:${ip}`, this.authIpWindowMs, now);
            this.setRateHeaders(response, "auth-ip", this.authIpMaxRequests, this.authIpWindowMs, authState);
            if (authState.count > this.authIpMaxRequests) {
                this.setRetryAfter(response, authState.windowStartMs + this.authIpWindowMs - now);
                throw new common_1.HttpException({
                    code: "RATE_LIMIT_AUTH_IP_EXCEEDED",
                    message: "Too many authentication requests from this IP",
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
        }
        const ipState = this.consumeBucket(this.ipBuckets, `ip:${ip}`, this.ipWindowMs, now);
        this.setRateHeaders(response, "ip", this.ipMaxRequests, this.ipWindowMs, ipState);
        if (ipState.count > this.ipMaxRequests) {
            this.setRetryAfter(response, ipState.windowStartMs + this.ipWindowMs - now);
            throw new common_1.HttpException({
                code: "RATE_LIMIT_IP_EXCEEDED",
                message: "Too many requests from this IP",
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (userId) {
            const userState = this.consumeBucket(this.userBuckets, `user:${userId}`, this.userWindowMs, now);
            this.setRateHeaders(response, "user", this.userMaxRequests, this.userWindowMs, userState);
            if (userState.count > this.userMaxRequests) {
                this.setRetryAfter(response, userState.windowStartMs + this.userWindowMs - now);
                throw new common_1.HttpException({
                    code: "RATE_LIMIT_USER_EXCEEDED",
                    message: "Too many requests for this authenticated user",
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
        }
        return true;
    }
    shouldSkip(path) {
        return this.skippedPathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    }
    getPath(request) {
        if (typeof request?.path === "string" && request.path.trim())
            return request.path;
        if (typeof request?.url === "string" && request.url.trim()) {
            const [path] = request.url.split("?");
            return path || "/";
        }
        return "/";
    }
    extractClientIp(request) {
        const forwardedFor = request?.headers?.["x-forwarded-for"];
        if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
            return normalizeIp(String(forwardedFor[0]).split(",")[0]);
        }
        if (typeof forwardedFor === "string" && forwardedFor.trim()) {
            return normalizeIp(forwardedFor.split(",")[0]);
        }
        const realIp = request?.headers?.["x-real-ip"];
        if (typeof realIp === "string" && realIp.trim())
            return normalizeIp(realIp);
        if (typeof request?.ip === "string" && request.ip.trim())
            return normalizeIp(request.ip);
        if (typeof request?.socket?.remoteAddress === "string" && request.socket.remoteAddress.trim()) {
            return normalizeIp(request.socket.remoteAddress);
        }
        return "unknown";
    }
    extractUserId(request) {
        const header = request?.headers?.authorization;
        if (typeof header !== "string" || !header.startsWith("Bearer "))
            return null;
        const accessSecret = this.config.get("JWT_ACCESS_SECRET");
        if (!accessSecret)
            return null;
        const token = header.slice("Bearer ".length).trim();
        if (!token)
            return null;
        try {
            const payload = this.jwt.verify(token, { secret: accessSecret });
            const sub = typeof payload?.sub === "string" ? payload.sub.trim() : "";
            return sub || null;
        }
        catch {
            return null;
        }
    }
    consumeBucket(map, key, windowMs, now) {
        const existing = map.get(key);
        if (!existing || now - existing.windowStartMs >= windowMs) {
            const next = { windowStartMs: now, count: 1 };
            map.set(key, next);
            return next;
        }
        existing.count += 1;
        return existing;
    }
    setRateHeaders(response, scope, limit, windowMs, state) {
        if (!response || typeof response.setHeader !== "function")
            return;
        const suffix = scope === "auth-ip" ? "Auth-Ip" : scope === "user" ? "User" : "Ip";
        const remaining = Math.max(0, limit - state.count);
        const resetEpochSeconds = Math.ceil((state.windowStartMs + windowMs) / 1000);
        response.setHeader(`X-RateLimit-${suffix}-Limit`, String(limit));
        response.setHeader(`X-RateLimit-${suffix}-Remaining`, String(remaining));
        response.setHeader(`X-RateLimit-${suffix}-Reset`, String(resetEpochSeconds));
    }
    setRetryAfter(response, msUntilReset) {
        if (!response || typeof response.setHeader !== "function")
            return;
        const seconds = Math.max(1, Math.ceil(msUntilReset / 1000));
        response.setHeader("Retry-After", String(seconds));
    }
    cleanupStaleBuckets(now) {
        this.requestCount += 1;
        if (this.requestCount % 200 !== 0)
            return;
        this.cleanupMap(this.ipBuckets, this.ipWindowMs, now);
        this.cleanupMap(this.userBuckets, this.userWindowMs, now);
        this.cleanupMap(this.authIpBuckets, this.authIpWindowMs, now);
    }
    cleanupMap(map, windowMs, now) {
        for (const [key, value] of map.entries()) {
            if (now - value.windowStartMs >= windowMs * 2) {
                map.delete(key);
            }
        }
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_1.ConfigService)),
    __param(1, (0, common_1.Inject)(jwt_1.JwtService)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        jwt_1.JwtService])
], RateLimitGuard);
