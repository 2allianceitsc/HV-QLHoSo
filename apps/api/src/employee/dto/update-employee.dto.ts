import { IsOptional, IsBoolean, IsArray, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { INPUT_LENGTH, INPUT_LENGTH_OVERRIDE } from '@shared/constants/input-length';
import { OptionalTextField } from 'src/common/decorators/string-field.decorator';

export class UpdateEmployeeDto {
  // Personal
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.name }) @OptionalTextField(INPUT_LENGTH.name) firstName?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.name }) @OptionalTextField(INPUT_LENGTH.name) middleName?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.name }) @OptionalTextField(INPUT_LENGTH.name) surname?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() mobileNumber?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() gender?: number;

  // Work
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH_OVERRIDE.employeeId }) @OptionalTextField(INPUT_LENGTH_OVERRIDE.employeeId) employeeId?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() companyId?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() departmentId?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() officeId?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() positionId?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() teamId?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() shiftStartTime?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() shiftEndTime?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() latestStartTime?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() latestEndShiftTime?: string;
  @ApiPropertyOptional({ description: '0 = same day, 1 = next day (overnight shift)' }) @IsOptional() @IsInt() @Min(0) @Max(1) shiftEndDayOffset?: number;
  @ApiPropertyOptional({ description: 'IANA timezone, e.g. Asia/Manila', maxLength: INPUT_LENGTH.text }) @OptionalTextField() timezone?: string;

  // Extended personal
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.name }) @OptionalTextField(INPUT_LENGTH.name) englishSurname?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() homePhoneAreaCode?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() homePhoneNumber?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() favoriteCake?: string;

  // HR Only
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() taxIdNumber?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() sssNumber?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() philHealthIdNumber?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() hdmfNumber?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() nominatedBankName?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() nominatedBankAccountName?: string;
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() nominatedBankAccountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDisabled?: boolean;
}

export class UpdateRolesDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];
}

export class ResetPasswordDto {
  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text }) @OptionalTextField() newPassword?: string;
  @ApiPropertyOptional() @IsOptional() isEmail?: boolean;
}
