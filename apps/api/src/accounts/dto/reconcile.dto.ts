import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, MaxLength } from "class-validator"

export class ReconcileDto {
  @Type(() => Number)
  @IsInt()
  expectedBalanceCents!: number

  @Type(() => Number)
  @IsInt()
  actualBalanceCents!: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
