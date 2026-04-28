import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { SystemVibeIconsService } from './vibe-icons.service';
import {
  CreateVibeIconDto,
  UpdateVibeIconDto,
  ReorderVibeIconsDto,
  CreateVibeIconSetDto,
  UpdateVibeIconSetDto,
  CopyIconsDto,
} from './dto/vibe-icon.dto';

@ApiTags('system/vibe-icons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('system/vibe-icons')
export class SystemVibeIconsController {
  constructor(private readonly vibeIconsService: SystemVibeIconsService) {}

  // ── Icon Sets ──────────────────────────────────────────────────────────────

  @Get('sets')
  @ApiOperation({ summary: 'List all VIBE icon sets' })
  findAllSets() {
    return this.vibeIconsService.findAllSets();
  }

  @Post('sets')
  @ApiOperation({ summary: 'Create VIBE icon set' })
  createSet(@Body() dto: CreateVibeIconSetDto, @CurrentUser() user: CurrentUserPayload) {
    return this.vibeIconsService.createSet(dto, user?.sub ?? 'system');
  }

  @Put('sets/:id/activate')
  @ApiOperation({ summary: 'Activate a VIBE icon set (deactivates all others)' })
  activateSet(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.vibeIconsService.activateSet(id, user?.sub ?? 'system');
  }

  @Put('sets/:id')
  @ApiOperation({ summary: 'Update VIBE icon set' })
  updateSet(
    @Param('id') id: string,
    @Body() dto: UpdateVibeIconSetDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vibeIconsService.updateSet(id, dto, user?.sub ?? 'system');
  }

  @Delete('sets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete VIBE icon set (cannot delete active set)' })
  removeSet(@Param('id') id: string) {
    return this.vibeIconsService.removeSet(id);
  }

  @Post('sets/collect-orphans')
  @ApiOperation({ summary: 'Move all orphaned icons (no set) into a "NoName" set' })
  collectOrphans(@CurrentUser() user: CurrentUserPayload) {
    return this.vibeIconsService.collectOrphans(user?.sub ?? 'system');
  }

  @Post('sets/:id/copy-icons')
  @ApiOperation({ summary: 'Copy icons from another set into this set' })
  copyIconsToSet(
    @Param('id') id: string,
    @Body() dto: CopyIconsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vibeIconsService.copyIconsToSet(id, dto.sourceSetId, user?.sub ?? 'system');
  }

  @Post('sets/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate a set with all its icons' })
  duplicateSet(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.vibeIconsService.duplicateSet(id, user?.sub ?? 'system');
  }

  @Get('sets/:id/icons')
  @ApiOperation({ summary: 'List icons in a specific set' })
  findIconsBySet(@Param('id') id: string) {
    return this.vibeIconsService.findIconsBySet(id);
  }

  // ── Icons ──────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all VIBE icons with admin details' })
  findAll() {
    return this.vibeIconsService.findAll();
  }

  @Post('scan-urls')
  @ApiOperation({ summary: 'Scan VIBE icon URLs and report broken links' })
  scanIconUrls() {
    return this.vibeIconsService.scanIconUrls();
  }

  @Post()
  @ApiOperation({ summary: 'Create VIBE icon' })
  create(@Body() dto: CreateVibeIconDto, @CurrentUser() user: CurrentUserPayload) {
    return this.vibeIconsService.create(dto, user?.sub ?? 'system');
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder VIBE icons by array position' })
  reorder(@Body() dto: ReorderVibeIconsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.vibeIconsService.reorder(dto, user?.sub ?? 'system');
  }

  @Put(':id/toggle')
  @ApiOperation({ summary: 'Toggle active/inactive state' })
  toggle(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.vibeIconsService.toggleDisabled(id, user?.sub ?? 'system');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update VIBE icon' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVibeIconDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vibeIconsService.update(id, dto, user?.sub ?? 'system');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete VIBE icon' })
  remove(@Param('id') id: string) {
    return this.vibeIconsService.remove(id);
  }
}
