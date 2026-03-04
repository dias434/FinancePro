import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
type HealthCheck = {
    name: string;
    status: "ok" | "degraded" | "down";
    latencyMs?: number;
    message?: string;
};
export declare class HealthController {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    health(): {
        ok: boolean;
    };
    live(): {
        ok: boolean;
        status: string;
    };
    ready(): Promise<{
        ok: boolean;
        status: "ok" | "degraded" | "down";
        checks: HealthCheck[];
        timestamp: string;
    }>;
}
export {};
