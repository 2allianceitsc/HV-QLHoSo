import { IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import {
  OptionalTextField,
  RequiredCodeField,
  RequiredNameField,
} from 'src/common/decorators/string-field.decorator';

export class CreateCompanyDto {
  @ApiProperty({ maxLength: INPUT_LENGTH.name })
  @RequiredNameField()
  companyName!: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.code })
  @IsOptional()
  @RequiredCodeField()
  companyCode?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  companyAddress?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  companyTinNumber?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  companyLogoUrl?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  companyPhone?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  companyWebsite?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  colorHex?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  iconId?: string;

  @ApiPropertyOptional({ description: 'IANA timezone e.g. Asia/Ho_Chi_Minh', maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  defaultTimezone?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.name })
  @OptionalTextField(INPUT_LENGTH.name)
  companyContactFirstName?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.name })
  @OptionalTextField(INPUT_LENGTH.name)
  companyContactSurname?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  companyContactEmailAddress?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  companyContactMobile?: string;
}
