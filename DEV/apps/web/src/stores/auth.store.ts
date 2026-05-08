import { create } from 'zustand';
import type { IUserPermissionPayload } from '@/api/permissions.api';

export interface ICurrentUser {
  id: string;
  staffId: string;
  username: string;
  email: string;
  roles: string[];
  hvRole: string;
  fullName: string;
  photoBusiness: string | null;
  departmentId: string | null;
}

interface IAuthStore {
  user: ICurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True once any auth check has completed (success or failure). Prevents double getMeApi() calls when navigating between Protected→Public routes. */
  isInitialized: boolean;
  /**
   * Effective permission set for the current user, fetched from
   * `GET /api/me/permissions` after login. Null until loaded.
   * Empty `permissions` array + `isSuperAdmin: true` → bypass all checks.
   */
  permissions: IUserPermissionPayload | null;
  /** Measured clock skew: server UTC minus client UTC midpoint (ms). Negative = client behind server. Null = not yet measured. */
  clockSkewMs: number | null;
  /** Threshold from attendance_config. Warn user if |clockSkewMs| > this. */
  clockSkewWarningMs: number;
  /** Client UTC midpoint (ms) at time of skew measurement. */
  clockSyncClientMs: number | null;
  /** Server UTC (ms) at time of skew measurement. */
  clockSyncServerMs: number | null;
  setUser: (user: ICurrentUser) => void;
  setPermissions: (permissions: IUserPermissionPayload | null) => void;
  setClockSkew: (skewMs: number, warningMs: number, clientMs: number, serverMs: number) => void;
  clearUser: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<IAuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  permissions: null,
  clockSkewMs: null,
  clockSkewWarningMs: 5000,
  clockSyncClientMs: null,
  clockSyncServerMs: null,
  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false, isInitialized: true }),
  setPermissions: (permissions) => set({ permissions }),
  setClockSkew: (skewMs, warningMs, clientMs, serverMs) =>
    set({ clockSkewMs: skewMs, clockSkewWarningMs: warningMs, clockSyncClientMs: clientMs, clockSyncServerMs: serverMs }),
  clearUser: () =>
    set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true, permissions: null, clockSkewMs: null, clockSyncClientMs: null, clockSyncServerMs: null }),
  setLoading: (isLoading) => set({ isLoading }),
}));
