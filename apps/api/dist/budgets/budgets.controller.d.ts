import { BudgetsService } from "./budgets.service";
import { BudgetListQueryDto } from "./dto/budget-list.query";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
export declare class BudgetsController {
    private readonly budgets;
    constructor(budgets: BudgetsService);
    list(req: any, query: BudgetListQueryDto): Promise<{
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
    create(req: any, dto: CreateBudgetDto): Promise<{
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
    update(req: any, id: string, dto: UpdateBudgetDto): Promise<{
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
    remove(req: any, id: string): Promise<{
        ok: boolean;
    }>;
}
