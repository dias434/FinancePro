import { IsIn, IsOptional, IsString } from "class-validator"

import { PaginationQueryDto } from "../../common/dto/pagination.query"

export class AccountListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsIn(["name", "createdAt"])
  sortBy?: "name" | "createdAt"

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc"
}

