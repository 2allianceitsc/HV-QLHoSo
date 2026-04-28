import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ErrorLogService } from './error-log.service';
import { ReportClientErrorDto } from './dto/report-client-error.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';

// POST is public — errors can happen before/during login
@Controller('error-logs')
export class ErrorLogController {
  constructor(private readonly errorLogService: ErrorLogService) {}

  @Post()
  async report(@Body() dto: ReportClientErrorDto, @Req() req: Request): Promise<void> {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress;

    await this.errorLogService.log({
      source: 'FRONTEND',
      statusCode: dto.statusCode,
      method: dto.method,
      url: dto.apiUrl,
      message: dto.message,
      stack: dto.stack,
      userId,
      userAgent: req.headers['user-agent'],
      ipAddress,
      pageUrl: dto.pageUrl,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('source') source?: string,
    @Query('search') search?: string,
  ) {
    return this.errorLogService.findAll({
      page: Number(page),
      limit: Number(limit),
      source,
      search,
    });
  }
}
