import { apiClient } from '@/lib/axios';

export interface IUserPermissionEntry {
  screen: string;
  tab: string | null;
  /** Actions where at least one rule ALLOWS and no rule DENIES. */
  actions: string[];
  /** Actions with at least one explicit DENY — for admin debugging UI. */
  denied: string[];
}

export interface IUserPermissionPayload {
  userId: string;
  roles: string[];
  isSuperAdmin: boolean;
  permissions: IUserPermissionEntry[];
  generatedAt: string;
  ttlSeconds: number;
}

export async function getMyPermissionsApi(): Promise<IUserPermissionPayload> {
  const res = await apiClient.get<{ success: boolean; data: IUserPermissionPayload }>(
    '/me/permissions',
  );
  return res.data.data;
}
