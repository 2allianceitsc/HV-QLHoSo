import {
  Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { SubmissionService, SaveAttachmentDto } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { ListSubmissionsDto } from './dto/list-submissions.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { ReassignStepDto, StepApproveDto, StepRejectDto } from './dto/step-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';
import { IsString } from 'class-validator';

class GetUploadUrlDto {
  @IsString() mimeType!: string;
  @IsString() ext!: string;
}

@UseGuards(JwtAuthGuard, HvRoleGuard)
@Controller('submissions')
export class SubmissionController {
  constructor(private readonly service: SubmissionService) {}

  @Get('departments')
  listDepartments() {
    return this.service.listDepartments();
  }

  @Get('filter-staff')
  listFilterStaff(@Query('hvRole') hvRole: string) {
    if (hvRole !== 'reviewer' && hvRole !== 'approver') {
      throw new BadRequestException('hvRole must be reviewer or approver');
    }
    return this.service.listStaffByRole(hvRole);
  }

  @Get('stats')
  getStats(@Req() req: Request) {
    return this.service.getStats(req.user as IJwtPayload);
  }

  @Get('status-catalog')
  getStatusCatalog() {
    return this.service.getStatusCatalog();
  }

  @Get()
  list(@Req() req: Request, @Query() dto: ListSubmissionsDto) {
    return this.service.list(req.user as IJwtPayload, dto);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.service.findOne(req.user as IJwtPayload, id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateSubmissionDto) {
    return this.service.create(req.user as IJwtPayload, dto);
  }

  @Put(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateSubmissionDto) {
    return this.service.update(req.user as IJwtPayload, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.remove(req.user as IJwtPayload, id);
  }

  @Post(':id/submit')
  submit(@Req() req: Request, @Param('id') id: string) {
    return this.service.submit(req.user as IJwtPayload, id);
  }

  // Step-based decisions (BA approval-rules-by-cost-code.md §8.2).
  // Body must include { stepId, comment? }.
  @Post(':id/approve')
  approve(@Req() req: Request, @Param('id') id: string, @Body() dto: StepApproveDto) {
    return this.service.approveStep(req.user as IJwtPayload, id, dto);
  }

  @Post(':id/reject')
  reject(@Req() req: Request, @Param('id') id: string, @Body() dto: StepRejectDto | RejectSubmissionDto) {
    // Accept new step-based body { stepId, comment } or legacy { reason }.
    if ('stepId' in dto) {
      return this.service.rejectStep(req.user as IJwtPayload, id, dto);
    }
    return this.service.reject(req.user as IJwtPayload, id, dto);
  }

  @Patch(':id/steps/:stepId/reassign')
  reassign(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: ReassignStepDto,
  ) {
    return this.service.reassignStep(req.user as IJwtPayload, id, stepId, dto);
  }

  @Post('upload-url')
  getUploadUrl(@Body() dto: GetUploadUrlDto) {
    return this.service.getUploadUrl(dto.mimeType, dto.ext);
  }

  @Post(':id/attachments')
  saveAttachment(@Req() req: Request, @Param('id') id: string, @Body() dto: SaveAttachmentDto) {
    return this.service.saveAttachment(req.user as IJwtPayload, id, dto);
  }
}
