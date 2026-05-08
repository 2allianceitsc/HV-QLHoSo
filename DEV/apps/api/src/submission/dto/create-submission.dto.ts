import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export type SubmissionType = 'MS' | 'NT';

export class ExpenseLineDto {
  @IsUUID() costCodeId!: string;
  @IsString() @IsNotEmpty() costCodeName!: string;
  @IsNumber() @Min(0) amountExVat!: number;
  @IsInt() @Min(1) @Max(100) @IsOptional() vatRate?: number;
  @IsString() @IsOptional() supplier?: string;
  @IsString() @IsOptional() purchasedFor?: string;
  @IsString() @IsOptional() purpose?: string;
  @IsString() @IsOptional() usedBy?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}

export class ExistingInventoryDto {
  @IsString() @IsNotEmpty() itemName!: string;
  @IsNumber() @Min(1) quantity!: number;
  @IsString() @IsNotEmpty() unit!: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}

export class CreateSubmissionDto {
  @IsEnum(['MS', 'NT']) type!: SubmissionType;
  @IsEnum(['submit', 'draft']) action!: 'submit' | 'draft';
  @IsUUID() departmentId!: string;
  @IsDateString() submittedDate!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsOptional() content?: string;

  @IsArray() @IsOptional() @ValidateNested({ each: true }) @Type(() => ExpenseLineDto)
  expenseLines?: ExpenseLineDto[];

  @IsArray() @IsOptional() @ValidateNested({ each: true }) @Type(() => ExistingInventoryDto)
  existingInventory?: ExistingInventoryDto[];

  @ValidateIf((o: CreateSubmissionDto) => o.type === 'NT') @IsString() @IsNotEmpty() supplier?: string;
  @ValidateIf((o: CreateSubmissionDto) => o.type === 'NT') @IsDateString() contractStartDate?: string;
  @ValidateIf((o: CreateSubmissionDto) => o.type === 'NT') @IsDateString() contractEndDate?: string;
}
