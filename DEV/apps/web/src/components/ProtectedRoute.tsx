import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { initAuth } from '@/lib/auth-init';
import { reportError } from '@/lib/reportError';

// If the auth loading spinner stays up this long, initAuth() almost certainly
// failed silently (network, 4xx on /auth/me, etc). Surface it to the team + user.
const STUCK_THRESHOLD_MS = 12000;

interface IProtectedRouteProps {
  children: ReactNode;
  /**
   * Legacy role check — retained for backward compatibility with routes
   * not yet migrated to `<RequirePermission screen="...">`. Prefer the new
   * API for any new route.
   */
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: IProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, isInitialized, setLoading } = useAuthStore();
  const location = useLocation();
  const [isStuck, setIsStuck] = useState(false);
  const reportedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated || isInitialized) return;
    setLoading(true);
    void initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stuck-loading watchdog — matches the RequirePermission one, but guards the
  // earlier `isLoading` spinner (before permissions are even requested).
  useEffect(() => {
    if (!isLoading) {
      setIsStuck(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsStuck(true);
      if (reportedRef.current) return;
      reportedRef.current = true;
      reportError({
        message: `[FE-STUCK] ProtectedRoute isLoading > ${STUCK_THRESHOLD_MS}ms — initAuth never resolved`,
        pageUrl: window.location.pathname + window.location.search,
        stack: [
          `isAuthenticated=${isAuthenticated}`,
          `isInitialized=${isInitialized}`,
          `userId=${user?.id ?? 'n/a'}`,
          `username=${user?.username ?? 'n/a'}`,
        ].join('\n'),
      });
    }, STUCK_THRESHOLD_MS);
    return () => window.clearTimeout(timer);
  }, [isLoading, isAuthenticated, isInitialized, user]);

  if (isLoading) {
    if (isStuck) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="flex flex-col items-center gap-3 max-w-md text-center px-6">
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
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const from = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(from)}`} replace />;
  }

  if (allowedRoles && user && !allowedRoles.some((role) => user.roles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
