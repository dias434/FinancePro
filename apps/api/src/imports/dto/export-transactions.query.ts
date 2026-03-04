import { IsDateString, IsIn, IsOptional, IsString } from "class-validator"

export class ExportTransactionsQueryDto {
  @IsOptional()
  @IsIn(["csv", "excel"])
  format?: "csv" | "excel"

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

  @IsOptional()
  @IsString()
  accountId?: string

  @IsOptional()
  @IsIn(["INCOME", "EXPENSE", "TRANSFER"])
  type?: "INCOME" | "EXPENSE" | "TRANSFER"

  @IsOptional()
  @IsIn(["json", "download"])
  mode?: "json" | "download"
}
