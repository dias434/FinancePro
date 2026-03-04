import { Type } from "class-transformer"
import { IsDate, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator"

export class UpdateRecurringDto {
  @IsOptional()
  @IsString()
  accountId?: string

  @IsOptional()
  @IsString()
  categoryId?: string | null

  @IsOptional()
  @IsIn(["INCOME", "EXPENSE"])
  type?: "INCOME" | "EXPENSE"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null

  @IsOptional()
  @IsIn(["WEEKLY", "MONTHLY", "ANNUAL"])
  frequency?: "WEEKLY" | "MONTHLY" | "ANNUAL"

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date | null

  @IsOptional()
  @IsIn(["ACTIVE", "PAUSED", "CANCELLED"])
  status?: "ACTIVE" | "PAUSED" | "CANCELLED"
}
