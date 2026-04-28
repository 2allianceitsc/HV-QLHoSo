import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsString,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DROPDOWN_ENTITY_TYPES,
  MAX_SECONDARY_FIELDS,
  type DropdownEntityType,
} from '@shared/constants/dropdown-display';

export class DropdownDisplayConfigItemDto {
  @ApiProperty({ enum: DROPDOWN_ENTITY_TYPES })
  @IsIn(DROPDOWN_ENTITY_TYPES as unknown as string[])
  entityType!: DropdownEntityType;

  @ApiProperty({ description: 'Field key shown on the primary (bold) line' })
  @IsString()
  primaryField!: string;

  @ApiProperty({
    description: `Ordered list of fields shown on the secondary (muted) line. Max ${MAX_SECONDARY_FIELDS}. Empty = hide secondary line.`,
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(MAX_SECONDARY_FIELDS)
  @IsString({ each: true })
  secondaryFields!: string[];
}

export class UpdateDropdownDisplayDto {
  @ApiProperty({ type: [DropdownDisplayConfigItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DropdownDisplayConfigItemDto)
  configs!: DropdownDisplayConfigItemDto[];
}
