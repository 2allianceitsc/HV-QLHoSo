import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionApi, type IListSubmissionsParams, type ICreateSubmissionInput } from '@/api/submission.api';

const KEY = 'submissions';

export function useSubmissionDepartments() {
  return useQuery({ queryKey: [KEY, 'departments'], queryFn: () => submissionApi.listDepartments() });
}

export function useSubmissions(params?: IListSubmissionsParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => submissionApi.list(params),
  });
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => submissionApi.get(id),
    enabled: !!id,
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ICreateSubmissionInput) => submissionApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateSubmission(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ICreateSubmissionInput>) => submissionApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: [KEY, id] }); },
  });
}

export function useDeleteSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submissionApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useSubmitSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submissionApi.submit(id),
    onSuccess: (_d, id) => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: [KEY, id] }); },
  });
}

export function useReviewSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submissionApi.review(id),
    onSuccess: (_d, id) => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: [KEY, id] }); },
  });
}

export function useApproveSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submissionApi.approve(id),
    onSuccess: (_d, id) => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: [KEY, id] }); },
  });
}

export function useRejectSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => submissionApi.reject(id, reason),
    onSuccess: (_d, { id }) => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: [KEY, id] }); },
  });
}
