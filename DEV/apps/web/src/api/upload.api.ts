import { apiClient } from '@/lib/axios';

type ApiWrap<T> = { success: boolean; data: T };

export interface IUploadResult {
  id: string;
  name: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IAvatarUploadResult {
  avatarKey: string;
  publicUrl: string;
}

export const uploadApi = {
  /**
   * Upload a file to Cloudflare R2 via the server.
   * context: "attachment" | "signed_contract" | "content_image"
   */
  uploadFile: (
    file: File,
    context: 'attachment' | 'signed_contract' | 'content_image',
    submissionId?: string,
  ): Promise<IUploadResult> => {
    const form = new FormData();
    form.append('file', file);
    form.append('context', context);
    if (submissionId) form.append('submissionId', submissionId);
    return apiClient
      .post<ApiWrap<IUploadResult>>('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  /**
   * Upload avatar image for the current user.
   */
  uploadAvatar: (file: File): Promise<IAvatarUploadResult> => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<ApiWrap<IAvatarUploadResult>>('/upload/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  /**
   * Delete an uploaded attachment by id.
   */
  deleteUpload: (id: string): Promise<void> =>
    apiClient.delete(`/upload/${id}`).then(() => undefined),
};
