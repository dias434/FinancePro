import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
type RegisterPushDeviceInput = {
    token: string;
    platform: "android" | "ios";
    deviceName?: string;
};
export type PushAlertNotificationInput = {
    dedupeKey: string;
    userId: string;
    sourceId: string;
    type: string;
    title: string;
    message: string;
    payload?: unknown;
};
export declare class PushNotificationsService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    registerDevice(userId: string, input: RegisterPushDeviceInput): Promise<{
        ok: boolean;
    }>;
    deactivateDevice(userId: string, rawToken: string): Promise<{
        ok: boolean;
        updated: number;
    }>;
    sendSystemAlerts(alerts: PushAlertNotificationInput[]): Promise<void>;
    private sendBatch;
    private deactivateTokens;
}
export {};
