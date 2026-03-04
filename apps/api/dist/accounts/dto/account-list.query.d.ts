import { PaginationQueryDto } from "../../common/dto/pagination.query";
export declare class AccountListQueryDto extends PaginationQueryDto {
    q?: string;
    sortBy?: "name" | "createdAt";
    sortDir?: "asc" | "desc";
}
