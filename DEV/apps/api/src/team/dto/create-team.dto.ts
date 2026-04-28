import { IsString, IsOptional, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teamName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  orderNo?: number;
}
