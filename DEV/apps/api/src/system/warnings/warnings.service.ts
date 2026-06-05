import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemVibeIconsService } from '../vibe-icons/vibe-icons.service';

export interface IEmployeePhotoUrlIssue {
  staffId: string;
  fullName: string;
  photoUrl: string;
  httpStatus?: number;
  error?: string;
}

export interface IEmployeePhotoUrlScanResult {
  scannedAt: string;
  totalChecked: number;
  brokenCount: number;
  broken: IEmployeePhotoUrlIssue[];
}

export interface ISystemWarning {
  code: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  count: number;
  actionUrl?: string;
}

export interface ISessionBlockedUser {
  userId: string;
  staffId: string | null;
  username: string;
  email: string;
  fullName: string;
  allSessionsRevokedAt: string;
}

@Injectable()
export class SystemWarningsService {
  private readonly URL_SCAN_TIMEOUT_MS = 5000;
  private readonly URL_SCAN_CONCURRENCY = 6;

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemVibeIconsService: SystemVibeIconsService,
  ) {}

  async checkAll(): Promise<ISystemWarning[]> {
    const results = await Promise.all([
      this.checkMissingTimezone(),
      this.checkBrokenVibeIconUrls(),
      this.checkSessionBlockedUsers(),
    ]);
    return results.flat();
  }

  async checkByCategory(category: string): Promise<ISystemWarning[]> {
    switch (category) {
      case 'employees':
        return [
          ...(await this.checkMissingTimezone()),
          ...(await this.checkBrokenEmployeePhotoUrls()),
        ];
      case 'vibe-icons':
        return this.checkBrokenVibeIconUrls();
      default:
        return this.checkAll();
    }
  }

  private async checkMissingTimezone(): Promise<ISystemWarning[]> {
    // Staff has shift hours defined but no timezone — auto-logout and lateness checks will be wrong
    const count = await this.prisma.staff.count({
      where: {
        isDeleted: false,
        timezone: null,
        OR: [
          { shiftStartTime: { not: null } },
          { shiftEndTime: { not: null } },
          { latestEndShiftTime: { not: null } },
        ],
      },
    });

    if (count === 0) return [];

    return [
      {
        code: 'STAFF_MISSING_TIMEZONE',
        category: 'employees',
        severity: 'warning',
        message: `${count} employee${count !== 1 ? 's have' : ' has'} shift hours defined but no timezone set. Auto-logout and late-arrival checks will be inaccurate.`,
        count,
        actionUrl: '/employees?timezone=__none__',
      },
    ];
  }

  private async checkBrokenVibeIconUrls(): Promise<ISystemWarning[]> {
    const result = await this.systemVibeIconsService.scanIconUrls({
      onlyActiveSet: true,
      includeDisabled: false,
    });

    if (result.brokenCount === 0) return [];

    return [
      {
        code: 'BROKEN_VIBE_ICON_URLS',
        category: 'vibe-icons',
        severity: 'warning',
        message: `${result.brokenCount} icon URL${result.brokenCount !== 1 ? 's are' : ' is'} unreachable in the active VIBE icon set. Employees may see broken images.`,
        count: result.brokenCount,
        actionUrl: '/system/vibe-icons',
      },
    ];
  }

  async getSessionBlockedUsers(): Promise<ISessionBlockedUser[]> {
    const now = new Date();
    const rows = await this.prisma.userLogin.findMany({
      where: { isDeleted: false, allSessionsRevokedAt: { gt: now } },
      select: {
        id: true,
        username: true,
        email: true,
        allSessionsRevokedAt: true,
        staff: { select: { id: true, firstName: true, middleName: true, surname: true } },
      },
      orderBy: { allSessionsRevokedAt: 'asc' },
    });

    return rows.map((row) => ({
      userId: row.id,
      staffId: row.staff?.id ?? null,
      username: row.username,
      email: row.email,
      fullName: [row.staff?.surname, row.staff?.middleName, row.staff?.firstName]
        .filter(Boolean)
        .join(' ') || row.username,
      allSessionsRevokedAt: row.allSessionsRevokedAt!.toISOString(),
    }));
  }

  private async checkSessionBlockedUsers(): Promise<ISystemWarning[]> {
    const now = new Date();
    const count = await this.prisma.userLogin.count({
      where: { isDeleted: false, allSessionsRevokedAt: { gt: now } },
    });
    if (count === 0) return [];
    return [
      {
        code: 'SESSION_BLOCKED_USERS',
        category: 'auth',
        severity: 'error',
        message: `${count} user${count !== 1 ? 's are' : ' is'} session-blocked and cannot log in. Clear their session block to restore access.`,
        count,
        actionUrl: '/system/warnings?tab=sessions',
      },
    ];
  }

  async scanEmployeePhotoUrls(): Promise<IEmployeePhotoUrlScanResult> {
    const staffs = await this.prisma.staff.findMany({
      where: {
        isDeleted: false,
        photoBusiness: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
      },
      orderBy: [{ firstName: 'asc' }, { surname: 'asc' }],
    });

    const candidates = staffs
      .map((s) => ({
        staffId: s.id,
        fullName: `${s.surname ?? ''} ${s.firstName ?? ''}`.trim() || 'Unknown',
        photoUrl: s.photoBusiness?.trim() ?? '',
      }))
      .filter((s) => !!s.photoUrl);

    const checks = await this.mapWithConcurrency(candidates, this.URL_SCAN_CONCURRENCY, async (item) => {
      const check = await this.checkSingleUrl(item.photoUrl);
      return { ...item, ...check };
    });

    const broken = checks
      .filter((item) => !item.ok)
      .map<IEmployeePhotoUrlIssue>((item) => ({
        staffId: item.staffId,
        fullName: item.fullName,
        photoUrl: item.photoUrl,
        httpStatus: item.httpStatus,
        error: item.error,
      }));

    return {
      scannedAt: new Date().toISOString(),
      totalChecked: candidates.length,
      brokenCount: broken.length,
      broken,
    };
  }

  private async checkBrokenEmployeePhotoUrls(): Promise<ISystemWarning[]> {
    const result = await this.scanEmployeePhotoUrls();

    if (result.brokenCount === 0) return [];

    return [
      {
        code: 'BROKEN_EMPLOYEE_PHOTOS',
        category: 'employees',
        severity: 'warning',
        message: `${result.brokenCount} employee profile photo URL${result.brokenCount !== 1 ? 's are' : ' is'} unreachable. Users may see broken avatars.`,
        count: result.brokenCount,
        actionUrl: '/employees',
      },
    ];
  }

  private async checkSingleUrl(url: string): Promise<{ ok: boolean; httpStatus?: number; error?: string }> {
    if (url.startsWith('data:')) {
      return { ok: true, httpStatus: 200 };
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, error: 'Invalid URL format' };
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, error: `Unsupported protocol: ${parsed.protocol}` };
    }

    const headResult = await this.fetchStatus(parsed.toString(), 'HEAD');
    if (headResult.networkError) {
      return { ok: false, error: headResult.networkError };
    }

    if (headResult.status === 405) {
      const getResult = await this.fetchStatus(parsed.toString(), 'GET');
      if (getResult.networkError) {
        return { ok: false, error: getResult.networkError };
      }
      return {
        ok: !!getResult.status && getResult.status >= 200 && getResult.status < 400,
        httpStatus: getResult.status,
        error: !getResult.status || getResult.status < 200 || getResult.status >= 400
          ? `HTTP ${getResult.status}`
          : undefined,
      };
    }

    return {
      ok: !!headResult.status && headResult.status >= 200 && headResult.status < 400,
      httpStatus: headResult.status,
      error: !headResult.status || headResult.status < 200 || headResult.status >= 400
        ? `HTTP ${headResult.status}`
        : undefined,
    };
  }

  private async fetchStatus(url: string, method: 'HEAD' | 'GET'): Promise<{ status?: number; networkError?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.URL_SCAN_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
      });
      return { status: response.status };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { networkError: message };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<R>,
  ): Promise<R[]> {
    if (items.length === 0) return [];
    const results = new Array<R>(items.length);
    let index = 0;

    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (true) {
        const currentIndex = index;
        index += 1;
        if (currentIndex >= items.length) break;
        results[currentIndex] = await worker(items[currentIndex]);
      }
    });

    await Promise.all(runners);
    return results;
  }
}
