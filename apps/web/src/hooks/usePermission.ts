import { useAuthStore } from '@/stores/auth.store';

export type PermissionAction = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'APPROVE';

/**
 * Returns true if the current user is allowed to perform `action` on
 * `screen` (optionally scoped to `tab`).
 *
 * Resolution — mirrors the backend guard:
 *   1. SUPER_ADMIN → always true.
 *   2. Tab entry with the action → true (tab overrides screen).
 *   3. Screen-level entry with the action → true.
 *   4. Otherwise → false.
 *
 * During the loading window (permissions null), returns false — consumers
 * should show a spinner via the outer auth loading state, not here.
 *
 * Usage:
 *   const canView = usePermission('E04', 'roles');            // default VIEW
 *   const canEdit = usePermission('E04', 'roles', 'UPDATE');
 */
export function usePermission(
  screen: string,
  tab?: string | null,
  action: PermissionAction = 'VIEW',
): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  if (!permissions) return false;
  if (permissions.isSuperAdmin) return true;

  const entries = permissions.permissions.filter((p) => p.screen === screen);
  if (entries.length === 0) return false;

  const tabEntry = tab ? entries.find((e) => e.tab === tab) : null;
  const screenEntry = entries.find((e) => e.tab === null);
  const applicable = tabEntry ?? screenEntry;
  if (!applicable) return false;

  if (applicable.denied.includes(action)) return false;
  return applicable.actions.includes(action);
}

/**
 * Returns the list of actions the user is allowed to perform on
 * (screen, tab). Useful for rendering action buttons conditionally without
 * repeated calls to `usePermission`.
 */
export function usePermissionActions(
  screen: string,
  tab?: string | null,
): PermissionAction[] {
  const permissions = useAuthStore((s) => s.permissions);
  if (!permissions) return [];
  if (permissions.isSuperAdmin)
    return ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE'];

  const entries = permissions.permissions.filter((p) => p.screen === screen);
  const tabEntry = tab ? entries.find((e) => e.tab === tab) : null;
  const screenEntry = entries.find((e) => e.tab === null);
  const applicable = tabEntry ?? screenEntry;
  return (applicable?.actions ?? []) as PermissionAction[];
}
