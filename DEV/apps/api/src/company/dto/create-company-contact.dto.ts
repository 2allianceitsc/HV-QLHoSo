import { IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import {
  OptionalTextField,
  RequiredNameField,
} from 'src/common/decorators/string-field.decorator';

export class CreateCompanyContactDto {
  @ApiProperty({ maxLength: INPUT_LENGTH.name })
  @RequiredNameField()
  firstName!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.name })
  @RequiredNameField()
  surname!: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  emailAddress?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  mobileCountryCode?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  mobileNumber?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  landlineCountryCode?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  landlineAreaCode?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  landlineNumber?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  streetAddress?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  suburb?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  city?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  state?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  country?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  postcode?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.note })
  @OptionalTextField(INPUT_LENGTH.note)
  note?: string;
}
