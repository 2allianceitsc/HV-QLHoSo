import { Controller, Get, Put, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { PrismaService } from '../prisma/prisma.service';

class UpdateHvTemplateDto {
  @IsString() @IsNotEmpty() subject!: string;
  @IsString() @IsNotEmpty() body!: string;
}

const HV_EVENT_IDS = ['E001', 'E002', 'E003', 'E004', 'E005', 'E006', 'E007'] as const;
type HvEventId = typeof HV_EVENT_IDS[number];

const SUBMISSION_VARS = [
  '{code}', '{title}', '{submitter.fullName}', '{department}', '{submittedDate}',
  '{reviewer.fullName}', '{approver.fullName}', '{link}',
];
const SUBMISSION_VARS_WITH_REASON = [...SUBMISSION_VARS, '{reason}'];

const TEMPLATE_META: Record<HvEventId, { label: string; description: string; variables: string[] }> = {
  E001: {
    label: 'Gửi tờ trình → Người thẩm định',
    description: 'Email gửi cho người thẩm định khi tờ trình được submit',
    variables: SUBMISSION_VARS,
  },
  E002: {
    label: 'Thẩm định xong → Người phê duyệt',
    description: 'Email gửi cho người phê duyệt khi tờ trình qua bước thẩm định',
    variables: SUBMISSION_VARS,
  },
  E003: {
    label: 'Phê duyệt → Người trình',
    description: 'Email thông báo tờ trình đã được phê duyệt',
    variables: SUBMISSION_VARS,
  },
  E004: {
    label: 'Từ chối → Người trình',
    description: 'Email thông báo tờ trình bị từ chối, kèm lý do',
    variables: SUBMISSION_VARS_WITH_REASON,
  },
  E005: {
    label: 'Tạo tài khoản mới',
    description: 'Email gửi cho user mới với thông tin đăng nhập tạm',
    variables: ['{fullName}', '{username}', '{tempPassword}'],
  },
  E006: {
    label: 'Quên mật khẩu',
    description: 'Email chứa link reset mật khẩu (hết hạn sau 15 phút)',
    variables: ['{fullName}', '{resetLink}'],
  },
  E007: {
    label: 'Admin reset mật khẩu',
    description: 'Email thông báo mật khẩu đã được admin reset',
    variables: ['{fullName}', '{tempPassword}'],
  },
};

const DEFAULT_SUBJECTS: Record<HvEventId, string> = {
  E001: 'Tờ trình {code} cần thẩm định',
  E002: 'Tờ trình {code} cần phê duyệt',
  E003: 'Tờ trình {code} đã được phê duyệt',
  E004: 'Tờ trình {code} bị từ chối',
  E005: 'Thông tin đăng nhập hệ thống HV',
  E006: 'Đặt lại mật khẩu hệ thống HV',
  E007: 'Mật khẩu tài khoản HV đã được reset',
};

const DEFAULT_BODIES: Record<HvEventId, string> = {
  E001: `<p>Kính gửi,</p>
<p>Tờ trình <strong>{code}</strong> – "{title}" từ <strong>{submitter.fullName}</strong> (Bộ phận: {department}) đã được gửi vào ngày {submittedDate} và đang chờ thẩm định.</p>
<p><a href="{link}">Nhấn vào đây</a> để xem và xử lý tờ trình.</p>`,

  E002: `<p>Kính gửi,</p>
<p>Tờ trình <strong>{code}</strong> – "{title}" đã được <strong>{reviewer.fullName}</strong> thẩm định và đang chờ phê duyệt.</p>
<p><a href="{link}">Nhấn vào đây</a> để xem và xử lý tờ trình.</p>`,

  E003: `<p>Kính gửi,</p>
<p>Tờ trình <strong>{code}</strong> – "{title}" của bạn đã được <strong>{approver.fullName}</strong> phê duyệt.</p>
<p><a href="{link}">Nhấn vào đây</a> để xem tờ trình.</p>`,

  E004: `<p>Kính gửi,</p>
<p>Tờ trình <strong>{code}</strong> – "{title}" của bạn bị từ chối.</p>
<p><strong>Lý do:</strong> {reason}</p>
<p><a href="{link}">Nhấn vào đây</a> để chỉnh sửa và gửi lại tờ trình.</p>`,

  E005: `<p>Kính gửi <strong>{fullName}</strong>,</p>
<p>Tài khoản của bạn đã được tạo trong hệ thống HV.</p>
<p>Tên đăng nhập: <strong>{username}</strong><br/>Mật khẩu tạm: <strong>{tempPassword}</strong></p>
<p>Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu.</p>`,

  E006: `<p>Kính gửi <strong>{fullName}</strong>,</p>
<p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu (hết hạn sau 15 phút):</p>
<p><a href="{resetLink}">{resetLink}</a></p>
<p>Nếu bạn không yêu cầu reset mật khẩu, hãy bỏ qua email này.</p>`,

  E007: `<p>Kính gửi <strong>{fullName}</strong>,</p>
<p>Mật khẩu tài khoản của bạn đã được quản trị viên reset.</p>
<p>Mật khẩu tạm: <strong>{tempPassword}</strong></p>
<p>Vui lòng đổi mật khẩu ngay sau khi đăng nhập.</p>`,
};

@ApiTags('hv-email-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HvRoleGuard)
@Controller('system/email-templates')
export class HvEmailTemplateController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all HV workflow email templates' })
  async findAll() {
    const keys = HV_EVENT_IDS.flatMap((id) => [
      `hv.email.${id}.subject`,
      `hv.email.${id}.body`,
    ]);
    const rows = await this.prisma.systemSetting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));

    const templates = HV_EVENT_IDS.map((eventId) => {
      const meta = TEMPLATE_META[eventId];
      return {
        eventId,
        label: meta.label,
        description: meta.description,
        variables: meta.variables,
        subject: map[`hv.email.${eventId}.subject`]?.trim() || DEFAULT_SUBJECTS[eventId],
        body: map[`hv.email.${eventId}.body`]?.trim() || DEFAULT_BODIES[eventId],
      };
    });

    return { success: true, data: templates };
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'Get a single HV email template by eventId' })
  async findOne(@Param('eventId') eventId: string) {
    if (!(HV_EVENT_IDS as readonly string[]).includes(eventId)) {
      throw new BadRequestException(`Unknown eventId: ${eventId}`);
    }
    const id = eventId as HvEventId;
    const [subjectRow, bodyRow] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: `hv.email.${id}.subject` } }),
      this.prisma.systemSetting.findUnique({ where: { key: `hv.email.${id}.body` } }),
    ]);

    return {
      success: true,
      data: {
        eventId: id,
        ...TEMPLATE_META[id],
        subject: subjectRow?.value?.trim() || DEFAULT_SUBJECTS[id],
        body: bodyRow?.value?.trim() || DEFAULT_BODIES[id],
      },
    };
  }

  @Put(':eventId')
  @ApiOperation({ summary: 'Update subject and body of an HV email template' })
  async update(@Param('eventId') eventId: string, @Body() dto: UpdateHvTemplateDto) {
    if (!(HV_EVENT_IDS as readonly string[]).includes(eventId)) {
      throw new BadRequestException(`Unknown eventId: ${eventId}`);
    }
    const subjectKey = `hv.email.${eventId}.subject`;
    const bodyKey = `hv.email.${eventId}.body`;
    const meta = TEMPLATE_META[eventId as HvEventId];

    await Promise.all([
      this.prisma.systemSetting.upsert({
        where: { key: subjectKey },
        create: { key: subjectKey, value: dto.subject, description: `${meta.label} — subject`, category: 'hv_email', logUpdatedBy: 'system' },
        update: { value: dto.subject, logUpdatedBy: 'system' },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: bodyKey },
        create: { key: bodyKey, value: dto.body, description: `${meta.label} — body`, category: 'hv_email', logUpdatedBy: 'system' },
        update: { value: dto.body, logUpdatedBy: 'system' },
      }),
    ]);

    return { success: true, message: 'Template updated' };
  }
}
