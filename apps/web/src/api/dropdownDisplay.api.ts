import { apiClient } from '@/lib/axios';
import type {
  DropdownEntityType,
  IDropdownDisplayConfig,
} from '@shared/constants/dropdown-display';

export type { DropdownEntityType, IDropdownDisplayConfig };

export async function getDropdownDisplayConfigsApi(): Promise<IDropdownDisplayConfig[]> {
  const res = await apiClient.get<{ data: IDropdownDisplayConfig[] }>('/settings/dropdown-display');
  return res.data.data ?? [];
}

export async function updateDropdownDisplayConfigsApi(
  configs: IDropdownDisplayConfig[],
): Promise<IDropdownDisplayConfig[]> {
  const res = await apiClient.put<{ data: IDropdownDisplayConfig[] }>(
    '/settings/dropdown-display',
    { configs },
  );
  return res.data.data ?? [];
}
