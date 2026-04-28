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
import { CompanyService, PaginationParams } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyContactDto } from './dto/create-company-contact.dto';
import { UpdateCompanyContactDto } from './dto/update-company-contact.dto';
import { IsArray, IsString } from 'class-validator';

class ReplaceManagersDto {
  @IsArray()
  @IsString({ each: true })
  staffIds: string[] = [];
}

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'List companies (paginated)' })
  findAll(@Query() params: PaginationParams) {
    return this.companyService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create company' })
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companyService.create(dto, user?.sub ?? 'system');
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update company' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companyService.update(id, dto, user?.sub ?? 'system');
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete company' })
  remove(@Param('id') id: string) {
    return this.companyService.remove(id);
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: 'List contacts for a company' })
  findContacts(@Param('id') id: string) {
    return this.companyService.findContacts(id);
  }

  @Post(':id/contacts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create company contact' })
  createContact(
    @Param('id') id: string,
    @Body() dto: CreateCompanyContactDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companyService.createContact(id, dto, user?.sub ?? 'system');
  }

  @Put(':id/contacts/:contactId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update company contact' })
  updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateCompanyContactDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companyService.updateContact(id, contactId, dto, user?.sub ?? 'system');
  }

  @Delete(':id/contacts/:contactId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete company contact' })
  removeContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.companyService.removeContact(id, contactId);
  }

  // ── Managers ─────────────────────────────────────────────────────────────────

  @Get(':id/managers')
  @ApiOperation({ summary: 'List active managers for a company' })
  findManagers(@Param('id') id: string) {
    return this.companyService.findManagers(id);
  }

  @Post(':id/managers/:staffId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a manager to a company' })
  addManager(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companyService.addManager(id, staffId, user?.sub ?? 'system');
  }

  @Delete(':id/managers/:staffId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a manager from a company' })
  removeManager(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companyService.removeManager(id, staffId, user?.sub ?? 'system');
  }

  @Put(':id/managers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Replace full manager set for a company' })
  replaceManagers(
    @Param('id') id: string,
    @Body() dto: ReplaceManagersDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companyService.replaceManagers(id, dto.staffIds, user?.sub ?? 'system');
  }

  // ── Employees ────────────────────────────────────────────────────────────────

  @Get(':id/employees')
  @ApiOperation({ summary: 'List employees under a company (paginated)' })
  findEmployees(
    @Param('id') id: string,
    @Query() params: PaginationParams,
  ) {
    return this.companyService.findEmployees(id, params);
  }
}
