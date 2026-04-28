import { apiClient } from '@/lib/axios';
import type { IPaginationParams, IListResponse } from './org.api';
import { safeArray } from '@/lib/safeArray';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IClient {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  colorHex: string | null;
  iconId: string | null;
  timezone: string | null;
  country: string | null;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
  logCreatedAt: string;
  logUpdatedAt: string;
  _count?: {
    clientStaff: number;
    departments: number;
    projects: number;
    contacts: number;
  };
}

export interface ICreateClientDto {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  colorHex?: string;
  iconId?: string;
  timezone?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  country?: string;
}

export type IUpdateClientDto = Partial<ICreateClientDto>;

export interface IClientDepartment {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  logCreatedAt: string;
  logUpdatedAt: string;
}

export interface ICreateClientDepartmentDto {
  name: string;
  code?: string;
}

export type IUpdateClientDepartmentDto = Partial<ICreateClientDepartmentDto>;

export interface IClientProject {
  id: string;
  clientId: string;
  departmentId: string | null;
  name: string;
  code: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  logCreatedAt: string;
  department?: { id: string; name: string } | null;
}

export interface ICreateClientProjectDto {
  name: string;
  code?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export type IUpdateClientProjectDto = Partial<ICreateClientProjectDto>;

export interface IClientContact {
  id: string;
  clientId: string;
  firstName: string;
  surname: string;
  emailAddress: string | null;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  streetAddress: string | null;
  suburb: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postcodeZipcode: string | null;
  logCreatedAt: string;
}

export interface ICreateClientContactDto {
  firstName: string;
  surname: string;
  emailAddress?: string;
  mobileCountryCode?: string;
  mobileNumber?: string;
  streetAddress?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postcodeZipcode?: string;
}

export type IUpdateClientContactDto = Partial<ICreateClientContactDto>;

export interface IClientStaff {
  id: string;
  staffId: string;
  clientId: string;
  clientDepartmentId: string | null;
  startDate: string | null;
  endDate: string | null;
  isPrimary: boolean;
  staff: {
    id: string;
    employeeId: string;
    firstName: string;
    surname: string;
    companyEmailAddress: string | null;
    userLogin: { email: string } | null;
  };
  clientDepartment: { id: string; name: string } | null;
}

export interface IAssignStaffDto {
  staffId: string;
  clientDepartmentId?: string;
  startDate?: string;
  endDate?: string;
  isPrimary?: boolean;
}

export interface IUpdateAssignStaffDto {
  clientDepartmentId?: string;
  startDate?: string;
  endDate?: string;
  isPrimary?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function wrap<T>(promise: Promise<{ data: { success: boolean; data: T } }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

async function wrapList<T>(
  promise: Promise<{ data: { success: boolean; data: IListResponse<T> } }>,
): Promise<IListResponse<T>> {
  const res = await promise;
  return res.data.data;
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function getClients(params?: IPaginationParams): Promise<IListResponse<IClient>> {
  return wrapList(apiClient.get('/clients', { params }));
}

export async function getClient(id: string): Promise<IClient> {
  return wrap(apiClient.get(`/clients/${id}`));
}

export async function createClient(dto: ICreateClientDto): Promise<IClient> {
  return wrap(apiClient.post('/clients', dto));
}

export async function updateClient(id: string, dto: IUpdateClientDto): Promise<IClient> {
  return wrap(apiClient.put(`/clients/${id}`, dto));
}

export async function deleteClient(id: string): Promise<IClient> {
  return wrap(apiClient.delete(`/clients/${id}`));
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function getClientDepartments(clientId: string): Promise<IClientDepartment[]> {
  const res = await apiClient.get<{ success: boolean; data: IClientDepartment[] }>(`/clients/${clientId}/departments`);
  return safeArray(res.data.data);
}

export async function createClientDepartment(
  clientId: string,
  dto: ICreateClientDepartmentDto,
): Promise<IClientDepartment> {
  return wrap(apiClient.post(`/clients/${clientId}/departments`, dto));
}

export async function updateClientDepartment(
  clientId: string,
  deptId: string,
  dto: IUpdateClientDepartmentDto,
): Promise<IClientDepartment> {
  return wrap(apiClient.put(`/clients/${clientId}/departments/${deptId}`, dto));
}

export async function deleteClientDepartment(
  clientId: string,
  deptId: string,
): Promise<IClientDepartment> {
  return wrap(apiClient.delete(`/clients/${clientId}/departments/${deptId}`));
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getClientProjects(clientId: string): Promise<IClientProject[]> {
  const res = await apiClient.get<{ success: boolean; data: IClientProject[] }>(`/clients/${clientId}/projects`);
  return safeArray(res.data.data);
}

export async function createClientProject(
  clientId: string,
  dto: ICreateClientProjectDto,
): Promise<IClientProject> {
  return wrap(apiClient.post(`/clients/${clientId}/projects`, dto));
}

export async function updateClientProject(
  clientId: string,
  projId: string,
  dto: IUpdateClientProjectDto,
): Promise<IClientProject> {
  return wrap(apiClient.put(`/clients/${clientId}/projects/${projId}`, dto));
}

export async function deleteClientProject(
  clientId: string,
  projId: string,
): Promise<IClientProject> {
  return wrap(apiClient.delete(`/clients/${clientId}/projects/${projId}`));
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getClientContacts(clientId: string): Promise<IClientContact[]> {
  const res = await apiClient.get<{ success: boolean; data: IClientContact[] }>(`/clients/${clientId}/contacts`);
  return safeArray(res.data.data);
}

export async function createClientContact(
  clientId: string,
  dto: ICreateClientContactDto,
): Promise<IClientContact> {
  return wrap(apiClient.post(`/clients/${clientId}/contacts`, dto));
}

export async function updateClientContact(
  clientId: string,
  contactId: string,
  dto: IUpdateClientContactDto,
): Promise<IClientContact> {
  return wrap(apiClient.put(`/clients/${clientId}/contacts/${contactId}`, dto));
}

export async function deleteClientContact(
  clientId: string,
  contactId: string,
): Promise<IClientContact> {
  return wrap(apiClient.delete(`/clients/${clientId}/contacts/${contactId}`));
}

// ── Employees ─────────────────────────────────────────────────────────────────

export async function getClientEmployees(clientId: string): Promise<IClientStaff[]> {
  const res = await apiClient.get<{ success: boolean; data: IClientStaff[] }>(`/clients/${clientId}/employees`);
  return safeArray(res.data.data);
}

export async function assignClientEmployee(
  clientId: string,
  dto: IAssignStaffDto,
): Promise<IClientStaff> {
  return wrap(apiClient.post(`/clients/${clientId}/employees`, dto));
}

export async function updateClientEmployee(
  clientId: string,
  staffId: string,
  dto: IUpdateAssignStaffDto,
): Promise<IClientStaff> {
  return wrap(apiClient.put(`/clients/${clientId}/employees/${staffId}`, dto));
}

export async function unassignClientEmployee(
  clientId: string,
  staffId: string,
): Promise<IClientStaff> {
  return wrap(apiClient.delete(`/clients/${clientId}/employees/${staffId}`));
}
