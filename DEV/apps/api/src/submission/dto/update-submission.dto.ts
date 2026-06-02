import { IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseLineDto, ExistingInventoryDto } from './create-submission.dto';

export class UpdateSubmissionDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() content?: string;
  @IsDateString() @IsOptional() submittedDate?: string;
  @IsDateString() @IsOptional() contractStartDate?: string;
  @IsDateString() @IsOptional() contractEndDate?: string;
  @IsString() @IsOptional() supplier?: string;
  @IsUUID() @IsOptional() departmentId?: string;
  @IsUUID() @IsOptional() costCodeId?: string;

  @IsArray() @IsOptional() @ValidateNested({ each: true }) @Type(() => ExpenseLineDto)
  expenseLines?: ExpenseLineDto[];

  @IsArray() @IsOptional() @ValidateNested({ each: true }) @Type(() => ExistingInventoryDto)
  existingInventory?: ExistingInventoryDto[];
}
