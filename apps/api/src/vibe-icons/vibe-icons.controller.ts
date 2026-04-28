import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VibeIconsService } from './vibe-icons.service';

@ApiTags('vibe-icons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vibe-icons')
export class VibeIconsController {
  constructor(private readonly vibeIconsService: VibeIconsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active VIBE icons' })
  findAll() {
    return this.vibeIconsService.findAll();
  }
}
