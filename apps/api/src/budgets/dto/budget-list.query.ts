import { Type } from "class-transformer"
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator"

import { PaginationQueryDto } from "../../common/dto/pagination.query"

export class BudgetListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number

  @IsOptional()
  @IsIn(["month", "limitCents", "createdAt"])
  sortBy?: "month" | "limitCents" | "createdAt"

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc"
}