import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IIntegrityCheckSummary {
  checkId: string;
  checkName: string;
  category: string;
  severity: string;
  description: string | null;
  violationCount: number;
}

const VALID_CHECK_ID = /^[a-z0-9_]+$/;

// ── Application-level checks ───────────────────────────────────────────────────
// Use this for:
//   (a) checks that need logic not easily expressed in a PG function
//   (b) checks whose DB function is broken and needs fixing in code
// Each check is isolated — one failure never blocks the others.

interface IAppCheck {
  checkId: string;
  checkName: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  runCount: (prisma: PrismaService) => Promise<number>;
  runDetail: (prisma: PrismaService, limit: number) => Promise<Record<string, unknown>[]>;
}

const APP_CHECKS: IAppCheck[] = [
  // ── Auth ────────────────────────────────────────────────────────────────────
  {
    checkId: 'auth_login_conflict',
    checkName: 'Login email/username cross-match',
    category: 'Auth',
    severity: 'error',
    description:
      'Pairs of active UserLogin rows where A.email = B.username (case-insensitive) or vice versa. ' +
      'Causes findFirst to pick the wrong account — login hits the wrong row, password resets go to one row but login checks another.',
    async runCount(prisma) {
      const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT LEAST(a.id, b.id) || '|' || GREATEST(a.id, b.id))::bigint AS cnt
        FROM "UserLogin" a
        JOIN "UserLogin" b
          ON a.id <> b.id
          AND a."IsDeleted" = false
          AND b."IsDeleted" = false
          AND (
            lower(a."Email") = lower(b."Username")
            OR lower(a."Username") = lower(b."Email")
          )
      `;
      return Number(rows[0]?.cnt ?? 0);
    },
    async runDetail(prisma, limit) {
      const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT DISTINCT ON (LEAST(a.id, b.id), GREATEST(a.id, b.id))
          a.id                                                          AS a_id,
          a."Username"                                                  AS a_username,
          a."Email"                                                     AS a_email,
          COALESCE(sa."FirstName" || ' ' || sa."Surname", '—')         AS a_staff,
          COALESCE(sa."EmployeeId", '—')                               AS a_employee_id,
          COALESCE(a."LastLogin"::text, 'never')                       AS a_last_login,
          CASE
            WHEN lower(a."Email") = lower(b."Username") THEN a."Email"
            ELSE a."Username"
          END                                                            AS overlap_value,
          CASE
            WHEN lower(a."Email") = lower(b."Username") THEN 'A.email = B.username'
            ELSE 'A.username = B.email'
          END                                                            AS overlap_type,
          b.id                                                          AS b_id,
          b."Username"                                                  AS b_username,
          b."Email"                                                     AS b_email,
          COALESCE(sb."FirstName" || ' ' || sb."Surname", '—')         AS b_staff,
          COALESCE(sb."EmployeeId", '—')                               AS b_employee_id,
          COALESCE(b."LastLogin"::text, 'never')                       AS b_last_login
        FROM "UserLogin" a
        JOIN "UserLogin" b
          ON a.id < b.id
          AND a."IsDeleted" = false
          AND b."IsDeleted" = false
          AND (
            lower(a."Email") = lower(b."Username")
            OR lower(a."Username") = lower(b."Email")
          )
        LEFT JOIN "Staff" sa ON sa."UserLoginId" = a.id AND sa."IsDeleted" = false
        LEFT JOIN "Staff" sb ON sb."UserLoginId" = b.id AND sb."IsDeleted" = false
        LIMIT ${limit}
      `;
      return rows;
    },
  },

  // ── All entity tables: ID order must match Log_CreatedAt order ───────────────
  {
    checkId: 'entity_id_createdat_order',
    checkName: 'Entity ID vs Log_CreatedAt ordering',
    category: 'DataIntegrity',
    severity: 'warning',
    description:
      'For every standard entity table, a row with a higher UUID v7 ID must have an equal or later Log_CreatedAt. ' +
      'A violation indicates a record was inserted out-of-order (bulk import, data migration, or clock skew).',
    async runCount(prisma) {
      const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
        WITH ordered AS (
          SELECT 'BusinessClient'::text AS tbl, id, "Log_CreatedAt" AS ts,
            LAG("Log_CreatedAt") OVER (ORDER BY id) AS prev_ts FROM "BusinessClient"
          UNION ALL SELECT 'ClientContacts', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientContacts"
          UNION ALL SELECT 'ClientDepartment', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientDepartment"
          UNION ALL SELECT 'ClientProject', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientProject"
          UNION ALL SELECT 'ClientProjectStaff', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientProjectStaff"
          UNION ALL SELECT 'ClientStaff', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientStaff"
          UNION ALL SELECT 'Company', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Company"
          UNION ALL SELECT 'CompanyContacts', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "CompanyContacts"
          UNION ALL SELECT 'Department', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Department"
          UNION ALL SELECT 'DropdownDisplayConfig', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "DropdownDisplayConfig"
          UNION ALL SELECT 'EmailQueue', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "EmailQueue"
          UNION ALL SELECT 'MaritalStatusConfig', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "MaritalStatusConfig"
          UNION ALL SELECT 'MoodLog', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "MoodLog"
          UNION ALL SELECT 'Notification', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Notification"
          UNION ALL SELECT 'Office', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Office"
          UNION ALL SELECT 'OtpRateLimit', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "OtpRateLimit"
          UNION ALL SELECT 'Position', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Position"
          UNION ALL SELECT 'Role', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Role"
          UNION ALL SELECT 'RolePermission', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "RolePermission"
          UNION ALL SELECT 'Screen', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Screen"
          UNION ALL SELECT 'ScreenTab', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ScreenTab"
          UNION ALL SELECT 'Staff', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Staff"
          UNION ALL SELECT 'StaffAuthenticator', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "StaffAuthenticator"
          UNION ALL SELECT 'StaffRole', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "StaffRole"
          UNION ALL SELECT 'StatusDefinition', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "StatusDefinition"
          UNION ALL SELECT 'Team', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Team"
          UNION ALL SELECT 'TimeTracking', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "TimeTracking"
          UNION ALL SELECT 'UserLogin', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "UserLogin"
          UNION ALL SELECT 'VIBEIconSet', "VIBEIconSetID", "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY "VIBEIconSetID") FROM "VIBEIconSet"
          UNION ALL SELECT 'VIBEIcons', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "VIBEIcons"
        )
        SELECT COUNT(*)::bigint AS cnt FROM ordered
        WHERE prev_ts IS NOT NULL AND ts < prev_ts
      `;
      return Number(rows[0]?.cnt ?? 0);
    },
    async runDetail(prisma, limit) {
      const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
        WITH ordered AS (
          SELECT 'BusinessClient'::text AS tbl, id, "Log_CreatedAt" AS ts,
            LAG("Log_CreatedAt") OVER (ORDER BY id) AS prev_ts FROM "BusinessClient"
          UNION ALL SELECT 'ClientContacts', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientContacts"
          UNION ALL SELECT 'ClientDepartment', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientDepartment"
          UNION ALL SELECT 'ClientProject', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientProject"
          UNION ALL SELECT 'ClientProjectStaff', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientProjectStaff"
          UNION ALL SELECT 'ClientStaff', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ClientStaff"
          UNION ALL SELECT 'Company', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Company"
          UNION ALL SELECT 'CompanyContacts', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "CompanyContacts"
          UNION ALL SELECT 'Department', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Department"
          UNION ALL SELECT 'DropdownDisplayConfig', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "DropdownDisplayConfig"
          UNION ALL SELECT 'EmailQueue', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "EmailQueue"
          UNION ALL SELECT 'MaritalStatusConfig', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "MaritalStatusConfig"
          UNION ALL SELECT 'MoodLog', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "MoodLog"
          UNION ALL SELECT 'Notification', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Notification"
          UNION ALL SELECT 'Office', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Office"
          UNION ALL SELECT 'OtpRateLimit', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "OtpRateLimit"
          UNION ALL SELECT 'Position', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Position"
          UNION ALL SELECT 'Role', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Role"
          UNION ALL SELECT 'RolePermission', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "RolePermission"
          UNION ALL SELECT 'Screen', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Screen"
          UNION ALL SELECT 'ScreenTab', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "ScreenTab"
          UNION ALL SELECT 'Staff', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Staff"
          UNION ALL SELECT 'StaffAuthenticator', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "StaffAuthenticator"
          UNION ALL SELECT 'StaffRole', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "StaffRole"
          UNION ALL SELECT 'StatusDefinition', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "StatusDefinition"
          UNION ALL SELECT 'Team', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "Team"
          UNION ALL SELECT 'TimeTracking', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "TimeTracking"
          UNION ALL SELECT 'UserLogin', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "UserLogin"
          UNION ALL SELECT 'VIBEIconSet', "VIBEIconSetID", "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY "VIBEIconSetID") FROM "VIBEIconSet"
          UNION ALL SELECT 'VIBEIcons', id, "Log_CreatedAt",
            LAG("Log_CreatedAt") OVER (ORDER BY id) FROM "VIBEIcons"
        )
        SELECT
          tbl                                                         AS table_name,
          id                                                          AS record_id,
          ts                                                          AS created_at,
          prev_ts                                                     AS prev_created_at,
          ROUND(EXTRACT(EPOCH FROM (prev_ts - ts))::numeric, 2)      AS seconds_out_of_order
        FROM ordered
        WHERE prev_ts IS NOT NULL AND ts < prev_ts
        ORDER BY tbl, id
        LIMIT ${limit}
      `;
      return rows.map((r) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])),
      );
    },
  },

  // ── TimeTracking (ported from broken DB function) ───────────────────────────
  {
    checkId: 'tt_multiple_auto_logout_per_day',
    checkName: 'Multiple auto-logout rows per staff per shift',
    category: 'TimeTracking',
    severity: 'error',
    description:
      'Each staff member should have at most 1 auto-logout TT row per shift day. ' +
      '>1 indicates a duplicate cron execution or data corruption.',
    async runCount(prisma) {
      // ShiftEndTime is TEXT and may contain "HH:MM:SS" — use DATE(StartTime) as fallback
      const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*) AS cnt FROM (
          SELECT "StaffId"
          FROM   "TimeTracking"
          WHERE  "UserAgent"  LIKE 'system-auto-logout:%'
            AND  "IsDeleted"  = false
            AND  "StartTime" >= NOW() - INTERVAL '30 days'
          GROUP BY "StaffId",
            CASE
              WHEN "ShiftEndTime" ~ '^\d{4}-\d{2}-\d{2}'
              THEN "ShiftEndTime"::date
              ELSE DATE("StartTime")
            END
          HAVING COUNT(*) > 1
        ) sub
      `;
      return Number(rows[0]?.cnt ?? 0);
    },
    async runDetail(prisma, limit) {
      const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT
          tt.id                                                           AS record_id,
          tt."StaffId"                                                    AS staff_id,
          s."EmployeeId"                                                  AS employee_id,
          s."FirstName" || ' ' || s."Surname"                            AS staff_name,
          CASE
            WHEN tt."ShiftEndTime" ~ '^\d{4}-\d{2}-\d{2}'
            THEN tt."ShiftEndTime"::date
            ELSE DATE(tt."StartTime")
          END                                                             AS shift_date,
          tt."StartTime"                                                  AS start_time,
          tt."Log_CreatedAt"                                              AS created_at,
          COALESCE(tt."CronRunId"::text, '—')                            AS cron_run_id,
          tt."Notes"                                                      AS notes
        FROM "TimeTracking" tt
        JOIN (
          SELECT "StaffId",
            CASE
              WHEN "ShiftEndTime" ~ '^\d{4}-\d{2}-\d{2}'
              THEN "ShiftEndTime"::date
              ELSE DATE("StartTime")
            END AS shift_day
          FROM "TimeTracking"
          WHERE "UserAgent" LIKE 'system-auto-logout:%'
            AND "IsDeleted" = false
            AND "StartTime" >= NOW() - INTERVAL '30 days'
          GROUP BY 1, 2
          HAVING COUNT(*) > 1
        ) dup
          ON tt."StaffId" = dup."StaffId"
          AND CASE
            WHEN tt."ShiftEndTime" ~ '^\d{4}-\d{2}-\d{2}'
            THEN tt."ShiftEndTime"::date
            ELSE DATE(tt."StartTime")
          END = dup.shift_day
        LEFT JOIN "Staff" s ON s.id = tt."StaffId"
        WHERE tt."UserAgent" LIKE 'system-auto-logout:%'
          AND tt."IsDeleted" = false
        ORDER BY dup."StaffId", tt."StartTime"
        LIMIT ${limit}
      `;
      return rows;
    },
  },
];

const APP_CHECK_IDS = new Set(APP_CHECKS.map((c) => c.checkId));

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class IntegrityService {
  constructor(private readonly prisma: PrismaService) {}

  async runAll(): Promise<IIntegrityCheckSummary[]> {
    // Load DB-registered checks individually — one broken function won't block others.
    // Exclude checks already handled by APP_CHECKS (filtered in JS to avoid SQL injection).
    const allRegistry = await this.prisma.$queryRaw<
      Array<{
        check_id: string;
        check_name: string;
        category: string;
        severity: string;
        description: string | null;
        order_no: number;
      }>
    >`SELECT check_id, check_name, category, severity, description, order_no
      FROM integrity_check_registry
      WHERE is_active = true
      ORDER BY order_no`;
    const registry = allRegistry.filter((r) => !APP_CHECK_IDS.has(r.check_id));

    const dbResults = await Promise.all(
      registry.map(async (r) => {
        try {
          const rows = await this.prisma.$queryRawUnsafe<Array<{ [k: string]: bigint }>>(
            `SELECT fn_ic_${r.check_id}_count()`,
          );
          const count = Number(Object.values(rows[0])[0] ?? 0);
          return {
            checkId: r.check_id,
            checkName: r.check_name,
            category: r.category,
            severity: r.severity,
            description: r.description,
            violationCount: count,
          };
        } catch (err) {
          return {
            checkId: r.check_id,
            checkName: r.check_name,
            category: r.category,
            severity: r.severity,
            description: r.description
              ? `${r.description} [⚠ count function error: ${err instanceof Error ? err.message.slice(0, 80) : 'unknown'}]`
              : `Count function error: ${err instanceof Error ? err.message.slice(0, 80) : 'unknown'}`,
            violationCount: -1,
          };
        }
      }),
    );

    // Application-level checks — each isolated
    const appResults: IIntegrityCheckSummary[] = await Promise.all(
      APP_CHECKS.map(async (c) => {
        try {
          return {
            checkId: c.checkId,
            checkName: c.checkName,
            category: c.category,
            severity: c.severity,
            description: c.description,
            violationCount: await c.runCount(this.prisma),
          };
        } catch (err) {
          return {
            checkId: c.checkId,
            checkName: c.checkName,
            category: c.category,
            severity: 'error' as const,
            description: `Check error: ${err instanceof Error ? err.message.slice(0, 120) : 'unknown'}`,
            violationCount: -1,
          };
        }
      }),
    );

    return [...dbResults, ...appResults];
  }

  async getDetails(checkId: string): Promise<Record<string, unknown>[]> {
    if (!VALID_CHECK_ID.test(checkId)) {
      throw new BadRequestException(`Invalid check ID: ${checkId}`);
    }

    // Application-level check
    if (APP_CHECK_IDS.has(checkId)) {
      const check = APP_CHECKS.find((c) => c.checkId === checkId)!;
      return check.runDetail(this.prisma, 100);
    }

    // DB-function-based check
    const registered = await this.prisma.$queryRaw<Array<{ check_id: string }>>`
      SELECT check_id FROM integrity_check_registry
      WHERE check_id = ${checkId} AND is_active = true
      LIMIT 1
    `;
    if (registered.length === 0) {
      throw new BadRequestException(`Unknown check: ${checkId}`);
    }

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM fn_ic_${checkId}_detail(100)`,
    );

    return rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v]),
      ),
    );
  }
}
