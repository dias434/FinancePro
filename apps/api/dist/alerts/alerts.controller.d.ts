import { AlertListQueryDto } from "./dto/alert-list.query";
import { DeactivatePushDeviceDto } from "./dto/deactivate-push-device.dto";
import { RegisterPushDeviceDto } from "./dto/register-push-device.dto";
import { AlertsService } from "./alerts.service";
import { PushNotificationsService } from "./push-notifications.service";
export declare class AlertsController {
    private readonly alerts;
    private readonly pushNotifications;
    constructor(alerts: AlertsService, pushNotifications: PushNotificationsService);
    list(req: any, query: AlertListQueryDto): Promise<{
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
            payload: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | undefined;
            firstTriggeredAt: string;
            lastTriggeredAt: string;
            readAt: string | null;
            resolvedAt: string | null;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    readAll(req: any): Promise<{
        ok: boolean;
        updated: number;
    }>;
    registerPushDevice(req: any, body: RegisterPushDeviceDto): Promise<{
        ok: boolean;
    }>;
    deactivatePushDevice(req: any, body: DeactivatePushDeviceDto): Promise<{
        ok: boolean;
        updated: number;
    }>;
    markRead(req: any, id: string): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.SystemAlertType;
        status: import("@prisma/client").$Enums.SystemAlertStatus;
        sourceId: string;
        title: string;
        message: string;
        payload: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | undefined;
        firstTriggeredAt: string;
        lastTriggeredAt: string;
        readAt: string | null;
        resolvedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    markUnread(req: any, id: string): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.SystemAlertType;
        status: import("@prisma/client").$Enums.SystemAlertStatus;
        sourceId: string;
        title: string;
        message: string;
        payload: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | undefined;
        firstTriggeredAt: string;
        lastTriggeredAt: string;
        readAt: string | null;
        resolvedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    resolve(req: any, id: string): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.SystemAlertType;
        status: import("@prisma/client").$Enums.SystemAlertStatus;
        sourceId: string;
        title: string;
        message: string;
        payload: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | undefined;
        firstTriggeredAt: string;
        lastTriggeredAt: string;
        readAt: string | null;
        resolvedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
}
