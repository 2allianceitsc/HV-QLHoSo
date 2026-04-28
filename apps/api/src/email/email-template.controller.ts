import { Controller, Get, Put, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNotEmpty } from 'class-validator';
import { DEFAULT_TEMPLATES } from './email-default-templates';

class UpdateTemplateDto {
  @IsString()
  @IsNotEmpty()
  html!: string;
}

const TEMPLATE_TYPES = ['otp', 'welcome', 'auto_logout'] as const;
type TemplateType = typeof TEMPLATE_TYPES[number];

const TEMPLATE_DESCRIPTIONS: Record<TemplateType, string> = {
  otp:         'OTP email template — use {{OTP}} as placeholder for the code, {{EXPIRY_MINUTES}} for expiry',
  welcome:     'Welcome email template — use {{FULL_NAME}} for recipient name',
  auto_logout: 'Auto-logout alert template — use {{FIRST_NAME}} and {{LOGOUT_TIME}}',
};

@ApiTags('email-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('email-templates')
export class EmailTemplateController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all email templates' })
  async findAll() {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: TEMPLATE_TYPES.map((t) => `email.template.${t}`) } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
    const templates = TEMPLATE_TYPES.map((type) => ({
      type,
      key: `email.template.${type}`,
      description: TEMPLATE_DESCRIPTIONS[type],
      // Fall back to default template when DB value is empty
      html: map[`email.template.${type}`]?.trim() || DEFAULT_TEMPLATES[type] || '',
    }));
    return { success: true, data: templates };
  }

  @Put(':type')
  @ApiOperation({ summary: 'Update an email template' })
  async update(@Param('type') type: string, @Body() dto: UpdateTemplateDto) {
    if (!(TEMPLATE_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException(`Unknown template type: ${type}`);
    }
    const key = `email.template.${type}`;
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: dto.html, description: TEMPLATE_DESCRIPTIONS[type as TemplateType], category: 'email', logUpdatedBy: 'system' },
      update: { value: dto.html, logUpdatedBy: 'system' },
    });
    return { success: true, message: 'Template updated' };
  }
}
