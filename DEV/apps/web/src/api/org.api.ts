import { apiClient } from '@/lib/axios';

// ── Shared types ─────────────────────────────────────────────────────────────

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IListResponse<T> {
  data: T[];
  pagination: IPagination;
}

export interface IPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

// ── Company ───────────────────────────────────────────────────────────────────

export interface ICompany {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  taxCode?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  website?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
  defaultTimezone?: string | null;
  logCreatedAt: string;
  logUpdatedAt: string;
}

export interface ICreateCompanyDto {
  companyName: string;
  companyCode?: string;
  companyAddress?: string;
  companyTinNumber?: string;
  companyLogoUrl?: string;
  companyPhone?: string;
  companyWebsite?: string;
  colorHex?: string;
  iconId?: string;
  defaultTimezone?: string;
  companyContactFirstName?: string;
  companyContactSurname?: string;
  companyContactEmailAddress?: string;
  companyContactMobile?: string;
}

export type IUpdateCompanyDto = Partial<ICreateCompanyDto>;

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

export async function getCompanies(params?: IPaginationParams): Promise<IListResponse<ICompany>> {
  return wrapList(apiClient.get('/companies', { params }));
}

export async function getCompany(id: string): Promise<ICompany> {
  return wrap(apiClient.get(`/companies/${id}`));
}

export async function createCompany(dto: ICreateCompanyDto): Promise<ICompany> {
  return wrap(apiClient.post('/companies', dto));
}

export async function updateCompany(id: string, dto: IUpdateCompanyDto): Promise<ICompany> {
  return wrap(apiClient.put(`/companies/${id}`, dto));
}

export async function deleteCompany(id: string): Promise<ICompany> {
  return wrap(apiClient.delete(`/companies/${id}`));
}

// ── Department ────────────────────────────────────────────────────────────────

export interface IDepartment {
  id: string;
  code?: string | null;
  name: string;
  companyId: string;
  note?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
  orderNo?: number;
  logCreatedAt: string;
  logUpdatedAt: string;
  company?: { id: string; name: string };
}

export interface ICreateDepartmentDto {
  departmentCode: string;
  departmentName: string;
  companyId: string;
  description?: string;
  headOfDepartmentId?: string;
  colorHex?: string;
  iconId?: string;
  orderNo?: number;
}

export type IUpdateDepartmentDto = Partial<ICreateDepartmentDto>;

export async function getDepartments(
  params?: IPaginationParams & { companyId?: string },
): Promise<IListResponse<IDepartment>> {
  return wrapList(apiClient.get('/departments', { params }));
}

export async function getDepartment(id: string): Promise<IDepartment> {
  return wrap(apiClient.get(`/departments/${id}`));
}

export async function createDepartment(dto: ICreateDepartmentDto): Promise<IDepartment> {
  return wrap(apiClient.post('/departments', dto));
}

export async function updateDepartment(id: string, dto: IUpdateDepartmentDto): Promise<IDepartment> {
  return wrap(apiClient.put(`/departments/${id}`, dto));
}

export async function deleteDepartment(id: string): Promise<IDepartment> {
  return wrap(apiClient.delete(`/departments/${id}`));
}

// ── Office ────────────────────────────────────────────────────────────────────

export interface IOffice {
  id: string;
  code?: string | null;
  name: string;
  companyId: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
  orderNo?: number;
  logCreatedAt: string;
  logUpdatedAt: string;
  company?: { id: string; name: string };
}

export interface ICreateOfficeDto {
  officeCode: string;
  officeName: string;
  companyId: string;
  officeAddress?: string;
  city?: string;
  country?: string;
  timezone?: string;
  officeContactEmail?: string;
  officeContactMobile?: string;
  colorHex?: string;
  iconId?: string;
  orderNo?: number;
}

export type IUpdateOfficeDto = Partial<ICreateOfficeDto>;

export async function getOffices(
  params?: IPaginationParams & { companyId?: string },
): Promise<IListResponse<IOffice>> {
  return wrapList(apiClient.get('/offices', { params }));
}

export async function getOffice(id: string): Promise<IOffice> {
  return wrap(apiClient.get(`/offices/${id}`));
}

export async function createOffice(dto: ICreateOfficeDto): Promise<IOffice> {
  return wrap(apiClient.post('/offices', dto));
}

export async function updateOffice(id: string, dto: IUpdateOfficeDto): Promise<IOffice> {
  return wrap(apiClient.put(`/offices/${id}`, dto));
}

export async function deleteOffice(id: string): Promise<IOffice> {
  return wrap(apiClient.delete(`/offices/${id}`));
}

// ── Position ──────────────────────────────────────────────────────────────────

export interface IPosition {
  id: string;
  code?: string | null;
  name: string;
  companyId: string;
  note?: string | null;
  level?: number | null;
  colorHex?: string | null;
  iconId?: string | null;
  orderNo?: number;
  logCreatedAt: string;
  logUpdatedAt: string;
  company?: { id: string; name: string };
}

export interface ICreatePositionDto {
  positionCode: string;
  positionName: string;
  companyId: string;
  description?: string;
  level?: number;
  colorHex?: string;
  iconId?: string;
  orderNo?: number;
}

export type IUpdatePositionDto = Partial<ICreatePositionDto>;

export async function getPositions(
  params?: IPaginationParams & { companyId?: string },
): Promise<IListResponse<IPosition>> {
  return wrapList(apiClient.get('/positions', { params }));
}

export async function getPosition(id: string): Promise<IPosition> {
  return wrap(apiClient.get(`/positions/${id}`));
}

export async function createPosition(dto: ICreatePositionDto): Promise<IPosition> {
  return wrap(apiClient.post('/positions', dto));
}

export async function updatePosition(id: string, dto: IUpdatePositionDto): Promise<IPosition> {
  return wrap(apiClient.put(`/positions/${id}`, dto));
}

export async function deletePosition(id: string): Promise<IPosition> {
  return wrap(apiClient.delete(`/positions/${id}`));
}

// ── Team ──────────────────────────────────────────────────────────────────────

export interface ITeam {
  id: string;
  code?: string | null;
  name: string;
  companyId: string;
  clientId?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
  orderNo?: number;
  logCreatedAt: string;
  logUpdatedAt: string;
  company?: { id: string; name: string } | null;
  client?:  { id: string; name: string } | null;
  _count?:  { managers: number; staff: number };
}

export interface ICreateTeamDto {
  teamName: string;
  companyId: string;
  teamCode?: string;
  clientId?: string;
  colorHex?: string;
  iconId?: string;
  orderNo?: number;
}

export type IUpdateTeamDto = Partial<ICreateTeamDto>;

export async function getTeams(
  params?: IPaginationParams & { companyId?: string },
): Promise<IListResponse<ITeam>> {
  return wrapList(apiClient.get('/teams', { params }));
}

export async function getTeam(id: string): Promise<ITeam> {
  return wrap(apiClient.get(`/teams/${id}`));
}

export async function createTeam(dto: ICreateTeamDto): Promise<ITeam> {
  return wrap(apiClient.post('/teams', dto));
}

export async function updateTeam(id: string, dto: IUpdateTeamDto): Promise<ITeam> {
  return wrap(apiClient.put(`/teams/${id}`, dto));
}

export async function deleteTeam(id: string): Promise<ITeam> {
  return wrap(apiClient.delete(`/teams/${id}`));
}

// ── CompanyContact ────────────────────────────────────────────────────────────

export interface ICompanyContact {
  id: string;
  companyId: string;
  firstName: string;
  surname: string;
  emailAddress: string | null;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  landlineCountryCode: string | null;
  landlineAreaCode: string | null;
  landlineNumber: string | null;
  streetAddress: string | null;
  suburb: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postcode: string | null;
  logCreatedAt: string;
  logUpdatedAt: string;
}

export interface ICreateCompanyContactDto {
  firstName: string;
  surname: string;
  emailAddress?: string;
  mobileCountryCode?: string;
  mobileNumber?: string;
  landlineCountryCode?: string;
  landlineAreaCode?: string;
  landlineNumber?: string;
  streetAddress?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export type IUpdateCompanyContactDto = Partial<ICreateCompanyContactDto>;

export async function getCompanyContacts(companyId: string): Promise<ICompanyContact[]> {
  const res = await apiClient.get<{ success: boolean; data: ICompanyContact[] }>(
    `/companies/${companyId}/contacts`,
  );
  return res.data.data;
}

export async function createCompanyContact(
  companyId: string,
  dto: ICreateCompanyContactDto,
): Promise<ICompanyContact> {
  return wrap(apiClient.post(`/companies/${companyId}/contacts`, dto));
}

export async function updateCompanyContact(
  companyId: string,
  contactId: string,
  dto: IUpdateCompanyContactDto,
): Promise<ICompanyContact> {
  return wrap(apiClient.put(`/companies/${companyId}/contacts/${contactId}`, dto));
}

export async function deleteCompanyContact(
  companyId: string,
  contactId: string,
): Promise<void> {
  await apiClient.delete(`/companies/${companyId}/contacts/${contactId}`);
}

// ── Manager types ─────────────────────────────────────────────────────────────

export interface IManagerStaff {
  id: string;
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  photoBusiness?: string | null;
  email?: string | null;
  position?: { id: string; name: string } | null;
}

// ── Company managers ──────────────────────────────────────────────────────────

export async function getCompanyManagers(id: string): Promise<IManagerStaff[]> {
  const res = await apiClient.get<{ success: boolean; data: IManagerStaff[] }>(`/companies/${id}/managers`);
  return res.data.data;
}

export async function addCompanyManager(id: string, staffId: string): Promise<void> {
  await apiClient.post(`/companies/${id}/managers/${staffId}`);
}

export async function removeCompanyManager(id: string, staffId: string): Promise<void> {
  await apiClient.delete(`/companies/${id}/managers/${staffId}`);
}

export async function replaceCompanyManagers(id: string, staffIds: string[]): Promise<IManagerStaff[]> {
  return wrap(apiClient.put(`/companies/${id}/managers`, { staffIds }));
}

export async function getCompanyEmployees(id: string, params?: IPaginationParams): Promise<IListResponse<import('@/api/employee.api').IEmployee>> {
  return wrapList(apiClient.get(`/companies/${id}/employees`, { params }));
}

// ── Department managers ───────────────────────────────────────────────────────

export async function getDepartmentManagers(id: string): Promise<IManagerStaff[]> {
  const res = await apiClient.get<{ success: boolean; data: IManagerStaff[] }>(`/departments/${id}/managers`);
  return res.data.data;
}

export async function addDepartmentManager(id: string, staffId: string): Promise<void> {
  await apiClient.post(`/departments/${id}/managers/${staffId}`);
}

export async function removeDepartmentManager(id: string, staffId: string): Promise<void> {
  await apiClient.delete(`/departments/${id}/managers/${staffId}`);
}

export async function replaceDepartmentManagers(id: string, staffIds: string[]): Promise<IManagerStaff[]> {
  return wrap(apiClient.put(`/departments/${id}/managers`, { staffIds }));
}

export async function getDepartmentEmployees(id: string, params?: IPaginationParams): Promise<IListResponse<import('@/api/employee.api').IEmployee>> {
  return wrapList(apiClient.get(`/departments/${id}/employees`, { params }));
}

// ── Office managers ───────────────────────────────────────────────────────────

export async function getOfficeManagers(id: string): Promise<IManagerStaff[]> {
  const res = await apiClient.get<{ success: boolean; data: IManagerStaff[] }>(`/offices/${id}/managers`);
  return res.data.data;
}

export async function addOfficeManager(id: string, staffId: string): Promise<void> {
  await apiClient.post(`/offices/${id}/managers/${staffId}`);
}

export async function removeOfficeManager(id: string, staffId: string): Promise<void> {
  await apiClient.delete(`/offices/${id}/managers/${staffId}`);
}

export async function replaceOfficeManagers(id: string, staffIds: string[]): Promise<IManagerStaff[]> {
  return wrap(apiClient.put(`/offices/${id}/managers`, { staffIds }));
}

export async function getOfficeEmployees(id: string, params?: IPaginationParams): Promise<IListResponse<import('@/api/employee.api').IEmployee>> {
  return wrapList(apiClient.get(`/offices/${id}/employees`, { params }));
}

// ── Team managers ─────────────────────────────────────────────────────────────

export async function getTeamManagers(id: string): Promise<IManagerStaff[]> {
  const res = await apiClient.get<{ success: boolean; data: IManagerStaff[] }>(`/teams/${id}/managers`);
  return res.data.data;
}

export async function addTeamManager(id: string, staffId: string): Promise<void> {
  await apiClient.post(`/teams/${id}/managers/${staffId}`);
}

export async function removeTeamManager(id: string, staffId: string): Promise<void> {
  await apiClient.delete(`/teams/${id}/managers/${staffId}`);
}

export async function replaceTeamManagers(id: string, staffIds: string[]): Promise<IManagerStaff[]> {
  return wrap(apiClient.put(`/teams/${id}/managers`, { staffIds }));
}

export async function getTeamEmployees(id: string, params?: IPaginationParams): Promise<IListResponse<import('@/api/employee.api').IEmployee>> {
  return wrapList(apiClient.get(`/teams/${id}/employees`, { params }));
}
