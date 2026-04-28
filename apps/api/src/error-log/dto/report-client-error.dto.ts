import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ReportClientErrorDto {
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  statusCode?: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  @IsString()
  pageUrl?: string;
}
