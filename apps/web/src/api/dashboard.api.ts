import { apiClient } from '@/lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IStatusInfo {
  name: string;
  colorHex: string | null;
  isBreak?: boolean;
  maxDurationSeconds?: number | null;
}

export interface IEmployeeDashboard {
  currentRecord: {
    id: string;
    status: IStatusInfo;
    startTime: string;
  } | null;
  staff: {
    firstName: string;
    surname: string;
    shiftStartTime: string | null;
    shiftEndTime: string | null;
    latestEndShiftTime: string | null;
  };
  todayWorkedSeconds: number;
}

export interface IManagerMember {
  staffId: string;
  firstName: string;
  surname: string;
  employeeId: string;
  currentStatus: { name: string; colorHex: string | null } | null;
  elapsedSeconds: number | null;
}

export interface IManagerDashboard {
  teamId: string;
  teamName: string;
  total: number;
  working: number;
  onBreak: number;
  absent: number;
  members: IManagerMember[];
}

export interface IDeptStats {
  departmentName: string;
  total: number;
  working: number;
  onBreak: number;
  absent: number;
}

export interface IHrDashboard {
  date: string;
  totalStaff: number;
  working: number;
  onBreak: number;
  absent: number;
  offline: number;
  byDepartment: IDeptStats[];
  disabledManagersCount?: number;
}

export interface IClientStaffItem {
  staffId: string;
  firstName: string;
  surname: string;
  employeeId: string;
  currentStatus: { name: string; colorHex: string | null } | null;
  department: string | null;
}

export interface IClientDashboard {
  client: { name: string; code: string | null };
  assignedStaff: IClientStaffItem[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function wrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export async function getEmployeeDashboard(): Promise<IEmployeeDashboard> {
  return wrap(apiClient.get('/dashboard/employee'));
}

export async function getManagerDashboard(): Promise<IManagerDashboard> {
  return wrap(apiClient.get('/dashboard/manager'));
}

export async function getHRDashboard(): Promise<IHrDashboard> {
  return wrap(apiClient.get('/dashboard/hr'));
}

export async function getClientDashboard(): Promise<IClientDashboard> {
  return wrap(apiClient.get('/dashboard/client'));
}
