import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientDepartments,
  createClientDepartment,
  updateClientDepartment,
  deleteClientDepartment,
  getClientProjects,
  createClientProject,
  updateClientProject,
  deleteClientProject,
  getClientContacts,
  createClientContact,
  updateClientContact,
  deleteClientContact,
  getClientEmployees,
  assignClientEmployee,
  updateClientEmployee,
  unassignClientEmployee,
  type ICreateClientDto,
  type IUpdateClientDto,
  type ICreateClientDepartmentDto,
  type IUpdateClientDepartmentDto,
  type ICreateClientProjectDto,
  type IUpdateClientProjectDto,
  type ICreateClientContactDto,
  type IUpdateClientContactDto,
  type IAssignStaffDto,
  type IUpdateAssignStaffDto,
} from '@/api/client.api';
import type { IPaginationParams } from '@/api/org.api';
import { invalidateResolvedStatuses } from '@/lib/resolvedStatuses';

const CLIENTS_KEY = 'clients';

// ── Client CRUD ───────────────────────────────────────────────────────────────

export function useClients(params?: IPaginationParams) {
  return useQuery({
    queryKey: [CLIENTS_KEY, params],
    queryFn: () => getClients(params),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [CLIENTS_KEY, id],
    queryFn: () => getClient(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateClientDto) => createClient(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLIENTS_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateClientDto }) => updateClient(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLIENTS_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLIENTS_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

// ── Departments ───────────────────────────────────────────────────────────────

export function useClientDepartments(clientId: string) {
  return useQuery({
    queryKey: [CLIENTS_KEY, clientId, 'departments'],
    queryFn: () => getClientDepartments(clientId),
    enabled: !!clientId,
  });
}

export function useCreateClientDepartment(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateClientDepartmentDto) => createClientDepartment(clientId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'departments'] }),
  });
}

export function useUpdateClientDepartment(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, dto }: { deptId: string; dto: IUpdateClientDepartmentDto }) =>
      updateClientDepartment(clientId, deptId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'departments'] }),
  });
}

export function useDeleteClientDepartment(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deptId: string) => deleteClientDepartment(clientId, deptId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'departments'] }),
  });
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function useClientProjects(clientId: string) {
  return useQuery({
    queryKey: [CLIENTS_KEY, clientId, 'projects'],
    queryFn: () => getClientProjects(clientId),
    enabled: !!clientId,
  });
}

export function useCreateClientProject(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateClientProjectDto) => createClientProject(clientId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'projects'] }),
  });
}

export function useUpdateClientProject(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projId, dto }: { projId: string; dto: IUpdateClientProjectDto }) =>
      updateClientProject(clientId, projId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'projects'] }),
  });
}

export function useDeleteClientProject(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projId: string) => deleteClientProject(clientId, projId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'projects'] }),
  });
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export function useClientContacts(clientId: string) {
  return useQuery({
    queryKey: [CLIENTS_KEY, clientId, 'contacts'],
    queryFn: () => getClientContacts(clientId),
    enabled: !!clientId,
  });
}

export function useCreateClientContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateClientContactDto) => createClientContact(clientId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'contacts'] }),
  });
}

export function useUpdateClientContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, dto }: { contactId: string; dto: IUpdateClientContactDto }) =>
      updateClientContact(clientId, contactId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'contacts'] }),
  });
}

export function useDeleteClientContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => deleteClientContact(clientId, contactId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'contacts'] }),
  });
}

// ── Employees ─────────────────────────────────────────────────────────────────

export function useClientEmployees(clientId: string) {
  return useQuery({
    queryKey: [CLIENTS_KEY, clientId, 'employees'],
    queryFn: () => getClientEmployees(clientId),
    enabled: !!clientId,
  });
}

export function useAssignClientEmployee(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: IAssignStaffDto) => assignClientEmployee(clientId, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'employees'] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useUpdateClientEmployee(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, dto }: { staffId: string; dto: IUpdateAssignStaffDto }) =>
      updateClientEmployee(clientId, staffId, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'employees'] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useUnassignClientEmployee(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) => unassignClientEmployee(clientId, staffId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId, 'employees'] });
      invalidateResolvedStatuses(qc);
    },
  });
}
