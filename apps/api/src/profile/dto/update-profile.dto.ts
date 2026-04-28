import { IsOptional, IsInt, Min, Max, IsDateString, IsBoolean, IsIn, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { OptionalTextField } from 'src/common/decorators/string-field.decorator';

class WidgetPositionDto {
  @IsIn(['left', 'right'])
  side!: 'left' | 'right';

  @IsNumber()
  @Min(0)
  @Max(3000)
  yOffset!: number;
}

export class UpdateWidgetSettingsDto {
  @IsOptional()
  @IsBoolean()
  showFloatingWidget?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => WidgetPositionDto)
  floatingWidgetPosition?: WidgetPositionDto;
}

export class UpdateProfileDto {
  @IsOptional()
  @OptionalTextField(INPUT_LENGTH.name)
  firstName?: string;

  @IsOptional()
  @OptionalTextField(INPUT_LENGTH.name)
  middleName?: string;

  @IsOptional()
  @OptionalTextField(INPUT_LENGTH.name)
  surname?: string;

  @IsOptional()
  @OptionalTextField()
  mobileNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  gender?: number;

  @IsOptional()
  @OptionalTextField(INPUT_LENGTH.note)
  note?: string;

  @IsOptional()
  @OptionalTextField()
  presentAddress?: string;

  @IsOptional()
  @OptionalTextField()
  permanentAddress?: string;

  @IsOptional()
  @OptionalTextField()
  personalEmailAddress?: string;

  @IsOptional()
  @OptionalTextField()
  cityOfBirth?: string;

  @IsOptional()
  @OptionalTextField()
  countryOfBirth?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maritalStatus?: number;

  @IsOptional()
  @OptionalTextField(INPUT_LENGTH.name)
  firstNameOfSpouse?: string;

  @IsOptional()
  @OptionalTextField(INPUT_LENGTH.name)
  middleNameOfSpouse?: string;

  @IsOptional()
  @OptionalTextField(INPUT_LENGTH.name)
  surnameOfSpouse?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfChildren?: number;

  @IsOptional()
  @OptionalTextField()
  emergencyContactFullName?: string;

  @IsOptional()
  @OptionalTextField()
  relationshipToYou?: string;

  @IsOptional()
  @OptionalTextField()
  emergencyContactAreaCode?: string;

  @IsOptional()
  @OptionalTextField()
  emergencyContactNumber?: string;
}
