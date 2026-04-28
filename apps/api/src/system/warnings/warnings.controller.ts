import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { SystemWarningsService } from './warnings.service';

@ApiTags('system/warnings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('system/warnings')
export class SystemWarningsController {
  constructor(private readonly warningsService: SystemWarningsService) {}

  @Get()
  @ApiOperation({ summary: 'Get system health warnings' })
  @ApiQuery({ name: 'category', required: false })
  async findAll(@Query('category') category?: string) {
    const data = category
      ? await this.warningsService.checkByCategory(category)
      : await this.warningsService.checkAll();
    return { success: true, data };
  }

  @Post('scan-employee-photos')
  @ApiOperation({ summary: 'Scan employee photo URLs and report broken links' })
  async scanEmployeePhotos() {
    const data = await this.warningsService.scanEmployeePhotoUrls();
    return { success: true, data };
  }

  @Get('session-blocked')
  @ApiOperation({ summary: 'List users whose allSessionsRevokedAt is in the future (cannot log in)' })
  async getSessionBlockedUsers() {
    const data = await this.warningsService.getSessionBlockedUsers();
    return { success: true, data };
  }
}
