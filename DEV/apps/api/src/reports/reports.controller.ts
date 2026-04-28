import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequiresScreen } from '../common/decorators/requires-screen.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { IAttendanceReportParams } from './dto/attendance-report.dto';
import { UserRole } from '@shared/enums/user-role.enum';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  @RequiresScreen('R01', { permission: 'VIEW' })
  @ApiOperation({ summary: 'Paginated attendance report (role-scoped)' })
  async getAttendanceReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('staffId') staffId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('clientId') clientId?: string,
    @Query('statusId') statusId?: string,
    @Query('groupBy') groupBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    const params: IAttendanceReportParams = {
      startDate,
      endDate,
      staffId,
      departmentId,
      clientId,
      statusId,
      groupBy: groupBy as IAttendanceReportParams['groupBy'],
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      clientTimezone,
    };

    return this.reportsService.getAttendanceReport(params, {
      staffId: user?.staffId ?? '',
      roles: user?.roles ?? [],
    });
  }

  @Get('attendance/export')
  @ApiOperation({ summary: 'Export attendance report as Excel' })
  async exportAttendanceReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('staffId') staffId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('clientId') clientId?: string,
    @Query('statusId') statusId?: string,
    @Query('clientTimezone') clientTimezone?: string,
    @Res() res?: Response,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    const params: IAttendanceReportParams = {
      startDate,
      endDate,
      staffId,
      departmentId,
      clientId,
      statusId,
      clientTimezone,
    };

    await this.reportsService.exportAttendanceReport(
      params,
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
      res!,
    );
  }

  @Get('hr')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @RequiresScreen('R02', { permission: 'VIEW' })
  @ApiOperation({ summary: 'HR summary report (HR_ADMIN+ only)' })
  async getHrReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getHrReport({ startDate, endDate, clientTimezone });
  }

  // ── VIBE Reports ───────────────────────────────────────────────────────────

  @Get('vibe/by-employee')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN, UserRole.CLIENT)
  @ApiOperation({ summary: 'VIBE T1: Staff list + mood logs for a given date' })
  getVibeByEmployee(
    @CurrentUser() user: CurrentUserPayload,
    @Query('date') date?: string,
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
    @Query('officeId') officeId?: string,
  ) {
    return this.reportsService.getVibeByEmployee(
      { date, clientId, teamId, officeId },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('vibe/by-time')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN, UserRole.CLIENT)
  @ApiOperation({ summary: 'VIBE T2: Aggregated by period → icon → staff (last logout/day)' })
  getVibeByTime(
    @CurrentUser() user: CurrentUserPayload,
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
    @Query('officeId') officeId?: string,
  ) {
    return this.reportsService.getVibeByTime(
      { period, clientId, teamId, officeId },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('vibe/team-structure')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'VIBE T3: Org tree — Team Leaders → Staff (Manager-scoped)' })
  getVibeTeamStructure(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getVibeTeamStructure({
      staffId: user?.staffId ?? '',
      roles: user?.roles ?? [],
    });
  }

  @Get('vibe/all-staffs')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'VIBE T4: All staff alphabetical with optional search' })
  getVibeAllStaffs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
  ) {
    return this.reportsService.getVibeAllStaffs(
      { search },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('vibe/staffs-by-client')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'VIBE T5: Hierarchical Client → Team → Staff with optional search' })
  getVibeStaffsByClient(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
  ) {
    return this.reportsService.getVibeStaffsByClient(
      { search },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  // ── S39: Timezone Review ───────────────────────────────────────────────────

  @Get('timezone')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S39: Timezone inventory + mismatch alert (role-scoped)' })
  getTimezoneReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('companyId') companyId?: string,
    @Query('officeId') officeId?: string,
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.reportsService.getTimezoneReport(
      { companyId, officeId, clientId, teamId },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  // ── S25 Attendance sub-tabs ────────────────────────────────────────────────

  @Get('attendance/late-arrivals')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S25 T2: Late arrivals report' })
  async getLateArrivals(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('companyId') companyId?: string,
    @Query('officeId') officeId?: string,
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getLateArrivals(
      {
        startDate,
        endDate,
        companyId,
        officeId,
        clientId,
        teamId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        clientTimezone,
      },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('attendance/over-breaks')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S25 T3: Over-breaks report' })
  async getOverBreaks(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('companyId') companyId?: string,
    @Query('officeId') officeId?: string,
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getOverBreaks(
      {
        startDate,
        endDate,
        companyId,
        officeId,
        clientId,
        teamId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        clientTimezone,
      },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('attendance/auto-logouts')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S25 T4: Auto-logouts report' })
  async getAutoLogouts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('companyId') companyId?: string,
    @Query('officeId') officeId?: string,
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getAutoLogouts(
      {
        startDate,
        endDate,
        companyId,
        officeId,
        clientId,
        teamId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        clientTimezone,
      },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('attendance/absences')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S25 T5: Absences report' })
  async getAbsences(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('period') period?: 'month' | 'quarter' | 'year',
    @Query('companyId') companyId?: string,
    @Query('officeId') officeId?: string,
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getAbsences(
      {
        startDate,
        endDate,
        period,
        companyId,
        officeId,
        clientId,
        teamId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        clientTimezone,
      },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('attendance/overtime')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S25 T6: Overtime report' })
  async getOvertime(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('companyId') companyId?: string,
    @Query('officeId') officeId?: string,
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getOvertime(
      {
        startDate,
        endDate,
        companyId,
        officeId,
        clientId,
        teamId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        clientTimezone,
      },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  // ── S26 HR sub-tabs ────────────────────────────────────────────────────────

  @Get('hr/headcount')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S26 T2: HR headcount grouped by dimension' })
  getHrHeadcount(
    @Query('groupBy') groupBy?: 'department' | 'office' | 'team' | 'client',
  ) {
    return this.reportsService.getHrHeadcount({ groupBy });
  }

  @Get('hr/birthdays')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S26 T3: Upcoming birthdays' })
  getHrBirthdays(
    @CurrentUser() user: CurrentUserPayload,
    @Query('period') period?: 'next-week' | 'this-month' | 'next-month',
  ) {
    return this.reportsService.getHrBirthdays(
      { period },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  // ── S40: Working Hours ─────────────────────────────────────────────────────

  @Get('working-hours')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN, UserRole.CLIENT)
  @ApiOperation({ summary: 'S40: Working hours summary per staff' })
  async getWorkingHours(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('companyId') companyId?: string,
    @Query('officeId') officeId?: string,
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getWorkingHours(
      {
        startDate,
        endDate,
        companyId,
        officeId,
        clientId,
        teamId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        clientTimezone,
      },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('working-hours/export')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN, UserRole.CLIENT)
  @ApiOperation({ summary: 'S40: Export working hours as Excel' })
  async exportWorkingHours(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('companyId') companyId?: string,
    @Query('officeId') officeId?: string,
    @Query('clientId') clientId?: string,
    @Query('teamId') teamId?: string,
    @Query('clientTimezone') clientTimezone?: string,
    @Res() res?: Response,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    await this.reportsService.exportWorkingHours(
      { startDate, endDate, companyId, officeId, clientId, teamId, clientTimezone },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
      res!,
    );
  }

  // ── S41: Staff Allocation ──────────────────────────────────────────────────

  @Get('staff-allocation')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S41: Staff allocation by client (teams + projects)' })
  getStaffAllocation(
    @CurrentUser() user: CurrentUserPayload,
    @Query('companyId') companyId?: string,
  ) {
    return this.reportsService.getStaffAllocation(
      { companyId },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }
  // ── S25 Tab 7: Daily Log ──────────────────────────────────────────────────

  @Get('attendance/daily-log')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S25 T7: Daily attendance log per staff per day' })
  async getDailyLog(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('staffId') staffId?: string,
    @Query('companyId') companyId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    return this.reportsService.getDailyLog(
      {
        startDate: startDate ?? today,
        endDate: endDate ?? today,
        staffId,
        companyId,
        departmentId,
        teamId,
        clientTimezone,
      },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('attendance/daily-log/export')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S25 T7: Export daily log as Excel' })
  async exportDailyLog(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('staffId') staffId?: string,
    @Query('companyId') companyId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
    @Query('clientTimezone') clientTimezone?: string,
    @Res() res?: Response,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    await this.reportsService.exportDailyLog(
      {
        startDate: startDate ?? today,
        endDate: endDate ?? today,
        staffId,
        companyId,
        departmentId,
        teamId,
        clientTimezone,
      },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
      res!,
    );
  }

  // ── S26 Tab 4: Weekly Attendance Grid ─────────────────────────────────────

  @Get('hr/weekly-grid')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S26 T4: Weekly attendance grid with violation flags' })
  async getWeeklyGrid(
    @CurrentUser() user: CurrentUserPayload,
    @Query('weekStart') weekStart: string,
    @Query('companyId') companyId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
    @Query('staffId') staffId?: string,
    @Query('clientTimezone') clientTimezone?: string,
  ) {
    // Default weekStart = last Monday
    const resolvedWeekStart = weekStart ?? this.lastMonday();
    return this.reportsService.getWeeklyGrid(
      { weekStart: resolvedWeekStart, companyId, departmentId, teamId, staffId, clientTimezone },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
    );
  }

  @Get('hr/weekly-grid/export')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'S26 T4: Export weekly grid as Excel' })
  async exportWeeklyGrid(
    @CurrentUser() user: CurrentUserPayload,
    @Query('weekStart') weekStart: string,
    @Query('companyId') companyId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
    @Query('staffId') staffId?: string,
    @Query('clientTimezone') clientTimezone?: string,
    @Res() res?: Response,
  ) {
    const resolvedWeekStart = weekStart ?? this.lastMonday();
    await this.reportsService.exportWeeklyGrid(
      { weekStart: resolvedWeekStart, companyId, departmentId, teamId, staffId, clientTimezone },
      { staffId: user?.staffId ?? '', roles: user?.roles ?? [] },
      res!,
    );
  }

  // ── S26 Tab 5: Disabled Managers ──────────────────────────────────────────

  @Get('disabled-managers')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List *Manager rows where the staff is disabled' })
  async getDisabledManagersWarning() {
    const data = await this.reportsService.getDisabledManagersWarning();
    return { success: true, data };
  }

  private lastMonday(): string {
    const d = new Date();
    const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? 6 : day - 1;
    d.setUTCDate(d.getUTCDate() - diff);
    return d.toISOString().slice(0, 10);
  }
}