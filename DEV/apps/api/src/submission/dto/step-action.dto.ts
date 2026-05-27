import { IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class StepApproveDto {
  @IsUUID() stepId!: string;
  @IsString() @IsOptional() comment?: string;
}

export class StepRejectDto {
  @IsUUID() stepId!: string;
  @IsString() @IsNotEmpty() comment!: string;
}

export class ReassignStepDto {
  @IsUUID() newApproverId!: string;
  // BA §7.3: reason required, ≥10 chars; UI enforces but back stop here too.
  @IsString() @MinLength(10) reason!: string;
}
