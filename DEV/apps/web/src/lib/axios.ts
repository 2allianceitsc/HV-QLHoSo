import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { queryClient } from '@/lib/queryClient';
import { reportError } from '@/lib/reportError';
import { toast } from '@/hooks/use-toast';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Build a lightweight browser fingerprint — collected once, reused across requests
function buildClientInfo(): string {
  try {
    const nav = window.navigator;
    const screen = window.screen;
    return JSON.stringify({
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: nav.language,
      screen: `${screen.width}x${screen.height}`,
      dpr: window.devicePixelRatio,
      platform: nav.platform,
      cores: nav.hardwareConcurrency ?? null,
      touch: nav.maxTouchPoints ?? 0,
      colorDepth: screen.colorDepth,
    });
  } catch {
    return '{}';
  }
}

const CLIENT_INFO = buildClientInfo();

// Request interceptor — attach client fingerprint
apiClient.interceptors.request.use(
  (config) => {
    config.headers['X-Client-Info'] = CLIENT_INFO;
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(undefined);
    }
  });
  failedQueue = [];
}

// Response interceptor — refresh token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Don't retry auth endpoints to avoid infinite loops.
    // Also exclude 2FA challenge endpoints — the user has no access token during the
    // challenge flow, so a 401 from /auth/2fa/verify means "wrong code", not expired token.
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout') ||
      originalRequest?.url?.includes('/auth/2fa/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Clear auth state and React Query cache — prevents stale data from leaking
        // into the next user session on the same browser tab (BUG-010).
        // ProtectedRoute's <Navigate to="/login"> handles the redirect declaratively.
        useAuthStore.getState().clearUser();
        queryClient.clear();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Report 5xx server errors to backend (logged to DB + Google Chat)
    const status = error.response?.status;

    if (status === 429) {
      const body = error.response?.data as { message?: string } | undefined;
      toast({
        title: 'Too many requests',
        description: body?.message ?? 'Please wait a moment before trying again.',
        variant: 'destructive',
      });
    }

    if (status !== undefined && status >= 500) {
      reportError({
        statusCode: status,
        method: originalRequest?.method?.toUpperCase(),
        apiUrl: originalRequest?.url,
        message: (error.response?.data as { message?: string })?.message ?? error.message,
      });
    }

    // Network errors (CORS, DNS, timeout, Failed to fetch) — error.response is undefined
    if (status === undefined && error.message) {
      reportError({
        method: originalRequest?.method?.toUpperCase(),
        apiUrl: originalRequest?.url,
        message: `Network error: ${error.message}`,
      });
    }

    return Promise.reject(error);
  },
);

export default apiClient;
