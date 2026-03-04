import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator"

export class UpdateBudgetDto {
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limitCents?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  alertPercent?: number
}