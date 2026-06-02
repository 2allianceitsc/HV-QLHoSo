import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export type SubmissionType = 'MS' | 'NT';
export type StepType = 'REVIEW' | 'APPROVE';
export type StepMode = 'ANY' | 'ALL';

export class CreateApprovalRuleDto {
  @IsEnum(['MS', 'NT']) submissionType!: SubmissionType;

  // costCodeId: required if MS; must be null/undefined if NT (enforced in service).
  @ValidateIf((o: CreateApprovalRuleDto) => o.submissionType === 'MS')
  @IsUUID()
  @IsNotEmpty()
  costCodeId?: string;

  @IsString() @IsOptional() name?: string;
}

export class UpdateApprovalRuleDto {
  @IsString() @IsOptional() name?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

export class CreateApprovalRuleDetailDto {
  @IsInt() @Min(1) stepOrder!: number;
  @IsEnum(['REVIEW', 'APPROVE']) stepType!: StepType;
  @IsString() @IsOptional() stepLabel?: string;

  // bigint passed as string from FE to avoid JS number overflow
  @IsOptional() minAmount?: string | number | null;
  @IsOptional() maxAmount?: string | number | null;

  @IsUUID() approverId!: string;
  @IsEnum(['ANY', 'ALL']) @IsOptional() mode?: StepMode;
}

export class UpdateApprovalRuleDetailDto {
  @IsInt() @Min(1) @IsOptional() stepOrder?: number;
  @IsEnum(['REVIEW', 'APPROVE']) @IsOptional() stepType?: StepType;
  @IsString() @IsOptional() stepLabel?: string;
  @IsOptional() minAmount?: string | number | null;
  @IsOptional() maxAmount?: string | number | null;
  @IsUUID() @IsOptional() approverId?: string;
  @IsEnum(['ANY', 'ALL']) @IsOptional() mode?: StepMode;
}

export class PreviewApprovalDto {
  @IsEnum(['MS', 'NT']) submissionType!: SubmissionType;
  @IsUUID() @IsOptional() costCodeId?: string;
  @IsNumber() @Min(0) @IsOptional() total?: number;
}
