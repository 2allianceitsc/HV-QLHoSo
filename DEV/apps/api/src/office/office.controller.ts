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
import { OfficeService } from './office.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { PaginationParams } from '../company/company.service';
import { IsArray, IsString } from 'class-validator';

class ReplaceManagersDto {
  @IsArray()
  @IsString({ each: true })
  staffIds: string[] = [];
}

@ApiTags('offices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('offices')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Get()
  @ApiOperation({ summary: 'List offices' })
  findAll(@Query() params: PaginationParams & { companyId?: string }) {
    return this.officeService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get office by ID' })
  findOne(@Param('id') id: string) {
    return this.officeService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create office' })
  create(
    @Body() dto: CreateOfficeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.officeService.create(dto, user?.sub ?? 'system');
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update office' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOfficeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.officeService.update(id, dto, user?.sub ?? 'system');
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete office' })
  remove(@Param('id') id: string) {
    return this.officeService.remove(id);
  }

  // ── Managers ─────────────────────────────────────────────────────────────────

  @Get(':id/managers')
  @ApiOperation({ summary: 'List active managers for an office' })
  findManagers(@Param('id') id: string) {
    return this.officeService.findManagers(id);
  }

  @Post(':id/managers/:staffId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a manager to an office' })
  addManager(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.officeService.addManager(id, staffId, user?.sub ?? 'system');
  }

  @Delete(':id/managers/:staffId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a manager from an office' })
  removeManager(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.officeService.removeManager(id, staffId, user?.sub ?? 'system');
  }

  @Put(':id/managers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Replace full manager set for an office' })
  replaceManagers(
    @Param('id') id: string,
    @Body() dto: ReplaceManagersDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.officeService.replaceManagers(id, dto.staffIds, user?.sub ?? 'system');
  }

  // ── Employees ────────────────────────────────────────────────────────────────

  @Get(':id/employees')
  @ApiOperation({ summary: 'List employees under an office (paginated)' })
  findEmployees(
    @Param('id') id: string,
    @Query() params: PaginationParams,
  ) {
    return this.officeService.findEmployees(id, params);
  }
}
