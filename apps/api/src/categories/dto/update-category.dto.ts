import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string

  @IsOptional()
  @IsIn(["INCOME", "EXPENSE"])
  type?: "INCOME" | "EXPENSE"

  @IsOptional()
  @IsString()
  @MaxLength(32)
  icon?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string
}

