import { PrismaService } from "../prisma/prisma.service";
export declare class RecurringService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string, input: {
        page?: number;
        pageSize?: number;
        status?: "ACTIVE" | "PAUSED" | "CANCELLED";
    }): Promise<{
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
    create(userId: string, input: {
        accountId: string;
        categoryId?: string | null;
        type: "INCOME" | "EXPENSE";
        amountCents: number;
        description?: string;
        frequency: "WEEKLY" | "MONTHLY" | "ANNUAL";
        startDate: Date;
        endDate?: Date | null;
    }): Promise<{
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
    update(userId: string, id: string, input: {
        accountId?: string;
        categoryId?: string | null;
        type?: "INCOME" | "EXPENSE";
        amountCents?: number;
        description?: string | null;
        frequency?: "WEEKLY" | "MONTHLY" | "ANNUAL";
        startDate?: Date;
        endDate?: Date | null;
        status?: "ACTIVE" | "PAUSED" | "CANCELLED";
    }): Promise<{
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
    pause(userId: string, id: string): Promise<{
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
    resume(userId: string, id: string): Promise<{
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
    cancel(userId: string, id: string): Promise<{
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
    remove(userId: string, id: string): Promise<{
        ok: boolean;
    }>;
    processDueRecurring(userId?: string): Promise<{
        processed: number;
    }>;
    private assertAccountOwned;
    private assertCategoryOwned;
}
