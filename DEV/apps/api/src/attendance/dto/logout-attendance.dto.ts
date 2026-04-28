import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogoutAttendanceDto {
  @ApiPropertyOptional({ description: 'Required only when the user role is in LogoutConfig.MoodLogRoles' })
  @IsOptional()
  @IsString()
  vibeIconId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Reason for overbreak — saved to the closed break TimeTracking record' })
  @IsOptional()
  @IsString()
  overbreakNotes?: string;
}
