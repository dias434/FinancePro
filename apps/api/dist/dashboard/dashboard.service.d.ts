import { PrismaService } from "../prisma/prisma.service";
type Range = "month" | "year";
type SeriesPoint = {
    label: string;
    netCents: number;
};
type CategoryPoint = {
    categoryId: string | null;
    categoryName: string;
    expenseCents: number;
};
type MonthTotals = {
    incomeCents: number;
    expenseCents: number;
    netCents: number;
};
type DashboardSummary = {
    range: Range;
    baseCurrency: string;
    supportedCurrencies: string[];
    start: string;
    end: string;
    balanceCents: number;
    incomeCents: number;
    expenseCents: number;
    netCents: number;
    series: SeriesPoint[];
    byCategory: CategoryPoint[];
};
type AdvancedDashboardReport = {
    baseCurrency: string;
    supportedCurrencies: string[];
    comparison: {
        currentMonthKey: string;
        previousMonthKey: string;
        current: MonthTotals;
        previous: MonthTotals;
        delta: MonthTotals;
    };
    categoriesGrowth: Array<{
        categoryId: string | null;
        categoryName: string;
        currentExpenseCents: number;
        previousExpenseCents: number;
        deltaCents: number;
        growthPercent: number;
    }>;
    forecast: {
        monthsConsidered: number;
        averageIncomeCents: number;
        averageExpenseCents: number;
        averageNetCents: number;
        currentBalanceCents: number;
        projections: Array<{
            monthKey: string;
            projectedBalanceCents: number;
        }>;
    };
};
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private getBalanceRows;
    private buildEmptySummary;
    private getCurrentBalanceCents;
    getSummary(input: {
        userId: string;
        range?: Range;
        year?: number;
        month?: number;
        accountId?: string;
        baseCurrency?: string;
        page?: number;
        pageSize?: number;
        sortBy?: "expenseCents" | "categoryName";
        sortDir?: "asc" | "desc";
    }): Promise<DashboardSummary>;
    getAdvancedReport(input: {
        userId: string;
        baseCurrency?: string;
    }): Promise<AdvancedDashboardReport>;
}
export {};
