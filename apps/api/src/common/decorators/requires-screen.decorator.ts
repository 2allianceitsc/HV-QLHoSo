import { SetMetadata } from '@nestjs/common';

export const REQUIRES_SCREEN_KEY = 'requiresScreen';

export interface RequiresScreenMetadata {
  /** Screen code as catalogued in the Screen table (e.g. 'E04', 'SY01'). */
  screen: string;
  /** Tab code within the screen. Omitted → whole-screen rule. */
  tab?: string;
  /** Permission action code. Defaults to 'VIEW'. */
  permission?: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'APPROVE';
}

/**
 * Declare that an endpoint is gated by the screen/tab permission matrix.
 *
 * Phase 2: runs in shadow mode alongside @Roles(...) — evaluates the new
 * guard's decision, logs any mismatch with the legacy guard's verdict, but
 * does NOT enforce rejection until Phase 3.
 *
 * ```ts
 * @RequiresScreen('E04', { tab: 'roles', permission: 'VIEW' })
 * @Get('employees/:id/roles')
 * getRoles() { ... }
 * ```
 */
export const RequiresScreen = (
  screen: string,
  options?: Omit<RequiresScreenMetadata, 'screen'>,
) =>
  SetMetadata<string, RequiresScreenMetadata>(REQUIRES_SCREEN_KEY, {
    screen,
    tab: options?.tab,
    permission: options?.permission ?? 'VIEW',
  });
