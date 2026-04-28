import {
  IsEmail,
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INPUT_LENGTH, INPUT_LENGTH_OVERRIDE } from '@shared/constants/input-length';
import {
  OptionalTextField,
  RequiredNameField,
  RequiredTextField,
} from 'src/common/decorators/string-field.decorator';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.name })
  @RequiredNameField()
  firstName!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.name })
  @RequiredNameField()
  surname!: string;

  @ApiProperty({ description: 'Date of birth (YYYY-MM-DD) — required for username auto-generation' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.text })
  @RequiredTextField()
  companyId!: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.name })
  @OptionalTextField(INPUT_LENGTH.name)
  middleName?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH_OVERRIDE.employeeId })
  @OptionalTextField(INPUT_LENGTH_OVERRIDE.employeeId)
  employeeId?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  departmentId?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  officeId?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  positionId?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  teamId?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  mobileNumber?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  shiftStartTime?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  shiftEndTime?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  latestStartTime?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  latestEndShiftTime?: string;

  @ApiPropertyOptional({ description: '0 = same day, 1 = next day (overnight shift)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  shiftEndDayOffset?: number;

  @ApiPropertyOptional({ description: 'IANA timezone, e.g. Asia/Manila' })
  @OptionalTextField()
  timezone?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
