import type { QueryClient } from '@tanstack/react-query';

export const RESOLVED_STATUSES_QUERY_KEY = ['statuses'] as const;

export function invalidateResolvedStatuses(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: RESOLVED_STATUSES_QUERY_KEY });
}