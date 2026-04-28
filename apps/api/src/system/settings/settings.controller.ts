import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingDto, BulkUpdateSettingsDto } from './dto/setting.dto';

@ApiTags('system/settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('system/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all settings grouped by category' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get single setting by key' })
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  @Put()
  @ApiOperation({ summary: 'Bulk update settings { key: value }' })
  bulkUpdate(@Body() dto: BulkUpdateSettingsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.bulkUpdate(dto.settings, user?.sub ?? 'system');
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update single setting' })
  updateOne(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.settingsService.updateOne(key, dto, user?.sub ?? 'system');
  }
}
