import { PrismaService } from "../prisma/prisma.service";
export declare class GoalsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private getGoalRowById;
    list(userId: string, input: {
        page?: number;
        pageSize?: number;
        q?: string;
        sortBy?: "name" | "targetDate" | "targetCents" | "createdAt";
        sortDir?: "asc" | "desc";
    }): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            name: string;
            targetCents: number;
            currentCents: number;
            targetDate: string;
            progressPercent: number;
            remainingCents: number;
            completed: boolean;
            daysRemaining: number;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    create(userId: string, input: {
        name: string;
        targetCents: number;
        currentCents?: number;
        targetDate: Date;
    }): Promise<{
        id: string;
        name: string;
        targetCents: number;
        currentCents: number;
        targetDate: string;
        progressPercent: number;
        remainingCents: number;
        completed: boolean;
        daysRemaining: number;
        createdAt: string;
        updatedAt: string;
    }>;
    update(userId: string, id: string, input: {
        name?: string;
        targetCents?: number;
        currentCents?: number;
        targetDate?: Date;
    }): Promise<{
        id: string;
        name: string;
        targetCents: number;
        currentCents: number;
        targetDate: string;
        progressPercent: number;
        remainingCents: number;
        completed: boolean;
        daysRemaining: number;
        createdAt: string;
        updatedAt: string;
    }>;
    remove(userId: string, id: string): Promise<{
        ok: boolean;
    }>;
}
