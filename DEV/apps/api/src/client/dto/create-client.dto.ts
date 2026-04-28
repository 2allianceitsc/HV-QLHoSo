import { IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INPUT_LENGTH, INPUT_LENGTH_OVERRIDE } from '@shared/constants/input-length';
import {
  OptionalTextField,
  RequiredCodeField,
  RequiredNameField,
} from 'src/common/decorators/string-field.decorator';

export class CreateClientDto {
  @ApiProperty({ maxLength: INPUT_LENGTH.name })
  @RequiredNameField()
  name!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH_OVERRIDE.clientCode })
  @RequiredCodeField(INPUT_LENGTH_OVERRIDE.clientCode)
  code!: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  address?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  phone?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  email?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  website?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  colorHex?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  iconId?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  timezone?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  defaultStartTime?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  defaultEndTime?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  country?: string;
}
