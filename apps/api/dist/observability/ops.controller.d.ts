import { MetricsService } from "./metrics.service";
import { PrismaService } from "../prisma/prisma.service";
export declare class OpsController {
    private readonly metrics;
    private readonly prisma;
    constructor(metrics: MetricsService, prisma: PrismaService);
    getMetrics(): Promise<import("./metrics.service").MetricsSnapshot>;
    dashboard(): Promise<{
        uptimeSeconds: number;
        collectedAt: string;
        imports: {
            total: number;
            last24h: number;
            recent: {
                createdAt: Date;
                id: string;
                status: import("@prisma/client").$Enums.ImportStatus;
                format: import("@prisma/client").$Enums.ImportFormat;
                totalRows: number;
                importedRows: number;
                errorRows: number;
            }[];
        };
        requests: {
            topEndpoints: {
                endpoint: string;
                totalRequests: number;
                errorCount: number;
                avgLatencyMs: number;
            }[];
            recentErrors: {
                path: string;
                statusCode: number;
                timestamp: string;
                correlationId?: string;
            }[];
        };
    }>;
}
