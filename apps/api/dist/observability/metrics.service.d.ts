export type EndpointMetrics = {
    totalRequests: number;
    errorCount: number;
    latencySumMs: number;
    lastRequestAt: string | null;
};
export type MetricsSnapshot = {
    endpoints: Record<string, EndpointMetrics>;
    importsTotal: number;
    importsLast24h: number;
    uptimeSeconds: number;
    collectedAt: string;
};
export declare class MetricsService {
    private readonly endpoints;
    private readonly recentErrors;
    private readonly startTime;
    recordRequest(params: {
        method: string;
        path: string;
        statusCode: number;
        durationMs: number;
        correlationId?: string;
    }): void;
    getSnapshot(importsTotal: number, importsLast24h: number): MetricsSnapshot;
    getRecentErrors(): typeof this.recentErrors;
}
