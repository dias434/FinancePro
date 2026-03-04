import { Type } from "class-transformer"
import { IsDate, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator"

export class CreateGoalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetCents!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentCents?: number

  @Type(() => Date)
  @IsDate()
  targetDate!: Date
}