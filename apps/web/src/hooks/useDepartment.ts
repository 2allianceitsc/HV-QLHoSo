import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type IPaginationParams,
  type ICreateDepartmentDto,
  type IUpdateDepartmentDto,
} from '@/api/org.api';

const DEPARTMENTS_KEY = 'departments';

export function useDepartments(params?: IPaginationParams & { companyId?: string }) {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY, params],
    queryFn: () => getDepartments(params),
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY, id],
    queryFn: () => getDepartment(id),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateDepartmentDto) => createDepartment(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateDepartmentDto }) =>
      updateDepartment(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}
