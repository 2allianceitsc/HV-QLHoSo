import { IsString, IsOptional, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import {
  OptionalTextField,
  RequiredCodeField,
  RequiredNameField,
  RequiredTextField,
} from 'src/common/decorators/string-field.decorator';

export class CreateDepartmentDto {
  @ApiProperty({ maxLength: INPUT_LENGTH.code })
  @RequiredCodeField()
  departmentCode!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.name })
  @RequiredNameField()
  departmentName!: string;

  @ApiProperty({ maxLength: INPUT_LENGTH.text })
  @RequiredTextField()
  companyId!: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.note })
  @OptionalTextField(INPUT_LENGTH.note)
  description?: string;

  @ApiPropertyOptional({ maxLength: INPUT_LENGTH.text })
  @OptionalTextField()
  headOfDepartmentId?: string;

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
