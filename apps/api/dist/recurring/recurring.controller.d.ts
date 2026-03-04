import { CreateRecurringDto } from "./dto/create-recurring.dto";
import { UpdateRecurringDto } from "./dto/update-recurring.dto";
import { RecurringService } from "./recurring.service";
export declare class RecurringController {
    private readonly recurring;
    constructor(recurring: RecurringService);
    list(req: any, page?: string, pageSize?: string, status?: "ACTIVE" | "PAUSED" | "CANCELLED"): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            accountId: string;
            categoryId: string | null;
            type: import("@prisma/client").$Enums.TransactionType;
            amountCents: number;
            description: string | undefined;
            frequency: import("@prisma/client").$Enums.RecurringFrequency;
            startDate: string;
            endDate: string | null;
            nextRunAt: string;
            status: import("@prisma/client").$Enums.RecurringStatus;
            account: {
                id: string;
                type: import("@prisma/client").$Enums.AccountType;
                name: string;
            };
            category: {
                id: string;
                type: import("@prisma/client").$Enums.CategoryType;
                name: string;
            } | undefined;
            createdAt: string;
        }[];
    }>;
    create(req: any, dto: CreateRecurringDto): Promise<{
        id: string;
        accountId: string;
        categoryId: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        amountCents: number;
        description: string | undefined;
        frequency: import("@prisma/client").$Enums.RecurringFrequency;
        startDate: string;
        endDate: string | null;
        nextRunAt: string;
        status: import("@prisma/client").$Enums.RecurringStatus;
        createdAt: string;
    }>;
    update(req: any, id: string, dto: UpdateRecurringDto): Promise<{
        id: string;
        accountId: string;
        categoryId: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        amountCents: number;
        description: string | undefined;
        frequency: import("@prisma/client").$Enums.RecurringFrequency;
        startDate: string;
        endDate: string | null;
        nextRunAt: string;
        status: import("@prisma/client").$Enums.RecurringStatus;
        updatedAt: string;
    }>;
    pause(req: any, id: string): Promise<{
        id: string;
        accountId: string;
        categoryId: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        amountCents: number;
        description: string | undefined;
        frequency: import("@prisma/client").$Enums.RecurringFrequency;
        startDate: string;
        endDate: string | null;
        nextRunAt: string;
        status: import("@prisma/client").$Enums.RecurringStatus;
        updatedAt: string;
    }>;
    resume(req: any, id: string): Promise<{
        id: string;
        accountId: string;
        categoryId: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        amountCents: number;
        description: string | undefined;
        frequency: import("@prisma/client").$Enums.RecurringFrequency;
        startDate: string;
        endDate: string | null;
        nextRunAt: string;
        status: import("@prisma/client").$Enums.RecurringStatus;
        updatedAt: string;
    }>;
    cancel(req: any, id: string): Promise<{
        id: string;
        accountId: string;
        categoryId: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        amountCents: number;
        description: string | undefined;
        frequency: import("@prisma/client").$Enums.RecurringFrequency;
        startDate: string;
        endDate: string | null;
        nextRunAt: string;
        status: import("@prisma/client").$Enums.RecurringStatus;
        updatedAt: string;
    }>;
    remove(req: any, id: string): Promise<{
        ok: boolean;
    }>;
}
