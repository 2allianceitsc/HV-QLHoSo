import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { extractIp } from '../common/utils/extract-ip';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ClientService, PaginationParams } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import {
  CreateClientDepartmentDto,
  UpdateClientDepartmentDto,
  CreateClientProjectDto,
  UpdateClientProjectDto,
  CreateClientContactDto,
  UpdateClientContactDto,
  AssignStaffDto,
  UpdateAssignStaffDto,
} from './dto/client-sub.dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // ── Clients ──────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List clients (paginated)' })
  findAll(@Query() params: PaginationParams) {
    return this.clientService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  findOne(@Param('id') id: string) {
    return this.clientService.findOne(id);
  }

  @Post()
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create client' })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    return this.clientService.create(dto, user?.sub ?? 'system', extractIp(req));
  }

  @Put(':id')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update client' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientService.update(id, dto, user?.sub ?? 'system');
  }

  @Delete(':id')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete client' })
  remove(@Param('id') id: string) {
    return this.clientService.remove(id);
  }

  // ── Departments ───────────────────────────────────────────────────────────────

  @Get(':id/departments')
  @ApiOperation({ summary: 'List client departments' })
  findDepartments(@Param('id') id: string) {
    return this.clientService.findDepartments(id);
  }

  @Post(':id/departments')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create client department' })
  createDepartment(
    @Param('id') id: string,
    @Body() dto: CreateClientDepartmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientService.createDepartment(id, dto, user?.sub ?? 'system');
  }

  @Put(':id/departments/:deptId')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update client department' })
  updateDepartment(
    @Param('id') id: string,
    @Param('deptId') deptId: string,
    @Body() dto: UpdateClientDepartmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientService.updateDepartment(id, deptId, dto, user?.sub ?? 'system');
  }

  @Delete(':id/departments/:deptId')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete client department' })
  removeDepartment(@Param('id') id: string, @Param('deptId') deptId: string) {
    return this.clientService.removeDepartment(id, deptId);
  }

  // ── Projects ──────────────────────────────────────────────────────────────────

  @Get(':id/projects')
  @ApiOperation({ summary: 'List client projects' })
  findProjects(@Param('id') id: string) {
    return this.clientService.findProjects(id);
  }

  @Post(':id/projects')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create client project' })
  createProject(
    @Param('id') id: string,
    @Body() dto: CreateClientProjectDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientService.createProject(id, dto, user?.sub ?? 'system');
  }

  @Put(':id/projects/:projId')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update client project' })
  updateProject(
    @Param('id') id: string,
    @Param('projId') projId: string,
    @Body() dto: UpdateClientProjectDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientService.updateProject(id, projId, dto, user?.sub ?? 'system');
  }

  @Delete(':id/projects/:projId')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete client project' })
  removeProject(@Param('id') id: string, @Param('projId') projId: string) {
    return this.clientService.removeProject(id, projId);
  }

  // ── Contacts ──────────────────────────────────────────────────────────────────

  @Get(':id/contacts')
  @ApiOperation({ summary: 'List client contacts' })
  findContacts(@Param('id') id: string) {
    return this.clientService.findContacts(id);
  }

  @Post(':id/contacts')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create client contact' })
  createContact(
    @Param('id') id: string,
    @Body() dto: CreateClientContactDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientService.createContact(id, dto, user?.sub ?? 'system');
  }

  @Put(':id/contacts/:contactId')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update client contact' })
  updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateClientContactDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientService.updateContact(id, contactId, dto, user?.sub ?? 'system');
  }

  @Delete(':id/contacts/:contactId')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete client contact' })
  removeContact(@Param('id') id: string, @Param('contactId') contactId: string) {
    return this.clientService.removeContact(id, contactId);
  }

  // ── Employees ─────────────────────────────────────────────────────────────────

  @Get(':id/employees')
  @ApiOperation({ summary: 'List client employees' })
  findEmployees(@Param('id') id: string) {
    return this.clientService.findEmployees(id);
  }

  @Post(':id/employees')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign staff to client' })
  assignEmployee(
    @Param('id') id: string,
    @Body() dto: AssignStaffDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientService.assignEmployee(id, dto, user?.sub ?? 'system');
  }

  @Put(':id/employees/:staffId')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update staff assignment (dates, department, isPrimary)' })
  updateEmployee(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @Body() dto: UpdateAssignStaffDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientService.updateEmployee(id, staffId, dto, user?.sub ?? 'system');
  }

  @Delete(':id/employees/:staffId')
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Unassign staff from client' })
  unassignEmployee(@Param('id') id: string, @Param('staffId') staffId: string) {
    return this.clientService.unassignEmployee(id, staffId);
  }
}
