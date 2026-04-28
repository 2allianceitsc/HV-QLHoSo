import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  type IPaginationParams,
  type ICreateTeamDto,
  type IUpdateTeamDto,
} from '@/api/org.api';
import { invalidateResolvedStatuses } from '@/lib/resolvedStatuses';

const TEAMS_KEY = 'teams';

export function useTeams(params?: IPaginationParams & { companyId?: string }) {
  return useQuery({
    queryKey: [TEAMS_KEY, params],
    queryFn: () => getTeams(params),
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: [TEAMS_KEY, id],
    queryFn: () => getTeam(id),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateTeamDto) => createTeam(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TEAMS_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateTeamDto }) => updateTeam(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TEAMS_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TEAMS_KEY] });
      invalidateResolvedStatuses(qc);
    },
  });
}
