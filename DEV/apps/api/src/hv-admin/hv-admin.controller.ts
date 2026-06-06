import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { HvAdminService, CreateHvUserDto, UpdateHvUserDto, CreateSubmissionStatusDto, UpdateSubmissionStatusDto } from './hv-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { HvRoles } from '../common/decorators/hv-roles.decorator';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

class CreateDeptDto { @IsString() @IsNotEmpty() name!: string; }
class UpdateDeptDto { @IsString() @IsNotEmpty() name!: string; }
class ToggleDeptDto { @IsBoolean() isDisabled!: boolean; }

@UseGuards(JwtAuthGuard, HvRoleGuard)
@HvRoles('admin')
@Controller('admin')
export class HvAdminController {
  constructor(private readonly service: HvAdminService) {}

  @Get('users')
  listUsers(@Query('hvRole') hvRole?: string) {
    return this.service.listUsers(hvRole);
  }

  @Post('users')
  createUser(@Req() req: Request, @Body() dto: CreateHvUserDto) {
    return this.service.createUser(dto, (req.user as IJwtPayload).staffId);
  }

  @Put('users/:id')
  updateUser(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateHvUserDto) {
    return this.service.updateUser(id, dto, (req.user as IJwtPayload).staffId);
  }

  @Delete('users/:id')
  deleteUser(@Req() req: Request, @Param('id') id: string) {
    return this.service.deleteUser(id, (req.user as IJwtPayload).staffId);
  }

  @Post('users/:id/reset-password')
  resetPassword(@Req() req: Request, @Param('id') id: string) {
    return this.service.resetPassword(id, (req.user as IJwtPayload).staffId);
  }

  @Get('departments')
  listDepartments() {
    return this.service.listDepartments();
  }

  @Post('departments')
  createDepartment(@Req() req: Request, @Body() dto: CreateDeptDto) {
    return this.service.createDepartment(dto.name, (req.user as IJwtPayload).staffId);
  }

  @Put('departments/:id')
  updateDepartment(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateDeptDto) {
    return this.service.updateDepartment(id, dto.name, (req.user as IJwtPayload).staffId);
  }

  @Put('departments/:id/toggle-disabled')
  toggleDepartmentDisabled(@Req() req: Request, @Param('id') id: string, @Body() dto: ToggleDeptDto) {
    return this.service.toggleDepartmentDisabled(id, dto.isDisabled, (req.user as IJwtPayload).staffId);
  }

  @Delete('departments/:id')
  deleteDepartment(@Req() req: Request, @Param('id') id: string) {
    return this.service.deleteDepartment(id, (req.user as IJwtPayload).staffId);
  }

  @Get('submission-statuses')
  listSubmissionStatuses() {
    return this.service.listSubmissionStatuses();
  }

  @Post('submission-statuses')
  createSubmissionStatus(@Req() req: Request, @Body() dto: CreateSubmissionStatusDto) {
    return this.service.createSubmissionStatus(dto, (req.user as IJwtPayload).staffId);
  }

  @Put('submission-statuses/:code')
  updateSubmissionStatus(@Req() req: Request, @Param('code') code: string, @Body() dto: UpdateSubmissionStatusDto) {
    return this.service.updateSubmissionStatus(code, dto, (req.user as IJwtPayload).staffId);
  }

  @Delete('submission-statuses/:code')
  deleteSubmissionStatus(@Param('code') code: string) {
    return this.service.deleteSubmissionStatus(code);
  }
}
