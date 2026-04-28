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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { SystemStatusesService, IStatusFilter } from './statuses.service';
import { CreateStatusDto, UpdateStatusDto, ReorderStatusDto } from './dto/status.dto';

@ApiTags('system/statuses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('system/statuses')
export class SystemStatusesController {
  constructor(private readonly statusesService: SystemStatusesService) {}

  @Get()
  @ApiOperation({ summary: 'List statuses with optional scope filter' })
  findAll(@Query() filter: IStatusFilter) {
    // 'system' scope returns the global rows (all scope IDs NULL) — no scopeId needed.
    if (filter.scope && filter.scope !== 'system' && !filter.scopeId) {
      throw new BadRequestException('scopeId is required when scope is specified');
    }
    return this.statusesService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get status by ID' })
  findOne(@Param('id') id: string) {
    return this.statusesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create status' })
  create(@Body() dto: CreateStatusDto, @CurrentUser() user: CurrentUserPayload) {
    return this.statusesService.create(dto, user?.sub ?? 'system');
  }

  // FE drag-and-drop caller removed per CR-016 (2026-04-23) — manual orderNo input
  // replaces reorder. Endpoint kept as admin escape hatch; remove after one release cycle.
  @Put('reorder')
  @ApiOperation({ summary: 'Reorder statuses by array position' })
  reorder(@Body() dto: ReorderStatusDto, @CurrentUser() user: CurrentUserPayload) {
    return this.statusesService.reorder(dto, user?.sub ?? 'system');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update status' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.statusesService.update(id, dto, user?.sub ?? 'system');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete status (checks for TimeTracking references)' })
  remove(@Param('id') id: string) {
    return this.statusesService.remove(id);
  }
}
