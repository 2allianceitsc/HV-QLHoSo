import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequiresScreen } from '../common/decorators/requires-screen.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';
import { UserRole } from '@shared/enums/user-role.enum';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('employee')
  @RequiresScreen('D01', { permission: 'VIEW' })
  @ApiOperation({ summary: 'Employee dashboard — current status + shift info' })
  getEmployee(@CurrentUser() user: IJwtPayload) {
    return this.dashboardService.getEmployeeDashboard(user);
  }

  @Get('manager')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @RequiresScreen('D02', { permission: 'VIEW' })
  @ApiOperation({ summary: 'Manager dashboard — team overview' })
  getManager(@CurrentUser() user: IJwtPayload) {
    return this.dashboardService.getManagerDashboard(user);
  }

  @Get('hr')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @RequiresScreen('D03', { permission: 'VIEW' })
  @ApiOperation({ summary: 'HR dashboard — company-wide metrics' })
  getHr() {
    return this.dashboardService.getHrDashboard();
  }

  @Get('client')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  @RequiresScreen('D04', { permission: 'VIEW' })
  @ApiOperation({ summary: 'Client dashboard — assigned staff status' })
  getClient(@CurrentUser() user: IJwtPayload) {
    return this.dashboardService.getClientDashboard(user);
  }
}
