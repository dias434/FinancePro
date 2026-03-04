import { Type } from "class-transformer"
import { IsDate, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator"

export class CreateRecurringDto {
  @IsString()
  accountId!: string

  @IsOptional()
  @IsString()
  categoryId?: string | null

  @IsIn(["INCOME", "EXPENSE"])
  type!: "INCOME" | "EXPENSE"

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents!: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string

  @IsIn(["WEEKLY", "MONTHLY", "ANNUAL"])
  frequency!: "WEEKLY" | "MONTHLY" | "ANNUAL"

  @Type(() => Date)
  @IsDate()
  startDate!: Date

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date | null
}
