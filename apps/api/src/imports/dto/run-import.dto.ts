import { IsOptional, IsString, MaxLength } from "class-validator"

import { PreviewImportDto } from "./preview-import.dto"

export class RunImportDto extends PreviewImportDto {
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  mapping?: string

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  defaults?: string
}
