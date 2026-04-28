import { IsString, IsOptional, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiProperty()
  @IsString()
  statusId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Client-reported UTC ISO timestamp captured immediately before the API call. Used for clock-skew observability.' })
  @IsOptional()
  @IsISO8601()
  clientStartTime?: string;
}
