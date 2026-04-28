import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDropdownDisplayConfigsApi,
  updateDropdownDisplayConfigsApi,
  type IDropdownDisplayConfig,
} from '@/api/dropdownDisplay.api';
import {
  DEFAULT_DROPDOWN_CONFIGS,
  DROPDOWN_ENTITY_TYPES,
  type DropdownEntityType,
} from '@shared/constants/dropdown-display';

export const DROPDOWN_DISPLAY_KEY = ['dropdown-display'] as const;

/**
 * Returns a complete map of configs for all entity types, falling back to
 * defaults for any entity not yet persisted. Callers can rely on every key
 * being present.
 */
export function useDropdownDisplayConfigs() {
  const query = useQuery({
    queryKey: DROPDOWN_DISPLAY_KEY,
    queryFn: getDropdownDisplayConfigsApi,
    staleTime: Infinity,
  });

  const resolved = resolveConfigsMap(query.data);

  return { ...query, configsMap: resolved };
}

export function useUpdateDropdownDisplayConfigs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configs: IDropdownDisplayConfig[]) =>
      updateDropdownDisplayConfigsApi(configs),
    onSuccess: (data) => {
      qc.setQueryData(DROPDOWN_DISPLAY_KEY, data);
    },
  });
}

function resolveConfigsMap(
  persisted: IDropdownDisplayConfig[] | undefined,
): Record<DropdownEntityType, IDropdownDisplayConfig> {
  const map = { ...DEFAULT_DROPDOWN_CONFIGS };
  if (!persisted) return map;
  for (const cfg of persisted) {
    if (DROPDOWN_ENTITY_TYPES.includes(cfg.entityType)) {
      map[cfg.entityType] = cfg;
    }
  }
  return map;
}
