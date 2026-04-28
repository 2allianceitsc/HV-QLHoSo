import { IsString, IsOptional, IsBoolean, IsInt, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVibeIconSetDto {
  @ApiProperty()
  @IsString()
  setName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateVibeIconSetDto extends CreateVibeIconSetDto {}

export class CreateVibeIconDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vibeIconSetId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hoverText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emojiCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  orderNo?: number;
}

export class UpdateVibeIconDto extends CreateVibeIconDto {}

export class ReorderVibeIconsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class CopyIconsDto {
  @ApiProperty()
  @IsString()
  sourceSetId!: string;
}
