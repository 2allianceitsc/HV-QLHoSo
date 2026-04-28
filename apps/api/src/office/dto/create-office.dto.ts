import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import {
  OptionalTextField,
  RequiredCodeField,
  RequiredNameField,
  RequiredTextField,
} from 'src/common/decorators/string-field.decorator';

export class CreateOfficeDto {
  @ApiProperty({ maxLength: INPUT_LENGTH.code })
  @RequiredCodeField()
  officeCode!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.name })
  @RequiredNameField()
  officeName!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.text })
  @RequiredTextField()
  companyId!: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  officeAddress?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  city?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  country?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  timezone?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  officeContactEmail?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  officeContactMobile?: string;

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
