import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { extractIp } from '../common/utils/extract-ip';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequiresScreen } from '../common/decorators/requires-screen.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { EmployeeService, IEmployeeFilter } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto, UpdateRolesDto, ResetPasswordDto } from './dto/update-employee.dto';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('meta/roles')
  @ApiOperation({ summary: 'List all roles for dropdowns' })
  findAllRoles() {
    return this.employeeService.findAllRoles();
  }

  @Get('meta/timezones')
  @ApiOperation({ summary: 'List distinct timezones in use by employees' })
  findDistinctTimezones() {
    return this.employeeService.findDistinctTimezones();
  }

  @Get()
  @RequiresScreen('E01', { permission: 'VIEW' })
  @ApiOperation({ summary: 'List employees with filters and pagination' })
  findAll(@Query() filter: IEmployeeFilter) {
    return this.employeeService.findAll(filter);
  }

  @Get(':id')
  @RequiresScreen('E04', { permission: 'VIEW' })
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Post()
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create employee' })
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    return this.employeeService.create(dto, user?.sub ?? 'system', extractIp(req));
  }

  @Put(':id')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update employee' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    return this.employeeService.update(id, dto, user?.sub ?? 'system', extractIp(req));
  }

  @Delete(':id')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete employee' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    return this.employeeService.remove(id, user?.sub ?? 'system', extractIp(req));
  }

  @Post(':id/reset-password')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reset employee password' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.employeeService.resetPassword(id, dto);
  }

  @Put(':id/roles')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @RequiresScreen('E04', { tab: 'roles', permission: 'UPDATE' })
  @ApiOperation({ summary: 'Assign/remove roles for employee' })
  updateRoles(
    @Param('id') id: string,
    @Body() dto: UpdateRolesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.employeeService.updateRoles(id, dto, user?.sub ?? 'system');
  }

  @Post('import/preview')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Preview Excel import — validates rows' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importPreview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    return this.employeeService.importPreview(file.buffer);
  }

  @Post('import/confirm')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Confirm bulk import of validated rows' })
  importConfirm(
    @Body() body: { rows: Record<string, string>[] },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!Array.isArray(body?.rows)) {
      throw new BadRequestException('Request body must contain a "rows" array');
    }
    return this.employeeService.importConfirm(body.rows, user?.sub ?? 'system');
  }

  // ── Admin 2FA Management ─────────────────────────────────────────────────────

  @Get(':id/2fa')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get 2FA status for an employee (admin view)' })
  get2FAStatus(@Param('id') id: string) {
    return this.employeeService.getEmployee2FAStatus(id);
  }

  @Delete(':id/2fa')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin revoke 2FA for an employee (no password needed)' })
  revoke2FA(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.employeeService.adminRevoke2FA(id, user?.sub ?? 'system');
  }

  @Get(':id/session-status')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get session block status for an employee (admin view)' })
  getSessionStatus(@Param('id') id: string) {
    return this.employeeService.getSessionStatus(id);
  }

  @Post(':id/session/clear')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Clear session block — sets allSessionsRevokedAt to null so employee can log in' })
  clearSessionBlock(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.employeeService.clearSessionBlock(id, user?.sub ?? 'system');
  }

  @Put(':id/2fa/require')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin set/unset 2FA requirement for an employee' })
  set2FARequired(
    @Param('id') id: string,
    @Body() body: { required: boolean },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.employeeService.adminSet2FARequired(id, body.required, user?.sub ?? 'system');
  }
}
