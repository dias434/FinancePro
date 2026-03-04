import { IsIn, IsOptional } from "class-validator"

import { PaginationQueryDto } from "../../common/dto/pagination.query"

export class AlertListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(["ACTIVE", "READ", "RESOLVED"])
  status?: "ACTIVE" | "READ" | "RESOLVED"

  @IsOptional()
  @IsIn([
    "BUDGET_THRESHOLD",
    "BUDGET_OVER_LIMIT",
    "GOAL_DUE_SOON",
    "GOAL_OVERDUE",
    "BILL_DUE_SOON",
    "BILL_OVERDUE",
    "SPENDING_SPIKE_WEEKLY",
    "SPENDING_SPIKE_MONTHLY",
  ])
  type?:
    | "BUDGET_THRESHOLD"
    | "BUDGET_OVER_LIMIT"
    | "GOAL_DUE_SOON"
    | "GOAL_OVERDUE"
    | "BILL_DUE_SOON"
    | "BILL_OVERDUE"
    | "SPENDING_SPIKE_WEEKLY"
    | "SPENDING_SPIKE_MONTHLY"

  @IsOptional()
  @IsIn(["createdAt", "lastTriggeredAt"])
  sortBy?: "createdAt" | "lastTriggeredAt"

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc"
}
