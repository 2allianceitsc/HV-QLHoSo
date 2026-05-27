import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class TestChannelDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  webhookUrl?: string;
}
