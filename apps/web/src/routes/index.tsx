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

// Dashboard pages
import {
  EmployeeDashboardPage,
  ManagerDashboardPage,
  HrDashboardPage,
  ClientDashboardPage,
} from '@/pages/DashboardPages';

// Employee pages
import {
  EmployeeListPage,
  EmployeeDetailPage,
  NewEmployeePage,
  ImportEmployeesPage,
} from '@/pages/employee/EmployeePages';

// Attendance pages
import {
  AttendanceHistoryPage,
  TeamAttendancePage,
} from '@/pages/attendance/AttendancePages';

// Client pages
import { ClientListPage, ClientDetailPage } from '@/pages/clients/ClientPages';

// Report pages
import {
  AttendanceReportPage,
  HrReportPage,
  VibeReportPage,
  TimezoneReportPage,
  WorkingHoursReportPage,
  StaffAllocationPage,
} from '@/pages/reports/ReportPages';

// Settings pages
import {
  CompanySettingsPage,
  CompanyDetailPage,
  CompanyContactsPage,
  DepartmentsPage,
  OfficesPage,
  PositionsPage,
  TeamsPage as SettingsTeamsPage,
  DepartmentDetailPage,
  OfficeDetailPage,
  TeamDetailPage,
} from '@/pages/settings/SettingsPages';
import { SecuritySettingsPage } from '@/pages/settings/SecuritySettingsPage';
import { DropdownDisplaySettingsPage } from '@/pages/settings/DropdownDisplaySettingsPage';

// System pages
import {
  RolesPage,
  RolePermissionsPage,
  SystemSettingsPage,
  TeamsPage,
  SystemWarningsPage,
  LoginOtpPage,
  EmailPage,
  LogsPage,
  NotificationsInboxPage,
  ConfigurationsPage,
  SystemTestPage,
} from '@/pages/system/SystemPages';

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
        {/* Dashboards — index is role-agnostic; sub-dashboards are screen-gated. */}
        <Route index element={<EmployeeDashboardPage />} />
        <Route path="/manager" element={<RequirePermission screen="D02" redirect="/"><ManagerDashboardPage /></RequirePermission>} />
        <Route path="/hr" element={<RequirePermission screen="D03" redirect="/"><HrDashboardPage /></RequirePermission>} />
        <Route path="/client" element={<RequirePermission screen="D04" redirect="/"><ClientDashboardPage /></RequirePermission>} />

        {/* Employees */}
        <Route path="/employees" element={<RequirePermission screen="E01" redirect="/"><EmployeeListPage /></RequirePermission>} />
        <Route path="/employees/new" element={<RequirePermission screen="E02" redirect="/"><NewEmployeePage /></RequirePermission>} />
        <Route path="/employees/import" element={<RequirePermission screen="E03" redirect="/"><ImportEmployeesPage /></RequirePermission>} />
        <Route path="/employees/:id" element={<RequirePermission screen="E04" redirect="/"><EmployeeDetailPage /></RequirePermission>} />

        {/* Clients */}
        <Route path="/clients" element={<RequirePermission screen="C01" redirect="/"><ClientListPage /></RequirePermission>} />
        <Route path="/clients/:id" element={<RequirePermission screen="C02" redirect="/"><ClientDetailPage /></RequirePermission>} />

        {/* Attendance */}
        <Route path="/attendance/history" element={<RequirePermission screen="AT01" redirect="/"><AttendanceHistoryPage /></RequirePermission>} />
        <Route path="/attendance/team" element={<RequirePermission screen="AT02" redirect="/"><TeamAttendancePage /></RequirePermission>} />

        {/* Reports */}
        <Route path="/reports/attendance" element={<RequirePermission screen="R01" redirect="/"><AttendanceReportPage /></RequirePermission>} />
        <Route path="/reports/hr" element={<RequirePermission screen="R02" redirect="/"><HrReportPage /></RequirePermission>} />
        <Route path="/reports/vibe" element={<RequirePermission screen="R03" redirect="/"><VibeReportPage /></RequirePermission>} />
        <Route path="/reports/timezone" element={<RequirePermission screen="R04" redirect="/"><TimezoneReportPage /></RequirePermission>} />
        <Route path="/reports/working-hours" element={<RequirePermission screen="R05" redirect="/"><WorkingHoursReportPage /></RequirePermission>} />
        <Route path="/reports/staff-allocation" element={<RequirePermission screen="R06" redirect="/"><StaffAllocationPage /></RequirePermission>} />

        {/* Settings */}
        <Route path="/settings/company" element={<RequirePermission screen="S01" redirect="/"><CompanySettingsPage /></RequirePermission>} />
        <Route path="/settings/company/:id" element={<RequirePermission screen="S01" redirect="/"><CompanyDetailPage /></RequirePermission>} />
        <Route path="/settings/departments" element={<RequirePermission screen="S02" redirect="/"><DepartmentsPage /></RequirePermission>} />
        <Route path="/settings/offices" element={<RequirePermission screen="S03" redirect="/"><OfficesPage /></RequirePermission>} />
        <Route path="/settings/positions" element={<RequirePermission screen="S04" redirect="/"><PositionsPage /></RequirePermission>} />
        <Route path="/settings/teams" element={<RequirePermission screen="S05" redirect="/"><SettingsTeamsPage /></RequirePermission>} />
        <Route path="/settings/departments/:id" element={<RequirePermission screen="S02" redirect="/"><DepartmentDetailPage /></RequirePermission>} />
        <Route path="/settings/offices/:id" element={<RequirePermission screen="S03" redirect="/"><OfficeDetailPage /></RequirePermission>} />
        <Route path="/settings/teams/:id" element={<RequirePermission screen="S05" redirect="/"><TeamDetailPage /></RequirePermission>} />
        <Route path="/settings/company-contacts" element={<RequirePermission screen="S01" redirect="/"><CompanyContactsPage /></RequirePermission>} />
        <Route path="/settings/security" element={<RequirePermission screen="S08" redirect="/"><SecuritySettingsPage /></RequirePermission>} />
        <Route path="/settings/dropdown-display" element={<RequirePermission screen="S09" redirect="/"><DropdownDisplaySettingsPage /></RequirePermission>} />

        {/* Notifications — All roles (Account area, no permission gate) */}
        <Route path="/notifications" element={<NotificationsInboxPage />} />

        {/* System — tabbed group pages */}
        <Route path="/system/email" element={<RequirePermission screen="SY14" redirect="/"><EmailPage /></RequirePermission>} />
        <Route path="/system/logs" element={<RequirePermission screen="SY04" redirect="/"><LogsPage /></RequirePermission>} />
        {/* Configurations aggregates SY03 (statuses) + SY09 (icons); gate by SY03. */}
        <Route path="/system/configurations" element={<RequirePermission screen="SY03" redirect="/"><ConfigurationsPage /></RequirePermission>} />

        {/* System — standalone pages */}
        <Route path="/system/roles" element={<RequirePermission screen="SY01" redirect="/"><RolesPage /></RequirePermission>} />
        <Route path="/system/role-permissions" element={<RequirePermission screen="SY18" redirect="/"><RolePermissionsPage /></RequirePermission>} />
        <Route path="/system/settings" element={<RequirePermission screen="SY02" redirect="/"><SystemSettingsPage /></RequirePermission>} />
        <Route path="/system/warnings" element={<RequirePermission screen="SY15" redirect="/"><SystemWarningsPage /></RequirePermission>} />
        <Route path="/system/teams" element={<RequirePermission screen="SY10" redirect="/"><TeamsPage /></RequirePermission>} />
        <Route path="/system/login-otps" element={<RequirePermission screen="SY16" redirect="/"><LoginOtpPage /></RequirePermission>} />
        <Route path="/system/test" element={<RequirePermission screen="SY02" redirect="/"><SystemTestPage /></RequirePermission>} />

        {/* Old-route redirects → new tabbed routes */}
        <Route path="/system/email-configs" element={<Navigate to="/system/email?tab=providers" replace />} />
        <Route path="/system/email-templates" element={<Navigate to="/system/email?tab=templates" replace />} />
        <Route path="/system/email-queue" element={<Navigate to="/system/email?tab=queue" replace />} />
        <Route path="/system/email-job" element={<Navigate to="/system/email?tab=job" replace />} />
        <Route path="/system/api-logs" element={<Navigate to="/system/logs?tab=api" replace />} />
        <Route path="/system/error-logs" element={<Navigate to="/system/logs?tab=exception" replace />} />
        <Route path="/system/notification-settings" element={<Navigate to="/system/settings?tab=notifications" replace />} />
        <Route path="/system/statuses" element={<Navigate to="/system/configurations?tab=statuses" replace />} />
        <Route path="/system/vibe-icons" element={<Navigate to="/system/configurations?tab=icons" replace />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Redirects */}
      <Route path="/index.html" element={<Navigate to="/" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </>
  ),
);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
