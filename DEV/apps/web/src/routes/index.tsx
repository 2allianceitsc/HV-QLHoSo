import { Route, Navigate, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';
import { RequirePermission } from '@/components/RequirePermission';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import {
  ForgotPasswordPage,
  VerifyOtpPage,
  ResetPasswordPage,
  FirstTimePasswordPage,
} from '@/pages/auth/AuthPages';
import { TwoFAVerifyPage } from '@/pages/auth/TwoFAVerifyPage';
import { SetupTwoFAPage } from '@/pages/auth/SetupTwoFAPage';

// ── HV: Submission pages ──────────────────────────────────────────────────────
import { SubmissionListPage } from '@/pages/submissions/SubmissionListPage';
import { CreateSubmissionPage } from '@/pages/submissions/CreateSubmissionPage';
import { SubmissionDetailPage } from '@/pages/submissions/SubmissionDetailPage';
import { EditSubmissionPage } from '@/pages/submissions/EditSubmissionPage';

// ── HV: Report pages ──────────────────────────────────────────────────────────
import { ReportSummaryPage } from '@/pages/reports/ReportSummaryPage';
import { ReportExpensesPage } from '@/pages/reports/ReportExpensesPage';
import { ReportContractsPage } from '@/pages/reports/ReportContractsPage';

// ── HV: Admin pages ───────────────────────────────────────────────────────────
import { UserManagementPage } from '@/pages/admin/UserManagementPage';
import { DepartmentManagementPage } from '@/pages/admin/DepartmentManagementPage';
import { CostCodeManagementPage } from '@/pages/admin/CostCodeManagementPage';
import { ApprovalConfigPage } from '@/pages/admin/ApprovalConfigPage';
import { SubmissionStatusPage } from '@/pages/admin/SubmissionStatusPage';

// ── HR pages (kept, not exposed in nav/routes for HV) ────────────────────────
// import { EmployeeDashboardPage } from '@/pages/DashboardPages';
// import { EmployeeListPage, EmployeeDetailPage, NewEmployeePage, ImportEmployeesPage } from '@/pages/employee/EmployeePages';
// import { AttendanceHistoryPage } from '@/pages/attendance/AttendancePages';
// import { CompanySettingsPage, CompanyDetailPage, DepartmentsPage, OfficesPage, PositionsPage, TeamsPage as SettingsTeamsPage, DepartmentDetailPage, OfficeDetailPage, TeamDetailPage } from '@/pages/settings/SettingsPages';
// import { DropdownDisplaySettingsPage } from '@/pages/settings/DropdownDisplaySettingsPage';

// System pages (kept for SUPER_ADMIN)
import {
  RolesPage,
  RolePermissionsPage,
  SystemSettingsPage,
  TeamsPage,
  SystemWarningsPage,
  EmailPage,
  LogsPage,
  NotificationsInboxPage,
  SystemTestPage,
} from '@/pages/system/SystemPages';
import { HvEmailTemplatePage } from '@/pages/system/HvEmailTemplatePage';

// Misc
import { ProfilePage, NotFoundPage } from '@/pages/MiscPages';


const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Auth routes */}
      <Route
        element={
          <PublicRoute>
            <AuthLayout />
          </PublicRoute>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/first-time-password" element={<FirstTimePasswordPage />} />
        <Route path="/verify-2fa" element={<TwoFAVerifyPage />} />
        <Route path="/setup-2fa" element={<SetupTwoFAPage />} />
      </Route>

      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Default — redirect to submissions */}
        <Route index element={<Navigate to="/submissions" replace />} />

        {/* ── HV: Submissions ── */}
        <Route path="/submissions" element={<SubmissionListPage />} />
        <Route path="/submissions/new" element={<CreateSubmissionPage />} />
        <Route path="/submissions/:id" element={<SubmissionDetailPage />} />
        <Route path="/submissions/:id/edit" element={<EditSubmissionPage />} />

        {/* ── HV: Reports ── */}
        <Route path="/reports" element={<ReportSummaryPage />} />
        <Route path="/reports/expenses" element={<ReportExpensesPage />} />
        <Route path="/reports/contracts" element={<ReportContractsPage />} />

        {/* ── HV: Admin ── */}
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/departments" element={<DepartmentManagementPage />} />
        <Route path="/admin/cost-codes" element={<CostCodeManagementPage />} />
        <Route path="/admin/approval-config" element={<ApprovalConfigPage />} />
        <Route path="/admin/submission-statuses" element={<SubmissionStatusPage />} />

        {/* ── HR routes disabled (kept for reference) ── */}
        {/* <Route path="/employees" element={<RequirePermission screen="E01" redirect="/submissions"><EmployeeListPage /></RequirePermission>} /> */}
        {/* <Route path="/employees/new" element={<RequirePermission screen="E02" redirect="/submissions"><NewEmployeePage /></RequirePermission>} /> */}
        {/* <Route path="/employees/import" element={<RequirePermission screen="E03" redirect="/submissions"><ImportEmployeesPage /></RequirePermission>} /> */}
        {/* <Route path="/employees/:id" element={<RequirePermission screen="E04" redirect="/submissions"><EmployeeDetailPage /></RequirePermission>} /> */}
        {/* <Route path="/attendance/history" element={<RequirePermission screen="AT01" redirect="/submissions"><AttendanceHistoryPage /></RequirePermission>} /> */}
        {/* <Route path="/attendance/team" element={<Navigate to="/system/logs?tab=login-log" replace />} /> */}
        {/* <Route path="/settings/company" element={<RequirePermission screen="S01" redirect="/submissions"><CompanySettingsPage /></RequirePermission>} /> */}
        {/* ... other HR settings routes disabled ... */}

        {/* Notifications — All roles */}
        <Route path="/notifications" element={<NotificationsInboxPage />} />

        {/* System — SUPER_ADMIN only (kept) */}
        <Route path="/system/email" element={<RequirePermission screen="SY14" redirect="/submissions"><EmailPage /></RequirePermission>} />
        <Route path="/system/logs" element={<RequirePermission screen="SY04" redirect="/submissions"><LogsPage /></RequirePermission>} />
        <Route path="/system/roles" element={<RequirePermission screen="SY01" redirect="/submissions"><RolesPage /></RequirePermission>} />
        <Route path="/system/role-permissions" element={<RequirePermission screen="SY18" redirect="/submissions"><RolePermissionsPage /></RequirePermission>} />
        <Route path="/system/settings" element={<RequirePermission screen="SY02" redirect="/submissions"><SystemSettingsPage /></RequirePermission>} />
        <Route path="/system/warnings" element={<RequirePermission screen="SY15" redirect="/submissions"><SystemWarningsPage /></RequirePermission>} />
        <Route path="/system/teams" element={<RequirePermission screen="SY10" redirect="/submissions"><TeamsPage /></RequirePermission>} />
        <Route path="/system/test" element={<RequirePermission screen="SY02" redirect="/submissions"><SystemTestPage /></RequirePermission>} />

        {/* S16 — HV Email Templates */}
        <Route path="/system/email-templates" element={<HvEmailTemplatePage />} />

        {/* Old-route redirects */}
        <Route path="/system/email-configs" element={<Navigate to="/system/email?tab=providers" replace />} />
        <Route path="/system/email-queue" element={<Navigate to="/system/email?tab=queue" replace />} />
        <Route path="/system/email-job" element={<Navigate to="/system/email?tab=job" replace />} />
        <Route path="/system/api-logs" element={<Navigate to="/system/logs?tab=api" replace />} />
        <Route path="/system/error-logs" element={<Navigate to="/system/logs?tab=exception" replace />} />
        <Route path="/system/notification-settings" element={<Navigate to="/system/settings?tab=notifications" replace />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Redirects */}
      <Route path="/index.html" element={<Navigate to="/submissions" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </>
  ),
);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
