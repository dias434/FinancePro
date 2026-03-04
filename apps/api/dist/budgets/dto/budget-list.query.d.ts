import { PaginationQueryDto } from "../../common/dto/pagination.query";
export declare class BudgetListQueryDto extends PaginationQueryDto {
    q?: string;
    categoryId?: string;
    year?: number;
    month?: number;
    sortBy?: "month" | "limitCents" | "createdAt";
    sortDir?: "asc" | "desc";
}
