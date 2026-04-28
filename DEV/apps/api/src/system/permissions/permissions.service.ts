import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Permission resolver for the screen/tab permission model.
 *
 * Phase 1 scope: resolver logic + in-memory per-user cache. No controller,
 * no guard wiring yet — those arrive in Phase 2.
 *
 * Resolution rules (mirror docs/architecture/permission-model.md):
 *   1. SUPER_ADMIN role name → always ALLOW (bypass).
 *   2. Deleted / disabled screen or tab → DENY.
 *   3. Collect rules for (user.roleIds × screenId × permissionCode). Prefer
 *      tab-level rules when any exist; otherwise fall back to screen-level.
 *   4. Deny-override: any applicable isAllowed=false → DENY.
 *   5. Any applicable isAllowed=true → ALLOW.
 *   6. Otherwise (no applicable rule) → DENY (default-deny).
 */
@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  /** Role NAME (not id) reserved as bypass. Seeded in prisma/seed.ts. */
  public static readonly SUPER_ADMIN_ROLE_NAME = 'SUPER_ADMIN';

  private static readonly CACHE_TTL_MS = 60_000;
  private readonly cache = new Map<string, { expiresAt: number; payload: UserPermissionPayload }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the full resolved permission payload for a user.
   * Cached per-user for 60 seconds.
   */
  async getForUser(userId: string): Promise<UserPermissionPayload> {
    const cached = this.cache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.payload;

    const payload = await this.compute(userId);
    this.cache.set(userId, { payload, expiresAt: now + PermissionsService.CACHE_TTL_MS });
    return payload;
  }

  /**
   * Invalidate cache entries. Pass no args to clear the entire cache,
   * or specific userIds to target-invalidate (used by matrix mutations in
   * Phase 4).
   */
  invalidate(userIds?: string[]): void {
    if (!userIds || userIds.length === 0) {
      this.cache.clear();
      return;
    }
    for (const id of userIds) this.cache.delete(id);
  }

  /**
   * Evaluate a single permission check for a pre-loaded payload. Intended
   * for use by `ScreenPermissionGuard` in Phase 2 after it has loaded the
   * user's payload once per request.
   */
  static check(
    payload: UserPermissionPayload,
    screenCode: string,
    tabCode: string | null,
    action: string,
  ): PermissionDecision {
    if (payload.isSuperAdmin) return 'ALLOW';

    const entries = payload.permissions.filter((p) => p.screen === screenCode);
    if (entries.length === 0) return 'DENY';

    const tabEntry = tabCode ? entries.find((e) => e.tab === tabCode) : null;
    const screenEntry = entries.find((e) => e.tab === null);
    const applicable = tabEntry ?? screenEntry ?? null;
    if (!applicable) return 'DENY';

    if (applicable.denied.includes(action)) return 'DENY';
    if (applicable.actions.includes(action)) return 'ALLOW';
    return 'DENY';
  }

  // ─── internals ────────────────────────────────────────────────────────────

  private async compute(userId: string): Promise<UserPermissionPayload> {
    // Load staff → roles
    const staff = await this.prisma.staff.findFirst({
      where: { id: userId, isDeleted: false },
      include: {
        staffRoles: {
          where: { isDeleted: false },
          include: { role: true },
        },
      },
    });

    if (!staff) {
      return {
        userId,
        roles: [],
        isSuperAdmin: false,
        permissions: [],
        generatedAt: new Date().toISOString(),
        ttlSeconds: PermissionsService.CACHE_TTL_MS / 1000,
      };
    }

    const roles = staff.staffRoles.map((sr) => sr.role).filter((r) => !r.isDeleted);
    const roleNames = roles.map((r) => r.name);
    const isSuperAdmin = roleNames.includes(PermissionsService.SUPER_ADMIN_ROLE_NAME);

    if (isSuperAdmin) {
      // Bypass — no rules needed; FE short-circuits.
      return {
        userId,
        roles: roleNames,
        isSuperAdmin: true,
        permissions: [],
        generatedAt: new Date().toISOString(),
        ttlSeconds: PermissionsService.CACHE_TTL_MS / 1000,
      };
    }

    const roleIds = roles.map((r) => r.id);
    if (roleIds.length === 0) {
      return {
        userId,
        roles: roleNames,
        isSuperAdmin: false,
        permissions: [],
        generatedAt: new Date().toISOString(),
        ttlSeconds: PermissionsService.CACHE_TTL_MS / 1000,
      };
    }

    // Fetch all non-deleted, non-disabled rules for the user's roles,
    // joined with screen + tab so we can filter out disabled screens/tabs.
    const rules = await this.prisma.rolePermission.findMany({
      where: {
        isDeleted: false,
        isDisabled: false,
        roleId: { in: roleIds },
        screen: { isDeleted: false, isDisabled: false },
        OR: [
          { tabId: null },
          { tab: { isDeleted: false, isDisabled: false } },
        ],
      },
      include: {
        screen: { select: { code: true } },
        tab: { select: { code: true } },
      },
    });

    // Group by (screen, tab) and apply resolution rules per action.
    type Bucket = { screen: string; tab: string | null; allow: Set<string>; deny: Set<string> };
    const buckets = new Map<string, Bucket>();
    const keyFor = (screen: string, tab: string | null) => `${screen}::${tab ?? ''}`;

    for (const r of rules) {
      const k = keyFor(r.screen.code, r.tab?.code ?? null);
      let bucket = buckets.get(k);
      if (!bucket) {
        bucket = { screen: r.screen.code, tab: r.tab?.code ?? null, allow: new Set(), deny: new Set() };
        buckets.set(k, bucket);
      }
      if (r.isAllowed) bucket.allow.add(r.permissionCode);
      else bucket.deny.add(r.permissionCode);
    }

    const permissions: UserPermissionPayload['permissions'] = [];
    for (const bucket of buckets.values()) {
      // Effective per-action set: allowed AND not explicitly denied.
      const effective: string[] = [];
      for (const code of bucket.allow) {
        if (!bucket.deny.has(code)) effective.push(code);
      }
      permissions.push({
        screen: bucket.screen,
        tab: bucket.tab,
        actions: effective,
        denied: Array.from(bucket.deny),
      });
    }

    return {
      userId,
      roles: roleNames,
      isSuperAdmin: false,
      permissions,
      generatedAt: new Date().toISOString(),
      ttlSeconds: PermissionsService.CACHE_TTL_MS / 1000,
    };
  }
}

export type PermissionDecision = 'ALLOW' | 'DENY';

export interface UserPermissionEntry {
  screen: string;
  tab: string | null;
  /** Actions where at least one rule ALLOWS and no rule DENIES. */
  actions: string[];
  /** Actions with at least one explicit DENY — surfaced for admin debugging. */
  denied: string[];
}

export interface UserPermissionPayload {
  userId: string;
  roles: string[];
  isSuperAdmin: boolean;
  permissions: UserPermissionEntry[];
  generatedAt: string;
  ttlSeconds: number;
}
