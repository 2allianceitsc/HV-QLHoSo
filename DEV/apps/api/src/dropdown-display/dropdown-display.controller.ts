import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { DropdownDisplayService } from './dropdown-display.service';
import { UpdateDropdownDisplayDto } from './dto/update-dropdown-display.dto';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings/dropdown-display')
export class DropdownDisplayController {
  constructor(private readonly service: DropdownDisplayService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get dropdown display configs for the current user company (all authenticated roles)',
  })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.service.findAllForUser(user?.staffId);
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upsert dropdown display configs (batch)' })
  update(
    @Body() dto: UpdateDropdownDisplayDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.upsertMany(dto.configs, user?.staffId, user?.sub ?? 'system');
  }
}
