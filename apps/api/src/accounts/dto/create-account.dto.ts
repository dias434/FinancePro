import { Type } from "class-transformer"
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, MinLength } from "class-validator"

export type ApiAccountType = "CASH" | "CHECKING" | "SAVINGS" | "CREDIT_CARD"

export class CreateAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string

  @IsOptional()
  @IsIn(["CASH", "CHECKING", "SAVINGS", "CREDIT_CARD"])
  type?: ApiAccountType

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limitCents?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number
}
