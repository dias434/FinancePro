import { IsOptional, IsString } from "class-validator"

export class DashboardAdvancedQueryDto {
  @IsOptional()
  @IsString()
  baseCurrency?: string
}
