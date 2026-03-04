import { Type } from "class-transformer"
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator"

export class UpdateTransactionDto {
  @IsOptional()
  @IsIn(["INCOME", "EXPENSE", "TRANSFER"])
  type?: "INCOME" | "EXPENSE" | "TRANSFER"

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents?: number

  @IsOptional()
  @IsString()
  accountId?: string

  @IsOptional()
  @IsString()
  categoryId?: string | null

  @IsOptional()
  @IsString()
  transferAccountId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(24, { each: true })
  tags?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(80)
  costCenter?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null
}
