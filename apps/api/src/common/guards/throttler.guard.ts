import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage, ThrottlerRequest } from '@nestjs/throttler';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SettingsService } from '../../system/settings/settings.service';

const CACHE_TTL_MS = 30_000; // re-read settings every 30 s

interface CachedSetting<T> {
  value: T;
  expiresAt: number;
}

/**
 * Custom ThrottlerGuard with two improvements over the default:
 *
 * 1. IP whitelist — skips throttling for whitelisted IPs.
 *    Read from DB setting "throttle_ip_whitelist", cached in memory for 30 s.
 *
 * 2. Dynamic limits — reads "throttle_default_limit" and "throttle_default_ttl"
 *    from DB settings (also cached 30 s), so admins can raise them in the UI
 *    without a server restart.  Falls back to the values from ThrottlerModule.forRoot()
 *    if the DB is unreachable.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private whitelistCache: CachedSetting<Set<string>> | null = null;
  private limitCache: CachedSetting<number> | null = null;
  private ttlCache: CachedSetting<number> | null = null;

  constructor(
    @Inject(THROTTLER_OPTIONS) options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly settings: SettingsService,
  ) {
    super(options, storageService, reflector);
  }

  // ── IP whitelist ────────────────────────────────────────────────────────────

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const now = Date.now();
    if (!this.whitelistCache || this.whitelistCache.expiresAt <= now) {
      let raw: string;
      try {
        const setting = await this.settings.findOne('throttle_ip_whitelist');
        raw = setting.value;
      } catch {
        raw = process.env.THROTTLE_IP_WHITELIST ?? '127.0.0.1,::1,::ffff:127.0.0.1';
      }
      this.whitelistCache = {
        value: new Set(raw.split(',').map((ip) => ip.trim()).filter(Boolean)),
        expiresAt: now + CACHE_TTL_MS,
      };
    }

    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip ?? req.socket?.remoteAddress ?? '';
    return this.whitelistCache.value.has(ip);
  }

  // ── Dynamic limit / ttl ─────────────────────────────────────────────────────

  private async getDynamicLimit(): Promise<number | null> {
    const now = Date.now();
    if (!this.limitCache || this.limitCache.expiresAt <= now) {
      try {
        const s = await this.settings.findOne('throttle_default_limit');
        const parsed = parseInt(s.value, 10);
        this.limitCache = {
          value: isNaN(parsed) ? 300 : parsed,
          expiresAt: now + CACHE_TTL_MS,
        };
      } catch {
        return null; // fall back to module config
      }
    }
    return this.limitCache.value;
  }

  private async getDynamicTtl(): Promise<number | null> {
    const now = Date.now();
    if (!this.ttlCache || this.ttlCache.expiresAt <= now) {
      try {
        const s = await this.settings.findOne('throttle_default_ttl');
        const parsed = parseInt(s.value, 10);
        this.ttlCache = {
          value: isNaN(parsed) ? 60000 : parsed,
          expiresAt: now + CACHE_TTL_MS,
        };
      } catch {
        return null;
      }
    }
    return this.ttlCache.value;
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const [dynamicLimit, dynamicTtl] = await Promise.all([
      this.getDynamicLimit(),
      this.getDynamicTtl(),
    ]);

    // Patch the throttler config with DB values when available
    if (dynamicLimit !== null || dynamicTtl !== null) {
      const patchedProps: ThrottlerRequest = {
        ...requestProps,
        throttler: {
          ...requestProps.throttler,
          ...(dynamicLimit !== null && { limit: dynamicLimit }),
          ...(dynamicTtl !== null && { ttl: dynamicTtl }),
        },
      };
      return super.handleRequest(patchedProps);
    }

    return super.handleRequest(requestProps);
  }
}
