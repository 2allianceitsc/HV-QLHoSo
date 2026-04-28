import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { LogoutAttendanceDto } from './dto/logout-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @ApiOperation({ summary: 'Change attendance status' })
  async changeStatus(
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.attendanceService.changeStatus(
      user?.staffId ?? '',
      dto,
      ipAddress,
      userAgent,
      user?.sub,
    );
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout with mood' })
  async logout(
    @Body() dto: LogoutAttendanceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attendanceService.logout(user?.staffId ?? '', dto, user?.sub);
  }

  @Get('config')
  @ApiOperation({ summary: 'Attendance UI configuration (e.g. min status change interval)' })
  async getConfig() {
    return this.attendanceService.getAttendanceConfig();
  }


  @Post('trigger-auto-logout')
  @ApiOperation({ summary: 'Manually trigger auto-logout cron (QC/Dev only)' })
  async triggerAutoLogout(@Body('staffIdToExpire') staffIdToExpire?: string) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, message: 'Not available in production' };
    }
    
    // For testing: force the shift to end 1 minute ago so auto-logout picks it up
    if (staffIdToExpire) {
      const now = new Date();
      const end = new Date(now.getTime() - 60000);
      const hh = String(end.getHours()).padStart(2, '0');
      const mm = String(end.getMinutes()).padStart(2, '0');
      await this.attendanceService['prisma'].staff.update({
        where: { id: staffIdToExpire },
        data: { shiftEndTime: `${hh}:${mm}` }
      });
    }

    await this.attendanceService.autoLogout();
    return { success: true, message: 'Auto-logout triggered successfully' };
  }

  @Get('time')
  @ApiOperation({ summary: 'Server UTC time — all authenticated users; used by client to measure clock skew' })
  serverTime(): { success: boolean; data: { utcMs: number; utcIso: string } } {
    const now = new Date();
    return { success: true, data: { utcMs: now.getTime(), utcIso: now.toISOString() } };
  }

  @Get('today')
  @ApiOperation({ summary: "Today's records for current user" })
  async getToday(
    @CurrentUser() user: CurrentUserPayload,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    return this.attendanceService.getTodayAttendance(user?.staffId ?? '', clientTimezone);
  }

  @Get('history')
  @ApiOperation({ summary: 'Paginated attendance history' })
  async getHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('statusId') statusId?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    return this.attendanceService.getHistory(user?.staffId ?? '', {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      startDate,
      endDate,
      statusId,
      clientTimezone,
    });
  }

  @Get('team')
  @ApiOperation({ summary: 'Team attendance history (Manager/HR)' })
  async getTeamHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query('staffId') staffId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('statusId') statusId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    return this.attendanceService.getTeamHistory(user?.staffId ?? '', {
      staffId,
      startDate,
      endDate,
      statusId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      clientTimezone,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'HR/Admin edit record' })
  async updateRecord(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attendanceService.updateRecord(id, dto, user?.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'HR/Admin soft delete record' })
  async deleteRecord(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attendanceService.deleteRecord(id, user?.sub);
  }
}
