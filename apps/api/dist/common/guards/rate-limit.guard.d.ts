import { CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
export declare class RateLimitGuard implements CanActivate {
    private readonly config;
    private readonly jwt;
    private readonly ipWindowMs;
    private readonly ipMaxRequests;
    private readonly userWindowMs;
    private readonly userMaxRequests;
    private readonly authIpWindowMs;
    private readonly authIpMaxRequests;
    private readonly skippedPathPrefixes;
    private readonly ipBuckets;
    private readonly userBuckets;
    private readonly authIpBuckets;
    private requestCount;
    constructor(config: ConfigService, jwt: JwtService);
    canActivate(context: ExecutionContext): boolean;
    private shouldSkip;
    private getPath;
    private extractClientIp;
    private extractUserId;
    private consumeBucket;
    private setRateHeaders;
    private setRetryAfter;
    private cleanupStaleBuckets;
    private cleanupMap;
}
