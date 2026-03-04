import { PrismaService } from "../prisma/prisma.service";
import type { ApiAccountType } from "./dto/create-account.dto";
export declare class AccountsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string, input: {
        page?: number;
        pageSize?: number;
        q?: string;
        sortBy?: "name" | "createdAt";
        sortDir?: "asc" | "desc";
    }): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            name: string;
            type: ApiAccountType;
            currency: string;
            limitCents: number | undefined;
            closingDay: number | undefined;
            dueDay: number | undefined;
            balanceCents: number;
            debtCents: number | undefined;
            availableCents: number | undefined;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    create(userId: string, input: {
        name: string;
        type?: ApiAccountType;
        currency?: string;
        limitCents?: number;
        closingDay?: number;
        dueDay?: number;
    }): Promise<{
        id: string;
        name: string;
        type: ApiAccountType;
        currency: string;
        limitCents: number | undefined;
        closingDay: number | undefined;
        dueDay: number | undefined;
        balanceCents: number;
        debtCents: number | undefined;
        availableCents: number | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    get(userId: string, id: string): Promise<{
        id: string;
        name: string;
        type: ApiAccountType;
        currency: string;
        limitCents: number | undefined;
        closingDay: number | undefined;
        dueDay: number | undefined;
        balanceCents: number;
        debtCents: number | undefined;
        availableCents: number | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    update(userId: string, id: string, input: {
        name?: string;
        type?: ApiAccountType;
        currency?: string;
        limitCents?: number;
        closingDay?: number;
        dueDay?: number;
    }): Promise<{
        id: string;
        name: string;
        type: ApiAccountType;
        currency: string;
        limitCents: number | undefined;
        closingDay: number | undefined;
        dueDay: number | undefined;
        balanceCents: number;
        debtCents: number | undefined;
        availableCents: number | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    remove(userId: string, id: string): Promise<{
        ok: boolean;
    }>;
    reconcile(userId: string, accountId: string, input: {
        expectedBalanceCents: number;
        actualBalanceCents: number;
        note?: string;
    }): Promise<{
        id: string;
        accountId: string;
        recordedAt: string;
        expectedBalanceCents: number;
        actualBalanceCents: number;
        diffCents: number;
        note: string | undefined;
    }>;
    listBills(userId: string, accountId: string, input: {
        limit?: number;
    }): Promise<{
        bills: {
            month: string;
            dueDate: string;
            totalCents: number;
            paidCents: number;
            remainingCents: number;
            periodStart: string;
            periodEnd: string;
        }[];
    }>;
    listReconciliations(userId: string, accountId: string, input: {
        page?: number;
        pageSize?: number;
    }): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            recordedAt: string;
            expectedBalanceCents: number;
            actualBalanceCents: number;
            diffCents: number;
            note: string | undefined;
        }[];
    }>;
}
