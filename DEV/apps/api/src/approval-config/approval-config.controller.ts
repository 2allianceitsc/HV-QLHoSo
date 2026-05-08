import { Controller, Get, Put, Param, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApprovalConfigService, UpdateApprovalConfigDto } from './approval-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { HvRoles } from '../common/decorators/hv-roles.decorator';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard, HvRoleGuard)
@HvRoles('admin')
@Controller('approval-config')
export class ApprovalConfigController {
  constructor(private readonly service: ApprovalConfigService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('reviewers')
  listReviewers() {
    return this.service.listReviewers();
  }

  @Get('approvers')
  listApprovers() {
    return this.service.listApprovers();
  }

  @Put(':departmentId')
  upsert(@Req() req: Request, @Param('departmentId') departmentId: string, @Body() dto: UpdateApprovalConfigDto) {
    return this.service.upsert(departmentId, dto, (req.user as IJwtPayload).staffId);
  }
}
