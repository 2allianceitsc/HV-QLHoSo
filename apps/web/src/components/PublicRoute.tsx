import { type ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { initAuth } from '@/lib/auth-init';

interface IPublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: IPublicRouteProps) {
  const { user, isAuthenticated, isLoading, isInitialized, setLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated || isInitialized) return;
    setLoading(true);
    void initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const redirect = user.roles.includes('CLIENT') ? '/client' : '/';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
