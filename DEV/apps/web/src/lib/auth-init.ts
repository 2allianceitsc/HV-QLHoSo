import { getMeApi } from '@/api/auth.api';
import { getMyPermissionsApi } from '@/api/permissions.api';
import type { ICurrentUser } from '@/stores/auth.store';
import { useAuthStore } from '@/stores/auth.store';

// Module-level promise ensures only ONE /auth/me call is in-flight at a time,
// even when React StrictMode double-invokes effects or multiple components mount.
let _initPromise: Promise<void> | null = null;

/**
 * Call this instead of raw setUser() after every login/2FA/password-change flow.
 * Sets the user AND fetches permissions so RequirePermission never gets stuck on
 * its loading spinner waiting for permissions that will never arrive (until F5).
 */
export async function completeLogin(user: ICurrentUser): Promise<void> {
  try {
    const perms = await getMyPermissionsApi();
    useAuthStore.getState().setPermissions(perms);
  } catch {
    // Non-fatal — legacy role checks still apply.
  }
  useAuthStore.getState().setUser(user);
}

export function initAuth(): Promise<void> {
  const state = useAuthStore.getState();
  if (state.isInitialized) return Promise.resolve();
  if (_initPromise) return _initPromise;

  // Fetch user first, then permissions in parallel resolution — both must
  // resolve before clearing the loading spinner. This prevents a sidebar flash
  // where role-based items show briefly then disappear once the permission
  // matrix loads (visible on every F5/hard refresh).
  _initPromise = getMeApi()
    .then((user) =>
      getMyPermissionsApi()
        .then((perms) => ({ user, perms }))
        .catch(() => ({ user, perms: null })),
    )
    .then(({ user, perms }) => {
      useAuthStore.getState().setPermissions(perms);
      // setUser last — it clears isLoading and triggers AppLayout render.
      useAuthStore.getState().setUser(user);
    })
    .catch(() => {
      // Any 401/network failure clears the session. The interceptor may have
      // already called clearUser(); calling it again is a safe no-op.
      useAuthStore.getState().clearUser();
    })
    .finally(() => {
      _initPromise = null;
    });

  return _initPromise;
}
