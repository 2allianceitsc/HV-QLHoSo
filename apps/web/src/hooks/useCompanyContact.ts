import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCompanyContacts,
  createCompanyContact,
  updateCompanyContact,
  deleteCompanyContact,
  type ICreateCompanyContactDto,
  type IUpdateCompanyContactDto,
} from '@/api/org.api';

const key = (companyId: string) => ['company-contacts', companyId];

export function useCompanyContacts(companyId: string | null) {
  return useQuery({
    queryKey: key(companyId ?? ''),
    queryFn: () => getCompanyContacts(companyId!),
    enabled: !!companyId,
  });
}

export function useCreateCompanyContact(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateCompanyContactDto) => createCompanyContact(companyId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(companyId) }),
  });
}

export function useUpdateCompanyContact(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateCompanyContactDto }) =>
      updateCompanyContact(companyId, id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(companyId) }),
  });
}

export function useDeleteCompanyContact(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => deleteCompanyContact(companyId, contactId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(companyId) }),
  });
}
