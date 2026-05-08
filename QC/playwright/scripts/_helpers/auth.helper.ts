import type { Page } from '@playwright/test';

export const AUTH_FILES = {
  staff:    'QC/.auth/staff.json',
  reviewer: 'QC/.auth/reviewer.json',
  approver: 'QC/.auth/approver.json',
  admin:    'QC/.auth/admin.json',
} as const;

export async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|đăng nhập/i }).click();
}
