import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import {
  OptionalTextField,
  RequiredCodeField,
  RequiredNameField,
  RequiredTextField,
} from 'src/common/decorators/string-field.decorator';

export class CreatePositionDto {
  @ApiProperty({ maxLength: INPUT_LENGTH.code })
  @RequiredCodeField()
  positionCode!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.name })
  @RequiredNameField()
  positionName!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.text })
  @RequiredTextField()
  companyId!: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  colorHex?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  iconId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  orderNo?: number;
}
