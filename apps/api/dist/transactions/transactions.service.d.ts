import { PrismaService } from "../prisma/prisma.service";
export declare class TransactionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string, input: {
        page?: number;
        pageSize?: number;
        q?: string;
        type?: "INCOME" | "EXPENSE" | "TRANSFER";
        accountId?: string;
        categoryId?: string;
        from?: string;
        to?: string;
        sortBy?: "occurredAt" | "amountCents" | "createdAt";
        sortDir?: "asc" | "desc";
        limit?: number;
    }): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: any;
            type: any;
            occurredAt: string;
            amountCents: any;
            accountId: any;
            categoryId: any;
            transferAccountId: any;
            description: any;
            tags: any;
            costCenter: any;
            notes: any;
            installmentGroupId: any;
            installmentIndex: any;
            installmentTotal: any;
            createdAt: string;
            updatedAt: string;
            account: {
                id: any;
                name: any;
                type: any;
                currency: any;
            } | undefined;
            transferAccount: {
                id: any;
                name: any;
                type: any;
                currency: any;
            } | undefined;
            category: {
                id: any;
                name: any;
                type: any;
                icon: any;
                color: any;
            } | undefined;
        }[];
    }>;
    private assertAccountOwned;
    private assertCategoryOwned;
    create(userId: string, input: {
        type: "INCOME" | "EXPENSE" | "TRANSFER";
        occurredAt: Date;
        amountCents: number;
        accountId: string;
        categoryId?: string | null;
        transferAccountId?: string | null;
        description?: string;
        tags?: string[];
        costCenter?: string | null;
        notes?: string | null;
        installmentTotal?: number;
    }): Promise<{
        id: any;
        type: any;
        occurredAt: string;
        amountCents: any;
        accountId: any;
        categoryId: any;
        transferAccountId: any;
        description: any;
        tags: any;
        costCenter: any;
        notes: any;
        installmentGroupId: any;
        installmentIndex: any;
        installmentTotal: any;
        createdAt: string;
        updatedAt: string;
        account: {
            id: any;
            name: any;
            type: any;
            currency: any;
        } | undefined;
        transferAccount: {
            id: any;
            name: any;
            type: any;
            currency: any;
        } | undefined;
        category: {
            id: any;
            name: any;
            type: any;
            icon: any;
            color: any;
        } | undefined;
    } | {
        ids: string[];
        installmentGroupId: `${string}-${string}-${string}-${string}-${string}`;
        installmentTotal: number;
        firstId: string;
        type: "INCOME" | "EXPENSE" | "TRANSFER";
        totalAmountCents: number;
        items: {
            id: string;
            installmentIndex: number;
            amountCents: number;
            occurredAt: string;
        }[];
    }>;
    update(userId: string, id: string, input: {
        type?: "INCOME" | "EXPENSE" | "TRANSFER";
        occurredAt?: Date;
        amountCents?: number;
        accountId?: string;
        categoryId?: string | null;
        transferAccountId?: string | null;
        description?: string | null;
        tags?: string[];
        costCenter?: string | null;
        notes?: string | null;
    }): Promise<{
        id: any;
        type: any;
        occurredAt: string;
        amountCents: any;
        accountId: any;
        categoryId: any;
        transferAccountId: any;
        description: any;
        tags: any;
        costCenter: any;
        notes: any;
        installmentGroupId: any;
        installmentIndex: any;
        installmentTotal: any;
        createdAt: string;
        updatedAt: string;
        account: {
            id: any;
            name: any;
            type: any;
            currency: any;
        } | undefined;
        transferAccount: {
            id: any;
            name: any;
            type: any;
            currency: any;
        } | undefined;
        category: {
            id: any;
            name: any;
            type: any;
            icon: any;
            color: any;
        } | undefined;
    }>;
    remove(userId: string, id: string): Promise<{
        ok: boolean;
    }>;
}
