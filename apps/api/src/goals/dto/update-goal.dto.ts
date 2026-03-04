import { Type } from "class-transformer"
import { IsDate, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator"

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetCents?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentCents?: number

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  targetDate?: Date
}