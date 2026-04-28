import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPositions,
  getPosition,
  createPosition,
  updatePosition,
  deletePosition,
  type IPaginationParams,
  type ICreatePositionDto,
  type IUpdatePositionDto,
} from '@/api/org.api';

const POSITIONS_KEY = 'positions';

export function usePositions(params?: IPaginationParams & { companyId?: string }) {
  return useQuery({
    queryKey: [POSITIONS_KEY, params],
    queryFn: () => getPositions(params),
  });
}

export function usePosition(id: string) {
  return useQuery({
    queryKey: [POSITIONS_KEY, id],
    queryFn: () => getPosition(id),
    enabled: !!id,
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreatePositionDto) => createPosition(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [POSITIONS_KEY] }),
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdatePositionDto }) =>
      updatePosition(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [POSITIONS_KEY] }),
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePosition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [POSITIONS_KEY] }),
  });
}
