import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListSubmissionsDto {
  @IsEnum(['MS', 'NT']) @IsOptional() type?: string;
  @IsString() @IsOptional() q?: string;
  @IsUUID() @IsOptional() department?: string;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() supplier?: string;
  @IsUUID() @IsOptional() reviewerId?: string;
  @IsUUID() @IsOptional() approverId?: string;
  @IsDateString() @IsOptional() submittedDateFrom?: string;
  @IsDateString() @IsOptional() submittedDateTo?: string;
  @IsInt() @Min(1) @Type(() => Number) @IsOptional() page?: number = 1;
  @IsInt() @Min(1) @Type(() => Number) @IsOptional() limit?: number = 20;
}
