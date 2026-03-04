import { IsIn, IsOptional, IsString, Length } from "class-validator"

export class PreviewImportDto {
  @IsOptional()
  @IsIn(["CSV", "OFX"])
  format?: "CSV" | "OFX"

  @IsOptional()
  @IsString()
  @Length(1, 1)
  delimiter?: string

  @IsOptional()
  @IsString()
  accountId?: string
}
