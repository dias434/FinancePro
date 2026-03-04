import { PaginationQueryDto } from "../../common/dto/pagination.query";
export declare class ImportLogsQueryDto extends PaginationQueryDto {
    status?: "COMPLETED" | "FAILED" | "ROLLED_BACK";
    itemLimit?: number;
}
