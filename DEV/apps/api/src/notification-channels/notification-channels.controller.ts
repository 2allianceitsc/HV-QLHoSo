import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { HvRoles } from '../common/decorators/hv-roles.decorator';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';
import { NotificationChannelsService } from './notification-channels.service';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { UpdateWebhookTemplateDto } from './dto/update-template.dto';
import { TestChannelDto } from './dto/test-channel.dto';

@UseGuards(JwtAuthGuard, HvRoleGuard)
@HvRoles('admin')
@Controller('system/notification-channels')
export class NotificationChannelsController {
  constructor(private readonly service: NotificationChannelsService) {}

  @Get()
  list() {
    return this.service.findAll();
  }

  @Put(':type')
  update(@Req() req: Request, @Param('type') type: string, @Body() dto: UpdateChannelDto) {
    return this.service.update(type, dto, (req.user as IJwtPayload).staffId);
  }

  @Post(':type/test')
  test(@Param('type') type: string, @Body() dto: TestChannelDto) {
    return this.service.test(type, dto?.webhookUrl);
  }
}

@UseGuards(JwtAuthGuard, HvRoleGuard)
@HvRoles('admin')
@Controller('system/webhook-templates')
export class WebhookTemplatesController {
  constructor(private readonly service: NotificationChannelsService) {}

  @Get()
  list() {
    return this.service.listTemplates();
  }

  @Get(':eventId')
  getOne(@Param('eventId') eventId: string) {
    return this.service.getTemplate(eventId);
  }

  @Put(':eventId')
  update(
    @Req() req: Request,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateWebhookTemplateDto,
  ) {
    return this.service.updateTemplate(eventId, dto, (req.user as IJwtPayload).staffId);
  }
}
