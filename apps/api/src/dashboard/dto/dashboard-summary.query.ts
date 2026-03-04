import { Type } from "class-transformer"
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator"

import { PaginationQueryDto } from "../../common/dto/pagination.query"

export class DashboardSummaryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(["month", "year"])
  range?: "month" | "year"

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
  @IsString()
  accountId?: string

  @IsOptional()
  @IsString()
  baseCurrency?: string

  @IsOptional()
  @IsIn(["expenseCents", "categoryName"])
  sortBy?: "expenseCents" | "categoryName"

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc"
}
