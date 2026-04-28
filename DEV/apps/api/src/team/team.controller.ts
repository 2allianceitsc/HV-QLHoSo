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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { PaginationParams } from '../company/company.service';
import { IsArray, IsString } from 'class-validator';

class ReplaceManagersDto {
  @IsArray()
  @IsString({ each: true })
  staffIds: string[] = [];
}

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @ApiOperation({ summary: 'List teams' })
  findAll(@Query() params: PaginationParams & { companyId?: string }) {
    return this.teamService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  findOne(@Param('id') id: string) {
    return this.teamService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create team' })
  create(
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamService.create(dto, user?.sub ?? 'system');
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update team' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamService.update(id, dto, user?.sub ?? 'system');
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete team' })
  remove(@Param('id') id: string) {
    return this.teamService.remove(id);
  }

  // ── Managers ─────────────────────────────────────────────────────────────────

  @Get(':id/managers')
  @ApiOperation({ summary: 'List active managers for a team' })
  findManagers(@Param('id') id: string) {
    return this.teamService.findManagers(id);
  }

  @Post(':id/managers/:staffId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a manager to a team' })
  addManager(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamService.addManager(id, staffId, user?.sub ?? 'system');
  }

  @Delete(':id/managers/:staffId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a manager from a team' })
  removeManager(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamService.removeManager(id, staffId, user?.sub ?? 'system');
  }

  @Put(':id/managers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Replace full manager set for a team' })
  replaceManagers(
    @Param('id') id: string,
    @Body() dto: ReplaceManagersDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamService.replaceManagers(id, dto.staffIds, user?.sub ?? 'system');
  }

  // ── Employees ────────────────────────────────────────────────────────────────

  @Get(':id/employees')
  @ApiOperation({ summary: 'List employees under a team (paginated)' })
  findEmployees(
    @Param('id') id: string,
    @Query() params: PaginationParams,
  ) {
    return this.teamService.findEmployees(id, params);
  }
}
