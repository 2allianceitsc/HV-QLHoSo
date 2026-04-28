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
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PaginationParams } from '../company/company.service';

@ApiTags('positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('positions')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Get()
  @ApiOperation({ summary: 'List positions' })
  findAll(@Query() params: PaginationParams & { companyId?: string }) {
    return this.positionService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  findOne(@Param('id') id: string) {
    return this.positionService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create position' })
  create(
    @Body() dto: CreatePositionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.positionService.create(dto, user?.sub ?? 'system');
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update position' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.positionService.update(id, dto, user?.sub ?? 'system');
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete position' })
  remove(@Param('id') id: string) {
    return this.positionService.remove(id);
  }
}
