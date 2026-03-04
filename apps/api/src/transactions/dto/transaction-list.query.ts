import { Type } from "class-transformer"
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator"

import { PaginationQueryDto } from "../../common/dto/pagination.query"

export class TransactionListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsIn(["INCOME", "EXPENSE", "TRANSFER"])
  type?: "INCOME" | "EXPENSE" | "TRANSFER"

  @IsOptional()
  @IsString()
  accountId?: string

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

  @IsOptional()
  @IsIn(["occurredAt", "amountCents", "createdAt"])
  sortBy?: "occurredAt" | "amountCents" | "createdAt"

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number
}

