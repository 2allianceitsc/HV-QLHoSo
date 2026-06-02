import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class UpdateChannelDto {
  @IsBoolean()
  isEnabled!: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(500)
  @IsUrl({ require_protocol: true, require_valid_protocol: true, protocols: ['http', 'https'] })
  webhookUrl?: string | null;
}
