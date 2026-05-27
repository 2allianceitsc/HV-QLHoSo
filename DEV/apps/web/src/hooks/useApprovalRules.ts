import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approvalRulesApi,
  type ICreateRuleDetailInput,
  type ICreateRuleInput,
  type IUpdateRuleDetailInput,
  type IUpdateRuleInput,
  type SubmissionType,
} from '@/api/approvalRules.api';

const KEY = 'approval-rules';

export function useApprovalRulesList(submissionType: SubmissionType, costCodeId?: string) {
  return useQuery({
    queryKey: [KEY, submissionType, costCodeId ?? null],
    queryFn: () => approvalRulesApi.list(submissionType, costCodeId),
  });
}

export function useApprovalRulesMatrix() {
  return useQuery({ queryKey: [KEY, 'matrix'], queryFn: () => approvalRulesApi.matrix() });
}

export function useApprovalRule(id: string | null | undefined) {
  return useQuery({
    queryKey: [KEY, 'one', id],
    queryFn: () => approvalRulesApi.getOne(id!),
    enabled: !!id,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ICreateRuleInput) => approvalRulesApi.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateRuleInput }) =>
      approvalRulesApi.update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvalRulesApi.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useAddRuleDetail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: ICreateRuleDetailInput }) =>
      approvalRulesApi.addDetail(ruleId, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateRuleDetail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateRuleDetailInput }) =>
      approvalRulesApi.updateDetail(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteRuleDetail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvalRulesApi.removeDetail(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function usePreviewApproval() {
  return useMutation({
    mutationFn: (input: { submissionType: SubmissionType; costCodeId?: string; total?: number }) =>
      approvalRulesApi.preview(input),
  });
}
