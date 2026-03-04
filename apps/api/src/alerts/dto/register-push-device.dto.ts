import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

export class RegisterPushDeviceDto {
  @IsString()
  @MinLength(16)
  @MaxLength(255)
  token!: string

  @IsIn(["android", "ios"])
  platform!: "android" | "ios"

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string
}
