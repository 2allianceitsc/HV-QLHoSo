export interface IAttendanceReportParams {
  startDate: string;
  endDate: string;
  staffId?: string;
  departmentId?: string;
  clientId?: string;
  statusId?: string;
  groupBy?: 'day' | 'week' | 'month';
  page?: number;
  limit?: number;
  clientTimezone?: string;
}

export interface IAttendanceRow {
  staffId: string;
  employeeId: string;
  firstName: string;
  surname: string;
  department: string | null;
  statusName: string;
  statusColorHex: string | null;
  isBreak: boolean;
  maxDurationSeconds: number | null;
  date: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  overbreakSeconds: number | null;
  notes: string | null;
}
