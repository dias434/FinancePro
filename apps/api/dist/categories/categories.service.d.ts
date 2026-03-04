import { PrismaService } from "../prisma/prisma.service";
export declare class CategoriesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string, input: {
        page?: number;
        pageSize?: number;
        q?: string;
        type?: "INCOME" | "EXPENSE";
        sortBy?: "name" | "createdAt";
        sortDir?: "asc" | "desc";
    }): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            name: string;
            type: import("@prisma/client").$Enums.CategoryType;
            icon: string | undefined;
            color: string | undefined;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    create(userId: string, input: {
        name: string;
        type?: "INCOME" | "EXPENSE";
        icon?: string;
        color?: string;
    }): Promise<{
        id: string;
        name: string;
        type: import("@prisma/client").$Enums.CategoryType;
        icon: string | undefined;
        color: string | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    update(userId: string, id: string, input: {
        name?: string;
        type?: "INCOME" | "EXPENSE";
        icon?: string;
        color?: string;
    }): Promise<{
        id: string;
        name: string;
        type: import("@prisma/client").$Enums.CategoryType;
        icon: string | undefined;
        color: string | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    remove(userId: string, id: string): Promise<{
        ok: boolean;
    }>;
}
