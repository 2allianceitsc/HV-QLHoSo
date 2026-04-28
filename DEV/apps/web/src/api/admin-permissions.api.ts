import { apiClient } from '@/lib/axios';

export interface IAdminTab {
  id: string;
  code: string;
  name: string;
  orderNo: number;
  isDisabled: boolean;
}

export interface IAdminScreen {
  id: string;
  code: string;
  name: string;
  route: string;
  area: string;
  isDisabled: boolean;
  tabs: IAdminTab[];
}

export interface IAdminAction {
  code: string;
  name: string;
}

export interface IAdminCatalog {
  screens: IAdminScreen[];
  actions: IAdminAction[];
}

export interface IAdminRole {
  id: string;
  name: string;
  displayName: string | null;
  colorHex: string | null;
}

export interface IAdminRule {
  id: string;
  roleId: string;
  screenCode: string;
  tabCode: string | null;
  permissionCode: string;
  isAllowed: boolean;
  logUpdatedAt: string;
  logUpdatedBy: string | null;
}

export interface IMatrixChange {
  roleId: string;
  screenCode: string;
  tabCode?: string | null;
  permissionCode: string;
  isAllowed?: boolean;
  clear?: boolean;
}

export interface IMatrixChangeResult {
  applied: number;
  cleared: number;
  skipped: number;
  affectedRoleIds: string[];
  affectedUserCount: number;
}

export async function getPermissionCatalogApi(): Promise<IAdminCatalog> {
  const res = await apiClient.get<{ success: boolean; data: IAdminCatalog }>(
    '/system/role-permissions/catalog',
  );
  return res.data.data;
}

export async function getPermissionRolesApi(): Promise<IAdminRole[]> {
  const res = await apiClient.get<{ success: boolean; data: IAdminRole[] }>(
    '/system/role-permissions/roles',
  );
  return res.data.data;
}

export async function getRulesForRoleApi(roleId: string): Promise<IAdminRule[]> {
  const res = await apiClient.get<{ success: boolean; data: IAdminRule[] }>(
    '/system/role-permissions',
    { params: { roleId } },
  );
  return res.data.data;
}

export async function applyMatrixChangesApi(
  changes: IMatrixChange[],
): Promise<IMatrixChangeResult> {
  const res = await apiClient.put<{ success: boolean; data: IMatrixChangeResult }>(
    '/system/role-permissions/matrix',
    { changes },
  );
  return res.data.data;
}

export async function resetRoleDefaultsApi(roleId: string): Promise<{ message: string }> {
  const res = await apiClient.post<{ success: boolean; data: { message: string } }>(
    `/system/role-permissions/roles/${roleId}/reset`,
  );
  return res.data.data;
}
