import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateResolvedStatuses } from '@/lib/resolvedStatuses';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getSettings,
  bulkUpdateSettings,
  updateSetting,
  getSystemStatuses,
  createSystemStatus,
  updateSystemStatus,
  deleteSystemStatus,
  getAuditLogs,
  getApiLogs,
  getSystemVibeIcons,
  createVibeIcon,
  updateVibeIcon,
  deleteVibeIcon,
  toggleVibeIcon,
  reorderVibeIcons,
  getVibeIconSets,
  createVibeIconSet,
  updateVibeIconSet,
  deleteVibeIconSet,
  activateVibeIconSet,
  getVibeIconsBySet,
  copyIconsToSet,
  duplicateVibeIconSet,
  collectOrphanedIcons,
  scanVibeIconUrls,
  scanEmployeePhotos,
  getSystemWarnings,
  getIntegrityChecks,
  getIntegrityCheckDetails,
  getSessionBlockedUsers,
  getEmailConfigs,
  getEmailConfig,
  createEmailConfig,
  updateEmailConfig,
  activateEmailConfig,
  deactivateEmailConfig,
  deleteEmailConfig,
  sendTestEmail,
  type ICreateRoleDto,
  type IUpdateRoleDto,
  type IStatusFilter,
  type ICreateStatusDto,
  type IUpdateStatusDto,
  type IAuditLogFilter,
  type IApiLogFilter,
  type ICreateVibeIconDto,
  type IUpdateVibeIconDto,
  type ICreateVibeIconSetDto,
  type IUpdateVibeIconSetDto,
  type ICreateEmailConfigDto,
  type IUpdateEmailConfigDto,
  getPublicConfig,
} from '@/api/system.api';

// ── Public config (no auth) ───────────────────────────────────────────────────

export function usePublicConfig() {
  return useQuery({
    queryKey: ['public-config'],
    queryFn: getPublicConfig,
    staleTime: 5 * 60 * 1000, // 5 min — changes rarely
    retry: false,              // don't block login page on failure
  });
}

/** Returns a versioned branding URL: /api/public/branding/logo?v=<timestamp> */
export function useBrandingUrl(endpoint: string): string {
  const { data } = usePublicConfig();
  const version = data?.['BRANDING_VERSION'];
  return version ? `${endpoint}?v=${version}` : endpoint;
}

// ── Roles ─────────────────────────────────────────────────────────────────────

const ROLES_KEY = 'system-roles';

export function useSystemRoles() {
  return useQuery({
    queryKey: [ROLES_KEY],
    queryFn: () => getRoles(),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateRoleDto) => createRole(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES_KEY] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateRoleDto }) => updateRole(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES_KEY] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROLES_KEY] }),
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'system-settings';

export function useSystemSettings() {
  return useQuery({
    queryKey: [SETTINGS_KEY],
    queryFn: () => getSettings(),
  });
}

export function useBulkUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, string>) => bulkUpdateSettings(settings),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [SETTINGS_KEY] });
      void qc.invalidateQueries({ queryKey: ['public-config'] });
    },
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => updateSetting(key, value),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [SETTINGS_KEY] });
      void qc.invalidateQueries({ queryKey: ['public-config'] });
    },
  });
}

// ── Statuses ──────────────────────────────────────────────────────────────────

const STATUSES_KEY = 'system-statuses';

function invalidateStatusQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: [STATUSES_KEY] });
  invalidateResolvedStatuses(qc);
}

export function useSystemStatuses(filter?: IStatusFilter) {
  return useQuery({
    queryKey: [STATUSES_KEY, filter],
    queryFn: () => getSystemStatuses(filter),
  });
}

export function useCreateSystemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateStatusDto) => createSystemStatus(dto),
    onSuccess: () => invalidateStatusQueries(qc),
  });
}

export function useUpdateSystemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateStatusDto }) =>
      updateSystemStatus(id, dto),
    onSuccess: () => invalidateStatusQueries(qc),
  });
}

export function useDeleteSystemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSystemStatus(id),
    onSuccess: () => invalidateStatusQueries(qc),
  });
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

const AUDIT_KEY = 'audit-logs';

export function useAuditLogs(filter?: IAuditLogFilter) {
  return useQuery({
    queryKey: [AUDIT_KEY, filter],
    queryFn: () => getAuditLogs(filter),
  });
}

// ── API Request Logs ──────────────────────────────────────────────────────────

const API_LOG_KEY = 'api-request-logs';

export function useApiLogs(filter?: IApiLogFilter) {
  return useQuery({
    queryKey: [API_LOG_KEY, filter],
    queryFn: () => getApiLogs(filter),
  });
}

// ── VIBE Icons ────────────────────────────────────────────────────────────────

const VIBE_ICONS_KEY = 'system-vibe-icons';

export function useSystemVibeIcons() {
  return useQuery({
    queryKey: [VIBE_ICONS_KEY],
    queryFn: () => getSystemVibeIcons(),
  });
}

export function useCreateVibeIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateVibeIconDto) => createVibeIcon(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VIBE_ICONS_KEY] }),
  });
}

export function useUpdateVibeIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateVibeIconDto }) => updateVibeIcon(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VIBE_ICONS_KEY] }),
  });
}

export function useDeleteVibeIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVibeIcon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VIBE_ICONS_KEY] }),
  });
}

export function useToggleVibeIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleVibeIcon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VIBE_ICONS_KEY] }),
  });
}

export function useReorderVibeIcons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => reorderVibeIcons(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VIBE_ICONS_KEY] }),
  });
}

// ── VIBE Icon Sets ────────────────────────────────────────────────────────────

const VIBE_ICON_SETS_KEY = 'system-vibe-icon-sets';

export function useVibeIconSets() {
  return useQuery({
    queryKey: [VIBE_ICON_SETS_KEY],
    queryFn: () => getVibeIconSets(),
  });
}

export function useVibeIconsBySet(setId: string | null) {
  return useQuery({
    queryKey: [VIBE_ICONS_KEY, 'by-set', setId],
    queryFn: () => getVibeIconsBySet(setId!),
    enabled: !!setId,
  });
}

export function useCreateVibeIconSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateVibeIconSetDto) => createVibeIconSet(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VIBE_ICON_SETS_KEY] }),
  });
}

export function useUpdateVibeIconSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateVibeIconSetDto }) => updateVibeIconSet(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VIBE_ICON_SETS_KEY] }),
  });
}

export function useDeleteVibeIconSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVibeIconSet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VIBE_ICON_SETS_KEY] }),
  });
}

export function useActivateVibeIconSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateVibeIconSet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VIBE_ICON_SETS_KEY] });
      qc.invalidateQueries({ queryKey: [VIBE_ICONS_KEY] });
    },
  });
}

export function useCopyIconsToSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetSetId, sourceSetId }: { targetSetId: string; sourceSetId: string }) =>
      copyIconsToSet(targetSetId, sourceSetId),
    onSuccess: (_data, { targetSetId }) => {
      qc.invalidateQueries({ queryKey: [VIBE_ICONS_KEY, 'by-set', targetSetId] });
      qc.invalidateQueries({ queryKey: [VIBE_ICON_SETS_KEY] });
    },
  });
}

export function useDuplicateVibeIconSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duplicateVibeIconSet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VIBE_ICON_SETS_KEY] }),
  });
}

export function useCollectOrphanedIcons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => collectOrphanedIcons(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [VIBE_ICON_SETS_KEY] });
      void qc.invalidateQueries({ queryKey: [VIBE_ICONS_KEY] });
    },
  });
}

export function useScanVibeIconUrls() {
  return useMutation({
    mutationFn: () => scanVibeIconUrls(),
  });
}

// ── Email Provider Configs ────────────────────────────────────────────────────

const EMAIL_CONFIGS_KEY = 'email-provider-configs';

export function useEmailConfigs() {
  return useQuery({
    queryKey: [EMAIL_CONFIGS_KEY],
    queryFn: () => getEmailConfigs(),
  });
}

export function useEmailConfig(id: string) {
  return useQuery({
    queryKey: [EMAIL_CONFIGS_KEY, id],
    queryFn: () => getEmailConfig(id),
    enabled: !!id,
  });
}

export function useCreateEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateEmailConfigDto) => createEmailConfig(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [EMAIL_CONFIGS_KEY] }),
  });
}

export function useUpdateEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateEmailConfigDto }) => updateEmailConfig(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [EMAIL_CONFIGS_KEY] }),
  });
}

export function useActivateEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateEmailConfig(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [EMAIL_CONFIGS_KEY] }),
  });
}

export function useDeactivateEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateEmailConfig(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [EMAIL_CONFIGS_KEY] }),
  });
}

export function useDeleteEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmailConfig(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [EMAIL_CONFIGS_KEY] }),
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => sendTestEmail(id, to),
  });
}

// ── System Warnings ───────────────────────────────────────────────────────────

export const SYSTEM_WARNINGS_KEY = 'system-warnings';

export function useSystemWarnings(category?: string) {
  return useQuery({
    queryKey: [SYSTEM_WARNINGS_KEY, category ?? 'all'],
    queryFn: () => getSystemWarnings(category),
  });
}

export const EMPLOYEE_PHOTOS_SCAN_KEY = 'employee-photos-scan';

export function useScanEmployeePhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => scanEmployeePhotos(),
    onSuccess: () => {
      // Invalidate warnings cache to reflect latest scan results
      void qc.invalidateQueries({ queryKey: [SYSTEM_WARNINGS_KEY] });
    },
  });
}

// ── Data Integrity Checks ─────────────────────────────────────────────────────

export const INTEGRITY_CHECKS_KEY = 'integrity-checks';

export function useIntegrityChecks() {
  return useQuery({
    queryKey: [INTEGRITY_CHECKS_KEY],
    queryFn: getIntegrityChecks,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useIntegrityCheckDetails(checkId: string | null) {
  return useQuery({
    queryKey: [INTEGRITY_CHECKS_KEY, checkId, 'details'],
    queryFn: () => getIntegrityCheckDetails(checkId!),
    enabled: !!checkId,
    staleTime: 0,
  });
}

// ── Session Blocked Users ─────────────────────────────────────────────────────

export const SESSION_BLOCKED_KEY = 'session-blocked-users';

export function useSessionBlockedUsers() {
  return useQuery({
    queryKey: [SESSION_BLOCKED_KEY],
    queryFn: getSessionBlockedUsers,
    staleTime: 0,
    refetchOnMount: true,
  });
}
