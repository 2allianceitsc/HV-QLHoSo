import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsService } from './permissions.service';
import { AuditService } from '../audit/audit.service';
import { uuidv7 } from 'uuidv7';
import { DEFAULT_MATRIX } from './default-matrix.constants';

export interface IMatrixChange {
  /** Either roleId (UUID) or roleName (e.g. "HR_ADMIN") — roleId takes precedence. */
  roleId?: string;
  roleName?: string;
  screenCode: string;
  /** null or omitted = whole-screen rule */
  tabCode?: string | null;
  permissionCode: string;
  /**
   * - true / false → upsert with that isAllowed
   * - clear: true → soft-delete the row (revert to inherited / default-deny)
   */
  isAllowed?: boolean;
  clear?: boolean;
}

export interface IMatrixChangeResult {
  applied: number;
  cleared: number;
  skipped: number;
  affectedRoleIds: string[];
  affectedUserCount: number;
}

@Injectable()
export class PermissionsAdminService {
  private readonly logger = new Logger(PermissionsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  // ─── Catalog reads ──────────────────────────────────────────────────────────

  async getCatalog() {
    const [screens, actions] = await Promise.all([
      this.prisma.screen.findMany({
        where: { isDeleted: false },
        orderBy: [{ area: 'asc' }, { orderNo: 'asc' }],
        include: {
          tabs: {
            where: { isDeleted: false },
            orderBy: { orderNo: 'asc' },
          },
        },
      }),
      this.prisma.permission.findMany({
        where: { isDisabled: false },
        orderBy: { orderNo: 'asc' },
      }),
    ]);

    return {
      screens: screens.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        route: s.route,
        area: s.area,
        isDisabled: s.isDisabled,
        tabs: s.tabs.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          orderNo: t.orderNo,
          isDisabled: t.isDisabled,
        })),
      })),
      actions: actions.map((a) => ({
        code: a.code,
        name: a.name,
      })),
    };
  }

  async listRoles() {
    return this.prisma.role.findMany({
      where: { isDeleted: false },
      orderBy: { orderNo: 'asc' },
      select: { id: true, name: true, displayName: true, colorHex: true },
    });
  }

  async listRulesForRole(roleId: string) {
    await this.requireRole(roleId);
    const rules = await this.prisma.rolePermission.findMany({
      where: { roleId, isDeleted: false },
      include: {
        screen: { select: { code: true } },
        tab: { select: { code: true } },
      },
    });
    return rules.map((r) => ({
      id: r.id,
      roleId: r.roleId,
      screenCode: r.screen.code,
      tabCode: r.tab?.code ?? null,
      permissionCode: r.permissionCode,
      isAllowed: r.isAllowed,
      logUpdatedAt: r.logUpdatedAt,
      logUpdatedBy: r.logUpdatedBy,
    }));
  }

  // ─── Matrix mutations ───────────────────────────────────────────────────────

  async applyMatrixChanges(
    changes: IMatrixChange[],
    actor: { id: string; name?: string },
  ): Promise<IMatrixChangeResult> {
    if (!changes || changes.length === 0) {
      return { applied: 0, cleared: 0, skipped: 0, affectedRoleIds: [], affectedUserCount: 0 };
    }

    // Resolve all refs up front — fail fast on bad codes.
    const resolvedChanges = await this.resolveChanges(changes);
    const affectedRoleIds = [...new Set(resolvedChanges.map((c) => c.roleId))];

    const result = await this.prisma.$transaction(async (tx) => {
      let applied = 0;
      let cleared = 0;
      let skipped = 0;

      for (const c of resolvedChanges) {
        // SUPER_ADMIN and self-referential screens are immutable.
        const role = await tx.role.findUnique({ where: { id: c.roleId } });
        if (!role) throw new NotFoundException(`Role ${c.roleId} not found`);
        if (role.name === 'SUPER_ADMIN') {
          throw new BadRequestException(
            'SUPER_ADMIN bypasses the matrix and its rules cannot be edited.',
          );
        }
        if (c.screenCode === 'SY18' || c.screenCode === 'SY01') {
          throw new BadRequestException(
            `Permissions for ${c.screenCode} are reserved for SUPER_ADMIN to prevent lock-out.`,
          );
        }

        const existing = await tx.rolePermission.findFirst({
          where: {
            roleId: c.roleId,
            screenId: c.screenId,
            tabId: c.tabId ?? null,
            permissionCode: c.permissionCode,
            isDeleted: false,
          },
        });

        if (c.clear) {
          if (!existing) {
            skipped++;
            continue;
          }
          await tx.rolePermission.update({
            where: { id: existing.id },
            data: {
              isDeleted: true,
              logUpdatedBy: actor.id,
            },
          });
          cleared++;
          await this.audit.log(
            'PERMISSION_REVOKED',
            'RolePermission',
            existing.id,
            actor.id,
            actor.name,
            {
              roleName: role.name,
              screenCode: c.screenCode,
              tabCode: c.tabCode ?? null,
              permissionCode: c.permissionCode,
              previousIsAllowed: existing.isAllowed,
            },
          );
          continue;
        }

        if (c.isAllowed === undefined) {
          // No isAllowed and no clear — meaningless row; skip.
          skipped++;
          continue;
        }

        if (existing) {
          if (existing.isAllowed === c.isAllowed) {
            skipped++;
            continue;
          }
          await tx.rolePermission.update({
            where: { id: existing.id },
            data: {
              isAllowed: c.isAllowed,
              logUpdatedBy: actor.id,
            },
          });
          applied++;
          await this.audit.log(
            'PERMISSION_UPDATED',
            'RolePermission',
            existing.id,
            actor.id,
            actor.name,
            {
              roleName: role.name,
              screenCode: c.screenCode,
              tabCode: c.tabCode ?? null,
              permissionCode: c.permissionCode,
              from: existing.isAllowed,
              to: c.isAllowed,
            },
          );
        } else {
          const created = await tx.rolePermission.create({
            data: {
              id: uuidv7(),
              roleId: c.roleId,
              screenId: c.screenId,
              tabId: c.tabId ?? null,
              permissionCode: c.permissionCode,
              isAllowed: c.isAllowed,
              logCreatedBy: actor.id,
              logUpdatedBy: actor.id,
            },
          });
          applied++;
          await this.audit.log(
            c.isAllowed ? 'PERMISSION_GRANTED' : 'PERMISSION_DENIED_SET',
            'RolePermission',
            created.id,
            actor.id,
            actor.name,
            {
              roleName: role.name,
              screenCode: c.screenCode,
              tabCode: c.tabCode ?? null,
              permissionCode: c.permissionCode,
              isAllowed: c.isAllowed,
            },
          );
        }
      }

      return { applied, cleared, skipped };
    });

    // Invalidate cache for every user whose role was changed.
    const affectedUserCount = await this.invalidateUsersOfRoles(affectedRoleIds);

    return { ...result, affectedRoleIds, affectedUserCount };
  }

  async resetRoleToDefaults(roleId: string, actor: { id: string; name?: string }) {
    const role = await this.requireRole(roleId);
    if (role.name === 'SUPER_ADMIN') {
      throw new BadRequestException(
        'SUPER_ADMIN bypasses the matrix; no defaults to reset.',
      );
    }

    const defaultRows = DEFAULT_MATRIX.filter((r) => r.roleName === role.name);

    // Pre-load screen + tab lookups needed for re-seeding.
    const screenCodes = [...new Set(defaultRows.map((r) => r.screenCode))];
    const screens = new Map(
      (
        await this.prisma.screen.findMany({
          where: { code: { in: screenCodes }, isDeleted: false },
        })
      ).map((s) => [s.code, s]),
    );
    const tabs = await this.prisma.screenTab.findMany({
      where: { isDeleted: false },
      include: { screen: { select: { code: true } } },
    });
    const tabByKey = new Map(tabs.map((t) => [`${t.screen.code}::${t.code}`, t]));

    await this.prisma.$transaction(async (tx) => {
      // 1. Soft-delete all existing rules for the role.
      await tx.rolePermission.updateMany({
        where: { roleId, isDeleted: false },
        data: { isDeleted: true, logUpdatedBy: actor.id },
      });

      // 2. Re-insert defaults (always fresh rows — the old ones are soft-deleted).
      for (const row of defaultRows) {
        const screen = screens.get(row.screenCode);
        if (!screen) continue;
        const tab = row.tabCode ? tabByKey.get(`${row.screenCode}::${row.tabCode}`) : null;
        if (row.tabCode && !tab) continue;

        await tx.rolePermission.create({
          data: {
            id: uuidv7(),
            roleId,
            screenId: screen.id,
            tabId: tab?.id ?? null,
            permissionCode: row.permissionCode,
            isAllowed: true,
            note: `reset:${actor.id}`,
            logCreatedBy: actor.id,
            logUpdatedBy: actor.id,
          },
        });
      }
    });

    await this.audit.log(
      'PERMISSION_ROLE_RESET',
      'Role',
      roleId,
      actor.id,
      actor.name,
      { roleName: role.name, defaultsRestored: defaultRows.length },
    );

    await this.invalidateUsersOfRoles([roleId]);
    return {
      message: `Permissions for ${role.displayName ?? role.name} reset to defaults (${defaultRows.length} rules restored).`,
    };
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  private async resolveChanges(changes: IMatrixChange[]) {
    const roleCodes = [...new Set(changes.flatMap((c) => (c.roleName ? [c.roleName] : [])))];
    const rolesByName = roleCodes.length
      ? new Map(
          (
            await this.prisma.role.findMany({
              where: { name: { in: roleCodes }, isDeleted: false },
            })
          ).map((r) => [r.name, r]),
        )
      : new Map<string, { id: string; name: string }>();

    const screenCodes = [...new Set(changes.map((c) => c.screenCode))];
    const screens = new Map(
      (
        await this.prisma.screen.findMany({
          where: { code: { in: screenCodes }, isDeleted: false },
        })
      ).map((s) => [s.code, s]),
    );

    const tabPairs = changes.filter((c) => c.tabCode).map((c) => `${c.screenCode}::${c.tabCode}`);
    const tabByKey = new Map<string, { id: string; code: string; screenId: string }>();
    if (tabPairs.length) {
      const tabs = await this.prisma.screenTab.findMany({
        where: { isDeleted: false },
        include: { screen: { select: { code: true } } },
      });
      for (const t of tabs) {
        tabByKey.set(`${t.screen.code}::${t.code}`, {
          id: t.id,
          code: t.code,
          screenId: t.screenId,
        });
      }
    }

    const resolved: Array<{
      roleId: string;
      screenId: string;
      screenCode: string;
      tabId: string | null;
      tabCode: string | null;
      permissionCode: string;
      isAllowed?: boolean;
      clear?: boolean;
    }> = [];

    for (const c of changes) {
      const roleId = c.roleId ?? (c.roleName ? rolesByName.get(c.roleName)?.id : undefined);
      if (!roleId) {
        throw new NotFoundException(`Role not found: ${c.roleId ?? c.roleName ?? '?'}`);
      }
      const screen = screens.get(c.screenCode);
      if (!screen) throw new NotFoundException(`Screen not found: ${c.screenCode}`);

      let tabId: string | null = null;
      if (c.tabCode) {
        const tab = tabByKey.get(`${c.screenCode}::${c.tabCode}`);
        if (!tab) {
          throw new NotFoundException(
            `Tab ${c.screenCode}/${c.tabCode} not found`,
          );
        }
        tabId = tab.id;
      }

      resolved.push({
        roleId,
        screenId: screen.id,
        screenCode: c.screenCode,
        tabId,
        tabCode: c.tabCode ?? null,
        permissionCode: c.permissionCode,
        isAllowed: c.isAllowed,
        clear: c.clear,
      });
    }

    return resolved;
  }

  private async requireRole(roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, isDeleted: false },
    });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    return role;
  }

  private async invalidateUsersOfRoles(roleIds: string[]): Promise<number> {
    if (roleIds.length === 0) return 0;
    const affected = await this.prisma.staffRole.findMany({
      where: { roleId: { in: roleIds }, isDeleted: false },
      select: { staffId: true },
      distinct: ['staffId'],
    });
    const staffIds = affected.map((a) => a.staffId);
    this.permissions.invalidate(staffIds);
    return staffIds.length;
  }
}
