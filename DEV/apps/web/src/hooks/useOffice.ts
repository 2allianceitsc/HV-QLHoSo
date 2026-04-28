import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOffices,
  getOffice,
  createOffice,
  updateOffice,
  deleteOffice,
  type IPaginationParams,
  type ICreateOfficeDto,
  type IUpdateOfficeDto,
} from '@/api/org.api';
import { invalidateResolvedStatuses } from '@/lib/resolvedStatuses';

const OFFICES_KEY = 'offices';

export function useOffices(params?: IPaginationParams & { companyId?: string }) {
  return useQuery({
    queryKey: [OFFICES_KEY, params],
    queryFn: () => getOffices(params),
  });
}

export function useOffice(id: string) {
  return useQuery({
    queryKey: [OFFICES_KEY, id],
    queryFn: () => getOffice(id),
    enabled: !!id,
  });
}

export function useCreateOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateOfficeDto) => createOffice(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [OFFICES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useUpdateOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateOfficeDto }) => updateOffice(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [OFFICES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useDeleteOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOffice(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [OFFICES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}
