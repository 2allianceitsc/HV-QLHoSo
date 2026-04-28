import { useQuery } from '@tanstack/react-query';
import {
  getEmployeeDashboard,
  getManagerDashboard,
  getHRDashboard,
  getClientDashboard,
} from '@/api/dashboard.api';

const POLL_INTERVAL = 60_000;

export function useEmployeeDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'employee'],
    queryFn: getEmployeeDashboard,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useManagerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'manager'],
    queryFn: getManagerDashboard,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useHRDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'hr'],
    queryFn: getHRDashboard,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useClientDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'client'],
    queryFn: getClientDashboard,
    refetchInterval: POLL_INTERVAL,
  });
}
