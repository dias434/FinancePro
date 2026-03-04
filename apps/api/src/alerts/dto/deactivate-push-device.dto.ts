import { IsString, MaxLength, MinLength } from "class-validator"

export class DeactivatePushDeviceDto {
  @IsString()
  @MinLength(16)
  @MaxLength(255)
  token!: string
}
