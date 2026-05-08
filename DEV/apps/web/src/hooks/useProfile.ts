import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProfileApi,
  updateProfileApi,
  updateWidgetSettingsApi,
  uploadBirthdayPhotoApi,
  type IUpdateProfileDto,
  type IUpdateWidgetSettingsDto,
} from '@/api/profile.api';
import { uploadApi } from '@/api/upload.api';
import { useAuthStore } from '@/stores/auth.store';

const PROFILE_KEY = 'profile';

export function useProfile() {
  return useQuery({
    queryKey: [PROFILE_KEY],
    queryFn: getProfileApi,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (dto: IUpdateProfileDto) => updateProfileApi(dto),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: [PROFILE_KEY] });
      // Update auth store with new full name
      if (user) {
        const fullName = [data.firstName, data.middleName, data.surname]
          .filter(Boolean)
          .join(' ');
        setUser({ ...user, fullName });
      }
    },
  });
}

export function useUpdateWidgetSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: IUpdateWidgetSettingsDto) => updateWidgetSettingsApi(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PROFILE_KEY] });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (file: File) => uploadApi.uploadAvatar(file),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: [PROFILE_KEY] });
      // Update auth store with new avatar public URL
      if (user) {
        setUser({ ...user, photoBusiness: data.publicUrl });
      }
    },
  });
}

export function useUploadBirthdayPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadBirthdayPhotoApi(file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PROFILE_KEY] });
    },
  });
}
