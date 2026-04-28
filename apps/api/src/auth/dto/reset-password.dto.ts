import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from verify-otp' })
  @IsString()
  @IsNotEmpty()
  resetToken!: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}
