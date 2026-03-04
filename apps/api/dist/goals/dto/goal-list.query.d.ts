import { PaginationQueryDto } from "../../common/dto/pagination.query";
export declare class GoalListQueryDto extends PaginationQueryDto {
    q?: string;
    sortBy?: "name" | "targetDate" | "targetCents" | "createdAt";
    sortDir?: "asc" | "desc";
}
