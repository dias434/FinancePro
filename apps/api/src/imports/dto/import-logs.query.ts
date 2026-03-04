import { Type } from "class-transformer"
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator"

import { PaginationQueryDto } from "../../common/dto/pagination.query"

export class ImportLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(["COMPLETED", "FAILED", "ROLLED_BACK"])
  status?: "COMPLETED" | "FAILED" | "ROLLED_BACK"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  itemLimit?: number
}
