import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costCodeApi } from '@/api/costCode.api';

const KEY = 'cost-codes';

export function useCostCodes(departmentId?: string) {
  return useQuery({
    queryKey: [KEY, departmentId],
    queryFn: () => costCodeApi.list(departmentId),
  });
}

export function useCreateCostCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; departmentId: string }) => costCodeApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateCostCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; code?: string; name?: string; departmentId?: string; isActive?: boolean }) =>
      costCodeApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteCostCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => costCodeApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
