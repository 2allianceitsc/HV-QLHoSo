import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  type IPaginationParams,
  type ICreateCompanyDto,
  type IUpdateCompanyDto,
} from '@/api/org.api';
import { invalidateResolvedStatuses } from '@/lib/resolvedStatuses';

const COMPANIES_KEY = 'companies';

export function useCompanies(params?: IPaginationParams) {
  return useQuery({
    queryKey: [COMPANIES_KEY, params],
    queryFn: () => getCompanies(params),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: [COMPANIES_KEY, id],
    queryFn: () => getCompany(id),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateCompanyDto) => createCompany(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateCompanyDto }) => updateCompany(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}
