import { IsString, IsOptional, IsBoolean, IsInt, IsArray, IsIn, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStatusDto {
  @ApiProperty()
  @IsString()
  name!: string;

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
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ enum: ['Client', 'System'] })
  @IsOptional()
  @IsString()
  @IsIn(['Client', 'System'])
  scopeType?: 'Client' | 'System';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLoginStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLogoutStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isWorkingInStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isWorkingOutStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBreak?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isIdleStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNormalDayOff?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHalfDayOff?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxDurationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Max(9999)
  @Type(() => Number)
  orderNo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;
}

export class UpdateStatusDto extends PartialType(CreateStatusDto) {}

export class ReorderStatusDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
