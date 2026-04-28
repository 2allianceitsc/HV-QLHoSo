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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationParams } from '../company/company.service';
import { IsArray, IsString } from 'class-validator';

class ReplaceManagersDto {
  @IsArray()
  @IsString({ each: true })
  staffIds: string[] = [];
}

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @ApiOperation({ summary: 'List departments' })
  findAll(@Query() params: PaginationParams & { companyId?: string }) {
    return this.departmentService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create department' })
  create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.departmentService.create(dto, user?.sub ?? 'system');
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update department' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.departmentService.update(id, dto, user?.sub ?? 'system');
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete department' })
  remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }

  // ── Managers ─────────────────────────────────────────────────────────────────

  @Get(':id/managers')
  @ApiOperation({ summary: 'List active managers for a department' })
  findManagers(@Param('id') id: string) {
    return this.departmentService.findManagers(id);
  }

  @Post(':id/managers/:staffId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a manager to a department' })
  addManager(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.departmentService.addManager(id, staffId, user?.sub ?? 'system');
  }

  @Delete(':id/managers/:staffId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a manager from a department' })
  removeManager(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.departmentService.removeManager(id, staffId, user?.sub ?? 'system');
  }

  @Put(':id/managers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Replace full manager set for a department' })
  replaceManagers(
    @Param('id') id: string,
    @Body() dto: ReplaceManagersDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.departmentService.replaceManagers(id, dto.staffIds, user?.sub ?? 'system');
  }

  // ── Employees ────────────────────────────────────────────────────────────────

  @Get(':id/employees')
  @ApiOperation({ summary: 'List employees under a department (paginated)' })
  findEmployees(
    @Param('id') id: string,
    @Query() params: PaginationParams,
  ) {
    return this.departmentService.findEmployees(id, params);
  }
}
