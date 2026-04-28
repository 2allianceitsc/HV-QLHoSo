# Business Modules — What to Strip vs. Keep

This project was bootstrapped from Vibe365 (HR/attendance system). The full framework was copied so the codebase compiles and runs out-of-the-box. Below is a guide to what is **HR-business-specific** vs. **reusable framework**.

> **Why not strip immediately?** Vibe365's HR business is deeply coupled with auth (login creates a TimeTracking row), settings, integrity checks, and warnings. Pulling them out cleanly requires editing ~10 files and refactoring `auth.service.ts`. Faster path: keep them, ignore them, and remove later when the document approval workflow lands.

## Definitely HR-business — strip when building doc approval workflow

### Backend (`apps/api/src/`)
| Module | What it does | Coupling |
|--------|--------------|----------|
| `attendance/` | Clock in/out, time tracking state machine | `auth.service.ts` calls `createLoginTimeTracking` on login — must stub out first |
| `dashboard/` | HR attendance dashboard aggregations | Standalone — safe to delete |
| `reports/` | HR reports (attendance, mood, etc.) | Standalone — safe to delete |
| `client/` | Business-client management (HR consulting context) | Referenced by `system/integrity` raw SQL |
| `status/` + `system/statuses/` | Staff status definitions (Working / Break / Meeting / …) | Referenced by `attendance` and `auth/two-fa/two-fa.service.ts` raw SQL |
| `vibe-icons/` + `system/vibe-icons/` | Custom icon set for Vibe brand | Referenced by `system/warnings/warnings.service.ts` |

### Backend schema (`prisma/schema.prisma`)
Models tied to HR business:
- `TimeTracking`, `MoodLog` — attendance
- `BusinessClient`, `ClientContacts`, `ClientDepartment`, `ClientProject`, `ClientProjectStaff`, `ClientStaff` — client mgmt
- `StatusDefinition` — HR status
- `MaritalStatusConfig` — HR profile
- `VIBEIconSet`, `VIBEIcons` — branding
- `Staff` HR fields (`shiftStartTime`, `shiftEndTime`, `latestEndShiftTime`, `photoBusiness`, `photoCasual`, `dateOfBirth`, etc.) — keep model, drop fields when redesigning

### Frontend (`apps/web/src/`)
- `pages/attendance/`, `pages/dashboard/`, `pages/reports/`, `pages/clients/`, `pages/employee/`, `pages/employees/`
- `components/attendance/`, `components/dashboard/`, `components/reports/`, `components/staff/`, `components/status/`, `components/floating-widget/`
- `hooks/useAttendance.ts`, `useClient.ts`, `useReports.ts`, `useDashboard.ts`, `useDropdownDisplay.ts`
- `api/attendance.api.ts`, `client.api.ts`, `reports.api.ts`, `dashboard.api.ts`, `dropdownDisplay.api.ts`

## Reusable framework — KEEP

### Backend
- `auth/` — login, JWT cookies, refresh, password reset, 2FA (TOTP + email OTP), session revocation
- `email/` — provider config (SMTP/SendGrid), templates, queue, scheduled jobs
- `notifications/` — in-app + Socket.IO real-time
- `branding/` — logo, favicon, color palette
- `error-log/` — unhandled exception capture + Google Chat alerts
- `health/` — `/api/health` with DB ping, uptime, commit SHA
- `common/` — guards, filters, interceptors, decorators, base entity, utilities
- `prisma/` — PrismaService with soft-delete middleware
- `system/roles/` + `system/permissions/` — RBAC
- `system/settings/` — runtime config in DB
- `system/audit/` — mutation audit trail
- `system/api-log/` — request log
- `system/login-otp/` — login OTP
- `system/integrity/` — DB integrity checks (some HR-coupled queries inside — refactor when needed)
- `system/warnings/` — system warnings panel (some HR-coupled checks — refactor when needed)
- `employee/` — Staff CRUD = **User Management**. Strip HR-specific fields (shift hours, photos) when redesigning the User shape.
- `profile/` — user self-service
- `company/` + `department/` + `office/` + `position/` + `team/` — **org structure, useful for approval routing**
- `dropdown-display/` — UI config for dropdowns

### Frontend
- `layouts/AppLayout.tsx`, `AuthLayout.tsx`
- `components/ui/` — shadcn primitives
- `components/CrudTable.tsx`, `ConfirmDialog.tsx`, `ProtectedRoute.tsx`, `PublicRoute.tsx`, `RequirePermission.tsx`, `UserAvatar.tsx`, `ErrorBoundary.tsx`
- `components/entity/`, `components/form/`, `components/filters/`, `components/modals/`, `components/notifications/`
- `lib/` — `axios.ts`, `apiError.ts`, `safeArray.ts`, `queryClient.ts`, `dateFormat.ts`, `validation.ts`, `auth-init.ts`, `auth-redirect.ts`, `reportError.ts`
- `hooks/use-toast.ts`, `useDebounce.ts`, `usePersistentState.ts`, `useUnsavedChangesGuard.ts`, `useLogoutFlow.ts`, `usePermission.ts`, `useCrudPermissions.ts`, `useTabState.ts`
- `stores/auth.store.ts`, `theme.store.ts`
- `api/auth.api.ts`, `system.api.ts`, `profile.api.ts`, `notifications.api.ts`, `email.api.ts`, `health.api.ts`, `permissions.api.ts`, `admin-permissions.api.ts`, `org.api.ts`
- `pages/auth/`, `pages/profile/`, `pages/system/` (most of it), `pages/settings/` (org structure)

## Suggested Strip Order (when ready)

1. **Schema first**: in `prisma/schema.prisma`, mark HR-only models for removal. Generate migration with all removals at once (one destructive migration > many).
2. **Stub Staff HR fields**: keep `Staff` model but remove `shiftStartTime`, `shiftEndTime`, `latestEndShiftTime`, `photoBusiness`, `photoCasual`. Rename `Staff` → `User` if desired.
3. **Strip backend modules** in this order:
   - `attendance/` → must first remove `createLoginTimeTracking` call from `auth.service.ts` lines 165, 681, 875
   - `auth/two-fa/two-fa.service.ts` → remove TimeTracking/StatusDefinition raw SQL queries
   - `system/integrity/integrity.service.ts` → remove `BusinessClient`, `MoodLog`, `StatusDefinition`, `TimeTracking` from integrity scans
   - `system/warnings/warnings.service.ts` → remove `checkBrokenVibeIconUrls`, `scanEmployeePhotoUrls`, `checkMissingTimezone` (Staff shift checks)
   - `system/settings/settings.service.ts` → remove `MoodLogRoles` setting
   - `branding/branding.controller.ts` line 31 → remove `MoodLogRoles` from logout config
   - Then delete: `attendance/`, `dashboard/`, `reports/`, `client/`, `status/`, `vibe-icons/`, `system/statuses/`, `system/vibe-icons/`
   - Update `app.module.ts` accordingly
4. **Strip frontend** following the FE list above.
5. **Run `pnpm check` + `pnpm build`** at every step.
