import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { queryClient } from '@/lib/queryClient';

export function useLogoutFlow() {
  const navigate = useNavigate();
  const { clearUser } = useAuthStore();

  const startLogout = useCallback(() => {
    void (async () => {
      try {
        await logoutApi();
      } catch {
        // Ignore auth logout failure — still clear local session.
      }
      clearUser();
      queryClient.clear();
      void navigate('/login', { replace: true });
    })();
  }, [clearUser, navigate]);

  return { startLogout };
}
