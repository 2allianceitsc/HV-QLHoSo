import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hvAdminApi, type HvRole } from '@/api/hvAdmin.api';

const USERS_KEY = 'hv-admin-users';
const DEPTS_KEY = 'hv-admin-departments';

export function useHvUsers(hvRole?: HvRole) {
  return useQuery({ queryKey: [USERS_KEY, hvRole], queryFn: () => hvAdminApi.listUsers(hvRole) });
}

export function useCreateHvUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hvAdminApi.createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useUpdateHvUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Parameters<typeof hvAdminApi.updateUser>[1] & { id: string }) =>
      hvAdminApi.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useToggleHvUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      hvAdminApi.updateUser(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useDeleteHvUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hvAdminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useResetHvUserPassword() {
  return useMutation({
    mutationFn: (id: string) => hvAdminApi.resetPassword(id),
  });
}

export function useHvDepartments() {
  return useQuery({ queryKey: [DEPTS_KEY], queryFn: () => hvAdminApi.listDepartments() });
}

export function useCreateHvDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => hvAdminApi.createDepartment(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPTS_KEY] }),
  });
}

export function useUpdateHvDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => hvAdminApi.updateDepartment(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPTS_KEY] }),
  });
}

export function useDeleteHvDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hvAdminApi.deleteDepartment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPTS_KEY] }),
  });
}

export function useToggleHvDepartmentDisabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isDisabled }: { id: string; isDisabled: boolean }) =>
      hvAdminApi.toggleDepartmentDisabled(id, isDisabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPTS_KEY] }),
  });
}
