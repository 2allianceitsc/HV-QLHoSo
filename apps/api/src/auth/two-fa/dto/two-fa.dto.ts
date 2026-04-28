import { IsString, IsNotEmpty, IsEnum, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TwoFAMethod } from '@shared/enums/two-fa-method.enum';

export class Setup2FADto {
  @ApiProperty({ enum: TwoFAMethod, example: TwoFAMethod.TOTP })
  @IsEnum(TwoFAMethod)
  method!: TwoFAMethod;
}

export class Confirm2FADto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}

export class Verify2FADto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 8) // 6 for TOTP/OTP, up to 8 for backup codes
  code!: string;
}

export class Disable2FADto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ResendOtpDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;
}
