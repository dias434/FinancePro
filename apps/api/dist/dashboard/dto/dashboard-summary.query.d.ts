import { PaginationQueryDto } from "../../common/dto/pagination.query";
export declare class DashboardSummaryQueryDto extends PaginationQueryDto {
    range?: "month" | "year";
    year?: number;
    month?: number;
    accountId?: string;
    baseCurrency?: string;
    sortBy?: "expenseCents" | "categoryName";
    sortDir?: "asc" | "desc";
}
