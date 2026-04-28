import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,
  updateEmployeeRoles,
  importEmployeePreview,
  importEmployeeConfirm,
  getEmployeeTimezones,
  getEmployee2FAStatus,
  adminRevoke2FA,
  adminSet2FARequired,
  getEmployeeSessionStatus,
  clearSessionBlock,
  type IEmployeeFilter,
  type ICreateEmployeeDto,
  type IUpdateEmployeeDto,
  type IImportPreviewRow,
} from '@/api/employee.api';
import { invalidateResolvedStatuses } from '@/lib/resolvedStatuses';

const EMPLOYEES_KEY = 'employees';

export function useEmployees(filter?: IEmployeeFilter) {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, filter],
    queryFn: () => getEmployees(filter),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, id],
    queryFn: () => getEmployee(id),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateEmployeeDto) => createEmployee(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateEmployeeDto }) =>
      updateEmployee(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { newPassword?: string; isEmail?: boolean } }) =>
      resetEmployeePassword(id, dto),
  });
}

export function useUpdateRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      updateEmployeeRoles(id, roleIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] }),
  });
}

export function useImportPreview() {
  return useMutation({
    mutationFn: (file: File) => importEmployeePreview(file),
  });
}

export function useEmployeeTimezones() {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, 'meta', 'timezones'],
    queryFn: getEmployeeTimezones,
    staleTime: 5 * 60_000,
  });
}

export function useImportConfirm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: IImportPreviewRow[]) => importEmployeeConfirm(rows),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useEmployee2FAStatus(id: string) {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, id, '2fa'],
    queryFn: () => getEmployee2FAStatus(id),
    enabled: !!id,
  });
}

export function useAdminRevoke2FA(staffId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminRevoke2FA(staffId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY, staffId, '2fa'] }),
  });
}

export function useAdminSet2FARequired(staffId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (required: boolean) => adminSet2FARequired(staffId, required),
    onSuccess: () => qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY, staffId, '2fa'] }),
  });
}

export function useEmployeeSessionStatus(id: string) {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, id, 'session-status'],
    queryFn: () => getEmployeeSessionStatus(id),
    enabled: !!id,
  });
}

export function useClearSessionBlock(staffId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clearSessionBlock(staffId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY, staffId, 'session-status'] });
      void qc.invalidateQueries({ queryKey: ['session-blocked-users'] });
      void qc.invalidateQueries({ queryKey: ['system-warnings'] });
    },
  });
}
