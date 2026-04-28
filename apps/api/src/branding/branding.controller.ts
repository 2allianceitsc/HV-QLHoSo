import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/** Keys exposed to the public (no auth). Add only non-sensitive flags here. */
const PUBLIC_CONFIG_KEYS = ['login.show_test_accounts', 'BRANDING_VERSION', 'logout_config', 'display.show_header_clock'] as const;

/**
 * Versioned URL (?v=...) → immutable long-lived cache (CDN-friendly).
 * Unversioned URL → no-cache so browsers always revalidate after a logo change.
 */
function brandingCacheHeader(req: Request): string {
  return req.query['v'] ? 'public, max-age=31536000, immutable' : 'no-cache';
}

@ApiTags('public/branding')
@Controller('public/branding')
export class BrandingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get public client-side config flags (no auth required)' })
  async getPublicConfig() {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: [...PUBLIC_CONFIG_KEYS] } },
      select: { key: true, value: true },
    });
    const defaults: Record<string, string> = {
      'login.show_test_accounts': 'false',
      'logout_config': JSON.stringify({ MoodLogRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] }),
      'display.show_header_clock': 'true',
    };
    const result = { ...defaults };
    for (const row of rows) result[row.key] = row.value;
    return result;
  }

  @Get('logo')
  @ApiOperation({ summary: 'Get dynamic base64 App Logo' })
  async getLogo(@Req() req: Request, @Res() res: Response) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'APP_LOGO_BASE64' },
    });

    if (!setting || !setting.value) {
      return res.redirect('/logo.png'); // Fallback to static
    }

    const match = setting.value.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return res.redirect('/logo.png');
    }

    const ext = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', `image/${ext}`);
    res.setHeader('Cache-Control', brandingCacheHeader(req));
    return res.end(buffer);
  }

  @Get('esc-logo')
  @ApiOperation({ summary: 'Get company logo for login screen (resolves via LOGIN_COMPANY_ID or ESC_LOGO_BASE64)' })
  async getEscLogo(@Req() req: Request, @Res() res: Response) {
    const cacheHeader = brandingCacheHeader(req);

    // 1. Try to resolve via LOGIN_COMPANY_ID → Company.logoUrl
    const companyIdSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'LOGIN_COMPANY_ID' },
    });

    if (companyIdSetting?.value) {
      const company = await this.prisma.company.findFirst({
        where: { id: companyIdSetting.value, isDeleted: false },
        select: { logoUrl: true },
      });
      if (company?.logoUrl) {
        res.setHeader('Cache-Control', cacheHeader);
        return res.redirect(company.logoUrl);
      }
    }

    // 2. Fall back to ESC_LOGO_BASE64
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'ESC_LOGO_BASE64' },
    });

    if (!setting?.value) {
      res.status(404).end();
      return;
    }

    const match = setting.value.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      res.status(404).end();
      return;
    }

    const ext = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', `image/${ext}`);
    res.setHeader('Cache-Control', cacheHeader);
    return res.end(buffer);
  }

  @Get('favicon')
  @ApiOperation({ summary: 'Get dynamic base64 App Favicon' })
  async getFavicon(@Req() req: Request, @Res() res: Response) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'APP_FAVICON_BASE64' },
    });

    if (!setting || !setting.value) {
      return res.redirect('/logo.png'); // Fallback to static
    }

    const match = setting.value.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return res.redirect('/logo.png');
    }

    const ext = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', `image/${ext}`);
    res.setHeader('Cache-Control', brandingCacheHeader(req));
    return res.end(buffer);
  }
}
