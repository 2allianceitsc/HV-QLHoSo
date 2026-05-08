import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CostCodeService, CreateCostCodeDto, UpdateCostCodeDto } from './cost-code.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { HvRoles } from '../common/decorators/hv-roles.decorator';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard, HvRoleGuard)
@Controller('cost-codes')
export class CostCodeController {
  constructor(private readonly service: CostCodeService) {}

  @Get()
  list(@Query('departmentId') departmentId?: string) {
    return this.service.list(departmentId);
  }

  @Post()
  @HvRoles('admin')
  create(@Req() req: Request, @Body() dto: CreateCostCodeDto) {
    return this.service.create(dto, (req.user as IJwtPayload).staffId);
  }

  @Put(':id')
  @HvRoles('admin')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateCostCodeDto) {
    return this.service.update(id, dto, (req.user as IJwtPayload).staffId);
  }

  @Delete(':id')
  @HvRoles('admin')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.remove(id, (req.user as IJwtPayload).staffId);
  }
}
