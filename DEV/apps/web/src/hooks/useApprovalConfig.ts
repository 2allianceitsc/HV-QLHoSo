import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalConfigApi } from '@/api/approvalConfig.api';

const KEY = 'approval-config';

export function useApprovalConfigs() {
  return useQuery({ queryKey: [KEY], queryFn: () => approvalConfigApi.list() });
}

export function useApprovalConfigReviewers() {
  return useQuery({ queryKey: [KEY, 'reviewers'], queryFn: () => approvalConfigApi.listReviewers() });
}

export function useApprovalConfigApprovers() {
  return useQuery({ queryKey: [KEY, 'approvers'], queryFn: () => approvalConfigApi.listApprovers() });
}

export function useUpsertApprovalConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, ...data }: { departmentId: string; reviewerId: string; approverId: string }) =>
      approvalConfigApi.upsert(departmentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
