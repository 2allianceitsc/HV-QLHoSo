import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiresScreen } from '../../common/decorators/requires-screen.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@ApiTags('system/roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('system/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequiresScreen('SY01', { permission: 'VIEW' })
  @ApiOperation({ summary: 'List all roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create role' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: CurrentUserPayload) {
    return this.rolesService.create(dto, user?.sub ?? 'system');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.rolesService.update(id, dto, user?.sub ?? 'system');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role (checks for assigned staff)' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
