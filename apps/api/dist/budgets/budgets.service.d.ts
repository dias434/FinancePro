import { PrismaService } from "../prisma/prisma.service";
export declare class BudgetsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private rowToRecord;
    private getBudgetRowById;
    private assertExpenseCategoryOwned;
    private getConsumedMap;
    private mapBudgetOutput;
    list(userId: string, input: {
        page?: number;
        pageSize?: number;
        q?: string;
        categoryId?: string;
        year?: number;
        month?: number;
        sortBy?: "month" | "limitCents" | "createdAt";
        sortDir?: "asc" | "desc";
    }): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            year: number;
            month: number;
            monthStart: string;
            monthEnd: string;
            limitCents: number;
            consumedCents: number;
            remainingCents: number;
            usedPercent: number;
            alertPercent: number;
            alertReached: boolean;
            overLimit: boolean;
            category: {
                id: string;
                name: string;
                type: import("@prisma/client").$Enums.CategoryType;
                icon: string | undefined;
                color: string | undefined;
            };
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    create(userId: string, input: {
        categoryId: string;
        year: number;
        month: number;
        limitCents: number;
        alertPercent?: number;
    }): Promise<{
        id: string;
        year: number;
        month: number;
        monthStart: string;
        monthEnd: string;
        limitCents: number;
        consumedCents: number;
        remainingCents: number;
        usedPercent: number;
        alertPercent: number;
        alertReached: boolean;
        overLimit: boolean;
        category: {
            id: string;
            name: string;
            type: import("@prisma/client").$Enums.CategoryType;
            icon: string | undefined;
            color: string | undefined;
        };
        createdAt: string;
        updatedAt: string;
    }>;
    update(userId: string, id: string, input: {
        categoryId?: string;
        year?: number;
        month?: number;
        limitCents?: number;
        alertPercent?: number;
    }): Promise<{
        id: string;
        year: number;
        month: number;
        monthStart: string;
        monthEnd: string;
        limitCents: number;
        consumedCents: number;
        remainingCents: number;
        usedPercent: number;
        alertPercent: number;
        alertReached: boolean;
        overLimit: boolean;
        category: {
            id: string;
            name: string;
            type: import("@prisma/client").$Enums.CategoryType;
            icon: string | undefined;
            color: string | undefined;
        };
        createdAt: string;
        updatedAt: string;
    }>;
    remove(userId: string, id: string): Promise<{
        ok: boolean;
    }>;
}
