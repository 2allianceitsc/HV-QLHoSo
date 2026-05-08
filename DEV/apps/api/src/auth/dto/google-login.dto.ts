import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Firebase Google ID Token from client-side sign-in' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
