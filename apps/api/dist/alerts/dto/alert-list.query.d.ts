import { PaginationQueryDto } from "../../common/dto/pagination.query";
export declare class AlertListQueryDto extends PaginationQueryDto {
    status?: "ACTIVE" | "READ" | "RESOLVED";
    type?: "BUDGET_THRESHOLD" | "BUDGET_OVER_LIMIT" | "GOAL_DUE_SOON" | "GOAL_OVERDUE" | "BILL_DUE_SOON" | "BILL_OVERDUE" | "SPENDING_SPIKE_WEEKLY" | "SPENDING_SPIKE_MONTHLY";
    sortBy?: "createdAt" | "lastTriggeredAt";
    sortDir?: "asc" | "desc";
}
