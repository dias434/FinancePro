import { Type } from "class-transformer"
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator"

export class RunMonthlyBackupDto {
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
  @Type(() => Boolean)
  @IsBoolean()
  force?: boolean
}
