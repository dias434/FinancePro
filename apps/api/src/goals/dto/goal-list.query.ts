import { IsIn, IsOptional, IsString } from "class-validator"

import { PaginationQueryDto } from "../../common/dto/pagination.query"

export class GoalListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsIn(["name", "targetDate", "targetCents", "createdAt"])
  sortBy?: "name" | "targetDate" | "targetCents" | "createdAt"

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc"
}