import { IsNotEmpty, IsString } from 'class-validator';

export class RejectSubmissionDto {
  @IsString() @IsNotEmpty() reason!: string;
}
