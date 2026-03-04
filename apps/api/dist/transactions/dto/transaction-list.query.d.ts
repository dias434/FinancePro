import { PaginationQueryDto } from "../../common/dto/pagination.query";
export declare class TransactionListQueryDto extends PaginationQueryDto {
    q?: string;
    type?: "INCOME" | "EXPENSE" | "TRANSFER";
    accountId?: string;
    categoryId?: string;
    from?: string;
    to?: string;
    sortBy?: "occurredAt" | "amountCents" | "createdAt";
    sortDir?: "asc" | "desc";
    limit?: number;
}
