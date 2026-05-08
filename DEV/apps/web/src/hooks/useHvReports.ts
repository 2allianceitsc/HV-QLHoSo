import { useQuery } from '@tanstack/react-query';
import { hvReportsApi } from '@/api/hvReports.api';

export function useReportSummary(params?: { year?: number; month?: number }) {
  return useQuery({
    queryKey: ['reports-summary', params],
    queryFn: () => hvReportsApi.summary(params),
  });
}

export function useReportContracts(params?: {
  q?: string;
  contractStatus?: string;
  contractEndDateFrom?: string;
  contractEndDateTo?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['reports-contracts', params],
    queryFn: () => hvReportsApi.contracts(params),
  });
}

export function useReportExpenses(params?: {
  fromDate?: string; toDate?: string; department?: string;
  costCode?: string; supplier?: string; page?: number; limit?: number;
}) {
  return useQuery({
    queryKey: ['reports-expenses', params],
    queryFn: () => hvReportsApi.expenses(params),
  });
}
