import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { EmailConfigService } from './email-config.service';
import { EmailJobService } from './email-job.service';
import { CreateEmailConfigDto, UpdateEmailConfigDto } from './dto/email-config.dto';
import { IsEmail, IsNotEmpty } from 'class-validator';

class SendTestEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to!: string;
}

@ApiTags('email-configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('email-configs')
export class EmailConfigController {
  constructor(
    private readonly emailConfigService: EmailConfigService,
    private readonly emailJobService: EmailJobService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all email provider configs' })
  async findAll() {
    const data = await this.emailConfigService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single email provider config (includes credentials)' })
  async findOne(@Param('id') id: string) {
    const data = await this.emailConfigService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new email provider config' })
  async create(@Body() dto: CreateEmailConfigDto, @Request() req: { user: { sub: string } }) {
    const data = await this.emailConfigService.create(dto, req.user.sub);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an email provider config' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmailConfigDto,
    @Request() req: { user: { sub: string } },
  ) {
    const data = await this.emailConfigService.update(id, dto, req.user.sub);
    this.emailJobService.invalidateCache();
    return { success: true, data };
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Set this config as the active email provider' })
  async activate(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    const result = await this.emailConfigService.setActive(id, req.user.sub);
    this.emailJobService.invalidateCache();
    return result;
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate this provider — no provider will be active until another is set active' })
  async deactivate(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    const result = await this.emailConfigService.deactivate(id, req.user.sub);
    this.emailJobService.invalidateCache();
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an email provider config' })
  async remove(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.emailConfigService.remove(id, req.user.sub);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test email using this config' })
  async sendTest(
    @Param('id') id: string,
    @Body() dto: SendTestEmailDto,
  ) {
    if (!dto.to) throw new BadRequestException('Recipient email (to) is required');
    await this.emailJobService.sendTestEmail(id, dto.to);
    return { success: true, message: `Test email sent to ${dto.to}` };
  }
}
