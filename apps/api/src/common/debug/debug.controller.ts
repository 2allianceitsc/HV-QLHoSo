import { Body, Controller, Delete, Get, Put, Query, UseGuards, HttpCode } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { DebugService } from './debug.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../decorators/current-user.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { PrismaService } from '../../prisma/prisma.service';

class ToggleDebugDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('system/debug-mode')
export class DebugController {
  constructor(
    private readonly debugService: DebugService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async status(): Promise<{ success: boolean; data: { enabled: boolean } }> {
    return { success: true, data: { enabled: await this.debugService.isEnabled() } };
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async toggle(
    @Body() dto: ToggleDebugDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: boolean; data: { enabled: boolean } }> {
    const value = dto.enabled ? 'true' : 'false';
    await this.prisma.systemSetting.upsert({
      where: { key: 'system.debug_mode' },
      update: { value, logUpdatedBy: user?.sub ?? 'system' },
      create: {
        key: 'system.debug_mode',
        value,
        category: 'system',
        description: 'Global debug flag — when true, services emit detailed trace logs',
        logUpdatedBy: user?.sub ?? 'system',
      },
    });
    this.debugService.invalidateCache();
    return { success: true, data: { enabled: dto.enabled } };
  }
}

@Controller('system/debug-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class DebugLogsController {
  constructor(private readonly debugService: DebugService) {}

  @Get()
  list(
    @Query('limit') limit = '200',
    @Query('offset') offset = '0',
    @Query('context') context?: string,
  ) {
    const result = this.debugService.getRecent({
      limit: Math.min(Number(limit) || 200, 500),
      offset: Math.max(Number(offset) || 0, 0),
      context,
    });
    return { success: true, data: result };
  }

  @Delete()
  clear() {
    this.debugService.clear();
    return { success: true, data: { cleared: true } };
  }
}

@Controller('system/test')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class DebugTestController {
  @Get('server-time')
  @HttpCode(200)
  serverTime(): { success: boolean; data: { serverUtcMs: number; serverUtcIso: string } } {
    const now = new Date();
    return {
      success: true,
      data: {
        serverUtcMs: now.getTime(),
        serverUtcIso: now.toISOString(),
      },
    };
  }
}
