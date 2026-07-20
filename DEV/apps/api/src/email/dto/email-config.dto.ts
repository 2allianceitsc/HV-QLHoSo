import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn, IsEmail } from 'class-validator';

export const SUPPORTED_PROVIDERS = ['smtp', 'sendgrid', 'mailgun', 'resend'] as const;
export type EmailProviderType = typeof SUPPORTED_PROVIDERS[number];

export class CreateEmailConfigDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsIn(SUPPORTED_PROVIDERS)
  provider!: string;

  /** JSON string: { host, port, user, pass } for smtp; { apiKey } for API providers */
  @IsString()
  @IsNotEmpty()
  config!: string;

  @IsString()
  @IsNotEmpty()
  fromName!: string;

  @IsEmail()
  fromEmail!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ResendEmailDto {
  @IsEmail()
  to!: string;
}

export class UpdateEmailConfigDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_PROVIDERS)
  provider?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  config?: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;
}
