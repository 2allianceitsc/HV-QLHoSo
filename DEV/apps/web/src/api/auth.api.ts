import { apiClient } from '@/lib/axios';
import type { ICurrentUser } from '@/stores/auth.store';

export interface ILoginResponse {
  mustChangePassword?: boolean;
  recoveryKey?: string;
  user?: ICurrentUser;
  // Legacy 2FA (old enrolled users)
  requires2FA?: boolean;
  challengeToken?: string;
  twoFAMethod?: string;
  availableMethods?: string[];
  // New BA flow: redirect to S43
  requires2FASetup?: boolean;
  setupToken?: string;
}

export async function loginApi(data: { username: string; password: string }): Promise<ILoginResponse> {
  const res = await apiClient.post<{ success: boolean; data: ILoginResponse }>('/auth/login', data);
  return res.data.data;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function forgotPasswordApi(email: string): Promise<{ message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });
  return { message: res.data.message };
}

export async function resendForgotPasswordOtpApi(email: string): Promise<{ sent: boolean; cooldownSeconds: number; remainingAttempts: number }> {
  const res = await apiClient.post<{ success: boolean; data: { sent: boolean; cooldownSeconds: number; remainingAttempts: number } }>('/auth/forgot-password/resend-otp', { email });
  return res.data.data;
}

export async function verifyOtpApi(email: string, otp: string): Promise<{ resetToken: string }> {
  const res = await apiClient.post<{ success: boolean; data: { resetToken: string } }>('/auth/verify-otp', {
    email,
    otp,
  });
  return res.data.data;
}

export async function resetPasswordApi(resetToken: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { resetToken, newPassword });
}

export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/change-password', { currentPassword, newPassword });
}

export async function firstTimePasswordApi(recoveryKey: string, newPassword: string): Promise<ILoginResponse> {
  const res = await apiClient.post<{ success: boolean; data: ILoginResponse }>('/auth/first-time-password', {
    recoveryKey,
    newPassword,
  });
  return res.data.data;
}

export async function getMeApi(): Promise<ICurrentUser> {
  const res = await apiClient.get<{ success: boolean; data: ICurrentUser }>('/auth/me');
  return res.data.data;
}

export async function loginWithGoogleApi(idToken: string): Promise<{ user: ICurrentUser }> {
  const res = await apiClient.post<{ success: boolean; data: { user: ICurrentUser } }>('/auth/google', { idToken });
  return res.data.data;
}

// ── 2FA ──────────────────────────────────────────────────────────────────────

export async function get2FAStatusApi(): Promise<{ enabled: boolean; method: string | null }> {
  const res = await apiClient.get<{ success: boolean; data: { enabled: boolean; method: string | null } }>('/auth/2fa/status');
  return res.data.data;
}

export async function setup2FAApi(method: string): Promise<{ method: string; setupToken?: string; qrDataUri?: string; secret?: string; message?: string }> {
  const res = await apiClient.post<{ success: boolean; data: { method: string; setupToken?: string; qrDataUri?: string; secret?: string; message?: string } }>('/auth/2fa/setup', { method });
  return res.data.data;
}

export async function confirm2FASetupApi(code: string, method: string, setupToken?: string): Promise<{ success: boolean; backupCodes?: string[] }> {
  const res = await apiClient.post<{ success: boolean; data: { success: boolean; backupCodes?: string[] } }>('/auth/2fa/setup/confirm', { code, method, setupToken });
  return res.data.data;
}

export async function disable2FAApi(password: string): Promise<void> {
  await apiClient.delete('/auth/2fa', { data: { password } });
}

export async function verify2FAApi(challengeToken: string, code: string): Promise<{ user: ICurrentUser }> {
  const res = await apiClient.post<{ success: boolean; data: { user: ICurrentUser } }>('/auth/2fa/verify', { challengeToken, code });
  return res.data.data;
}

export async function resend2FAOtpApi(challengeToken: string): Promise<void> {
  await apiClient.post('/auth/2fa/resend-otp', { challengeToken });
}

// ── S43: Initial 2FA setup ────────────────────────────────────────────────────

export async function initialSetup2FAApi(setupToken: string): Promise<{
  method: string;
  qrDataUri?: string;
  secret?: string;
  message?: string;
}> {
  const res = await apiClient.post<{ success: boolean; data: { method: string; qrDataUri?: string; secret?: string; message?: string } }>(
    '/auth/2fa/initial-setup', { setupToken },
  );
  return res.data.data;
}

export async function resendInitialSetup2FAOtpApi(setupToken: string): Promise<{
  method: string;
  qrDataUri?: string;
  secret?: string;
  message?: string;
}> {
  const res = await apiClient.post<{ success: boolean; data: { method: string; qrDataUri?: string; secret?: string; message?: string } }>(
    '/auth/2fa/initial-setup', { setupToken },
  );
  return res.data.data;
}

export async function confirmInitialSetup2FAApi(setupToken: string, code: string): Promise<{ user: ICurrentUser }> {
  const res = await apiClient.post<{ success: boolean; data: { user: ICurrentUser } }>(
    '/auth/2fa/initial-setup/confirm', { setupToken, code },
  );
  return res.data.data;
}

// ── S33/S08: 2FA requirement status ──────────────────────────────────────────

export interface ITwoFARequirementStatus {
  isEnabled: boolean;
  isRequired: boolean;
  systemForced: boolean;
}

export async function getRequirementStatusApi(): Promise<ITwoFARequirementStatus> {
  const res = await apiClient.get<{ success: boolean; data: ITwoFARequirementStatus }>('/auth/2fa/requirement-status');
  return res.data.data;
}

// ── S33: Authenticator management ────────────────────────────────────────────

export interface IStaffAuthenticator {
  id: string;
  code: 'Google' | 'Email';
  name: string;
  isEnable: boolean;
  recipient: string | null;
}

export async function getAuthenticatorsApi(): Promise<IStaffAuthenticator[]> {
  const res = await apiClient.get<{ success: boolean; data: IStaffAuthenticator[] }>('/auth/2fa/authenticators');
  return res.data.data;
}

export async function updateAuthenticatorApi(id: string, data: { isEnable?: boolean; recipient?: string }): Promise<IStaffAuthenticator> {
  const res = await apiClient.patch<{ success: boolean; data: IStaffAuthenticator }>(`/auth/2fa/authenticators/${id}`, data);
  return res.data.data;
}

export async function getQrCodeApi(): Promise<{ qrDataUri: string; secret: string }> {
  const res = await apiClient.get<{ success: boolean; data: { qrDataUri: string; secret: string } }>('/auth/2fa/qr');
  return res.data.data;
}

