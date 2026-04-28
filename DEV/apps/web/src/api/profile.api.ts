import { apiClient } from '@/lib/axios';

export interface IWidgetPosition {
  side: 'left' | 'right';
  yOffset: number;
}

export interface IProfile {
  id: string;
  employeeId: string;
  firstName: string;
  middleName: string | null;
  surname: string;
  companyEmailAddress: string | null;
  mobileNumber: string | null;
  dateOfBirth: string | null;
  gender: number | null;
  photoBusiness: string | null;
  photoBirthday: string | null;
  isManager: boolean;
  company: { id: string; name: string };
  department: { id: string; name: string } | null;
  office: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  roles: string[];
  userLogin: {
    username: string;
    email: string;
    isFirstLogin: boolean;
    lastLogin: string | null;
  } | null;
  presentAddress: string | null;
  permanentAddress: string | null;
  personalEmailAddress: string | null;
  cityOfBirth: string | null;
  countryOfBirth: string | null;
  maritalStatus: number | null;
  firstNameOfSpouse: string | null;
  middleNameOfSpouse: string | null;
  surnameOfSpouse: string | null;
  numberOfChildren: number | null;
  emergencyContactFullName: string | null;
  relationshipToYou: string | null;
  emergencyContactAreaCode: string | null;
  emergencyContactNumber: string | null;
  showFloatingWidget: boolean;
  floatingWidgetPosition: IWidgetPosition | null;
}

export interface IUpdateProfileDto {
  firstName?: string;
  middleName?: string;
  surname?: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  gender?: number;
  note?: string;
  presentAddress?: string;
  permanentAddress?: string;
  personalEmailAddress?: string;
  cityOfBirth?: string;
  countryOfBirth?: string;
  maritalStatus?: number;
  firstNameOfSpouse?: string;
  middleNameOfSpouse?: string;
  surnameOfSpouse?: string;
  numberOfChildren?: number;
  emergencyContactFullName?: string;
  relationshipToYou?: string;
  emergencyContactAreaCode?: string;
  emergencyContactNumber?: string;
}

export interface IUpdateWidgetSettingsDto {
  showFloatingWidget?: boolean;
  floatingWidgetPosition?: IWidgetPosition;
}

export async function updateWidgetSettingsApi(
  dto: IUpdateWidgetSettingsDto,
): Promise<{ showFloatingWidget: boolean; floatingWidgetPosition: IWidgetPosition | null }> {
  const res = await apiClient.patch<{
    success: boolean;
    data: { showFloatingWidget: boolean; floatingWidgetPosition: IWidgetPosition | null };
  }>('/profile/widget-settings', dto);
  return res.data.data;
}

export async function getProfileApi(): Promise<IProfile> {
  const res = await apiClient.get<{ success: boolean; data: IProfile }>('/profile');
  return res.data.data;
}

export async function updateProfileApi(dto: IUpdateProfileDto): Promise<IProfile> {
  const res = await apiClient.put<{ success: boolean; data: IProfile }>('/profile', dto);
  return res.data.data;
}

/**
 * Upload avatar via presigned URL flow:
 * 1. Get presigned PUT URL from API
 * 2. PUT file directly to R2 (no auth headers)
 * 3. Confirm URL back to API → updates DB
 */
export async function uploadAvatarApi(file: File): Promise<{ avatarUrl: string }> {
  // Step 1: Get presigned URL
  const presignRes = await apiClient.get<{
    success: boolean;
    data: { uploadUrl: string; publicUrl: string };
  }>(`/profile/avatar/presign?contentType=${encodeURIComponent(file.type)}`);
  const { uploadUrl, publicUrl } = presignRes.data.data;

  // Step 2: Upload directly to R2 (plain fetch, no auth cookies)
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => '');
    throw new Error(`R2 upload failed: ${uploadRes.status} ${uploadRes.statusText}${body ? ` — ${body}` : ''}`);
  }

  // Step 3: Confirm URL → API saves to DB
  const confirmRes = await apiClient.post<{ success: boolean; data: { avatarUrl: string } }>(
    '/profile/avatar/confirm',
    { publicUrl },
  );
  return confirmRes.data.data;
}

/**
 * Upload birthday photo via presigned URL flow (same pattern as avatar).
 */
export async function uploadBirthdayPhotoApi(file: File): Promise<{ photoUrl: string }> {
  const presignRes = await apiClient.get<{
    success: boolean;
    data: { uploadUrl: string; publicUrl: string };
  }>(`/profile/birthday-photo/presign?contentType=${encodeURIComponent(file.type)}`);
  const { uploadUrl, publicUrl } = presignRes.data.data;

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => '');
    throw new Error(`R2 upload failed: ${uploadRes.status} ${uploadRes.statusText}${body ? ` — ${body}` : ''}`);
  }

  const confirmRes = await apiClient.post<{ success: boolean; data: { photoUrl: string } }>(
    '/profile/birthday-photo/confirm',
    { publicUrl },
  );
  return confirmRes.data.data;
}
