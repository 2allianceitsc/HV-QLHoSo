import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FirstTimePasswordDto {
  @ApiProperty({ description: 'Recovery key from login response' })
  @IsString()
  @IsNotEmpty()
  recoveryKey!: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}
