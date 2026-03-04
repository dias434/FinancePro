import { Type } from "class-transformer"
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator"

export class CreateTransactionDto {
  @IsIn(["INCOME", "EXPENSE", "TRANSFER"])
  type!: "INCOME" | "EXPENSE" | "TRANSFER"

  @Type(() => Date)
  @IsDate()
  occurredAt!: Date

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(60)
  installmentTotal?: number

  @IsString()
  accountId!: string

  @IsOptional()
  @IsString()
  categoryId?: string | null

  @IsOptional()
  @IsString()
  transferAccountId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string

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
