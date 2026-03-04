import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
export declare class AlertsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private toOutput;
    list(userId: string, input: {
        page?: number;
        pageSize?: number;
        status?: "ACTIVE" | "READ" | "RESOLVED";
        type?: "BUDGET_THRESHOLD" | "BUDGET_OVER_LIMIT" | "GOAL_DUE_SOON" | "GOAL_OVERDUE" | "BILL_DUE_SOON" | "BILL_OVERDUE" | "SPENDING_SPIKE_WEEKLY" | "SPENDING_SPIKE_MONTHLY";
        sortBy?: "createdAt" | "lastTriggeredAt";
        sortDir?: "asc" | "desc";
    }): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            type: import("@prisma/client").$Enums.SystemAlertType;
            status: import("@prisma/client").$Enums.SystemAlertStatus;
            sourceId: string;
            title: string;
            message: string;
            payload: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | undefined;
            firstTriggeredAt: string;
            lastTriggeredAt: string;
            readAt: string | null;
            resolvedAt: string | null;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    markRead(userId: string, id: string): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.SystemAlertType;
        status: import("@prisma/client").$Enums.SystemAlertStatus;
        sourceId: string;
        title: string;
        message: string;
        payload: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | undefined;
        firstTriggeredAt: string;
        lastTriggeredAt: string;
        readAt: string | null;
        resolvedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    markUnread(userId: string, id: string): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.SystemAlertType;
        status: import("@prisma/client").$Enums.SystemAlertStatus;
        sourceId: string;
        title: string;
        message: string;
        payload: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | undefined;
        firstTriggeredAt: string;
        lastTriggeredAt: string;
        readAt: string | null;
        resolvedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    resolve(userId: string, id: string): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.SystemAlertType;
        status: import("@prisma/client").$Enums.SystemAlertStatus;
        sourceId: string;
        title: string;
        message: string;
        payload: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | undefined;
        firstTriggeredAt: string;
        lastTriggeredAt: string;
        readAt: string | null;
        resolvedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    readAll(userId: string): Promise<{
        ok: boolean;
        updated: number;
    }>;
}
