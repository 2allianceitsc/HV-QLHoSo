import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { usePermission, type PermissionAction } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/auth.store';
import { reportError } from '@/lib/reportError';

// When permissions stay null this long, something upstream (initAuth, login
// flow) broke. Warn the team + surface a Reload banner to the user.
const STUCK_THRESHOLD_MS = 8000;

interface IRequirePermissionProps {
  screen: string;
  tab?: string | null;
  action?: PermissionAction;
  /** Where to redirect on deny. If omitted, renders `fallback` inline instead. */
  redirect?: string;
  /** Rendered when the user lacks permission AND no redirect is set. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Wrap any subtree that requires a specific screen/tab permission. Mirrors
 * the backend `@RequiresScreen` decorator.
 *
 * Two usage modes:
 *
 *   1. Route-level (redirect on deny):
 *      <RequirePermission screen="E04" redirect="/">
 *        <EmployeeDetailPage />
 *      </RequirePermission>
 *
 *   2. Inline (render nothing or a fallback):
 *      <RequirePermission screen="E04" tab="security" fallback={null}>
 *        <PasswordResetButton />
 *      </RequirePermission>
 */
export function RequirePermission({
  screen,
  tab = null,
  action = 'VIEW',
  redirect,
  fallback = null,
  children,
}: IRequirePermissionProps) {
  const permissions = useAuthStore((s) => s.permissions);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const allowed = usePermission(screen, tab, action);

  const [isStuck, setIsStuck] = useState(false);
  const reportedRef = useRef(false);

  // Stuck-loading watchdog: if permissions stays null too long, something
  // upstream failed silently. Report once + reveal a Reload banner.
  useEffect(() => {
    if (permissions !== null) {
      setIsStuck(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsStuck(true);
      if (reportedRef.current) return;
      reportedRef.current = true;
      reportError({
        message: `[FE-STUCK] RequirePermission spinner > ${STUCK_THRESHOLD_MS}ms — permissions still null (screen=${screen})`,
        pageUrl: window.location.pathname + window.location.search,
        stack: [
          `screen=${screen}`,
          `tab=${tab ?? ''}`,
          `action=${action}`,
          `isAuthenticated=${isAuthenticated}`,
          `isInitialized=${isInitialized}`,
          `userId=${user?.id ?? 'n/a'}`,
          `username=${user?.username ?? 'n/a'}`,
        ].join('\n'),
      });
    }, STUCK_THRESHOLD_MS);
    return () => window.clearTimeout(timer);
  }, [permissions, screen, tab, action, isAuthenticated, isInitialized, user]);

  // Guard against a race on refresh: ProtectedRoute fetches /api/me/permissions
  // in the background after auth. Until it lands, `permissions` is null and
  // `usePermission` returns false — which would redirect an authorized user
  // away from the URL they just refreshed. Hold render until loaded.
  if (permissions === null) {
    if (isStuck) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 max-w-md text-center">
            <p className="text-sm text-muted-foreground">
              Taking longer than usual. Your session may need to be refreshed.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (allowed) return <>{children}</>;
  if (redirect) return <Navigate to={redirect} replace />;
  return <>{fallback}</>;
}
