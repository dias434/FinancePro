import { DashboardAdvancedQueryDto } from "./dto/dashboard-advanced.query";
import { DashboardSummaryQueryDto } from "./dto/dashboard-summary.query";
import { DashboardService } from "./dashboard.service";
export declare class DashboardController {
    private readonly dashboard;
    constructor(dashboard: DashboardService);
    summary(req: any, query: DashboardSummaryQueryDto): Promise<{
        range: "month" | "year";
        baseCurrency: string;
        supportedCurrencies: string[];
        start: string;
        end: string;
        balanceCents: number;
        incomeCents: number;
        expenseCents: number;
        netCents: number;
        series: {
            label: string;
            netCents: number;
        }[];
        byCategory: {
            categoryId: string | null;
            categoryName: string;
            expenseCents: number;
        }[];
    }>;
    advanced(req: any, query: DashboardAdvancedQueryDto): Promise<{
        baseCurrency: string;
        supportedCurrencies: string[];
        comparison: {
            currentMonthKey: string;
            previousMonthKey: string;
            current: {
                incomeCents: number;
                expenseCents: number;
                netCents: number;
            };
            previous: {
                incomeCents: number;
                expenseCents: number;
                netCents: number;
            };
            delta: {
                incomeCents: number;
                expenseCents: number;
                netCents: number;
            };
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
    }>;
}
