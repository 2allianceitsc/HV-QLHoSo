import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApprovalRulesService } from './approval-rules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { HvRoles } from '../common/decorators/hv-roles.decorator';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';
import {
  CreateApprovalRuleDetailDto,
  CreateApprovalRuleDto,
  PreviewApprovalDto,
  UpdateApprovalRuleDetailDto,
  UpdateApprovalRuleDto,
} from './dto/approval-rule.dto';

@UseGuards(JwtAuthGuard, HvRoleGuard)
@Controller('approval-rules')
export class ApprovalRulesController {
  constructor(private readonly service: ApprovalRulesService) {}

  // Preview endpoint open to any authenticated user — used in S06 create-submission flow.
  @Post('preview')
  preview(@Body() dto: PreviewApprovalDto) {
    return this.service.preview(dto);
  }

  // ───────────── admin-only below ─────────────

  @Get('matrix')
  @HvRoles('admin')
  matrix() {
    return this.service.matrix();
  }

  @Get()
  @HvRoles('admin')
  list(
    @Query('submissionType') submissionType: 'MS' | 'NT',
    @Query('costCodeId') costCodeId?: string,
  ) {
    return this.service.list(submissionType, costCodeId);
  }

  @Get(':id')
  @HvRoles('admin')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post()
  @HvRoles('admin')
  create(@Req() req: Request, @Body() dto: CreateApprovalRuleDto) {
    return this.service.createHeader(dto, (req.user as IJwtPayload).staffId);
  }

  @Patch(':id')
  @HvRoles('admin')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateApprovalRuleDto) {
    return this.service.updateHeader(id, dto, (req.user as IJwtPayload).staffId);
  }

  @Delete(':id')
  @HvRoles('admin')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.deleteHeader(id, (req.user as IJwtPayload).staffId);
  }

  @Post(':id/details')
  @HvRoles('admin')
  addDetail(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateApprovalRuleDetailDto) {
    return this.service.addDetail(id, dto, (req.user as IJwtPayload).staffId);
  }
}

@UseGuards(JwtAuthGuard, HvRoleGuard)
@HvRoles('admin')
@Controller('approval-rule-details')
export class ApprovalRuleDetailsController {
  constructor(private readonly service: ApprovalRulesService) {}

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateApprovalRuleDetailDto) {
    return this.service.updateDetail(id, dto, (req.user as IJwtPayload).staffId);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.deleteDetail(id, (req.user as IJwtPayload).staffId);
  }
}
