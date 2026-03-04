import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator"

export class CreateBudgetDto {
  @IsString()
  categoryId!: string

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limitCents!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  alertPercent?: number
}