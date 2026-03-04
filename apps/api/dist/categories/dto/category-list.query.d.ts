import { PaginationQueryDto } from "../../common/dto/pagination.query";
export declare class CategoryListQueryDto extends PaginationQueryDto {
    q?: string;
    type?: "INCOME" | "EXPENSE";
    sortBy?: "name" | "createdAt";
    sortDir?: "asc" | "desc";
}
