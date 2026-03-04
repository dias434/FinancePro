import { Type } from "class-transformer"
import { IsInt, IsOptional, Max, Min } from "class-validator"

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number
}

export function getSkipTake(input: {
  page?: number
  pageSize?: number
  defaultPage: number
  defaultPageSize: number
  maxPageSize: number
}): { skip: number; take: number } {
  const page = Math.max(1, input.page ?? input.defaultPage)
  const pageSize = Math.min(
    input.maxPageSize,
    Math.max(1, input.pageSize ?? input.defaultPageSize),
  )

  return { skip: (page - 1) * pageSize, take: pageSize }
}

