export { RolesPage } from './RolesPage';
export { RolePermissionsPage } from './RolePermissionsPage';
export { SystemSettingsPage } from './SettingsPage';
export { SystemWarningsPage } from './SystemWarningsPage';
export { DataIntegrityPage } from './DataIntegrityPage';
export { LoginOtpPage } from './LoginOtpPage';

// Tabbed group pages
export { EmailPage } from './EmailPage';
export { LogsPage } from './LogsPage';
export { ConfigurationsPage } from './ConfigurationsPage';

// Individual pages (still used directly by old-route redirects + tab wrappers)
export { StatusConfigPage as StatusesPage } from './StatusConfigPage';
export { AuditLogPage as SystemLogsPage } from './AuditLogPage';
export { ApiLogPage } from './ApiLogPage';
export { ErrorLogPage } from './ErrorLogPage';
export { NotificationsInboxPage } from './NotificationsInboxPage';
export { NotificationsSettingsPage } from './NotificationsSettingsPage';
export { VibeIconsPage } from './VibeIconsPage';
export { EmailQueuePage } from './EmailQueuePage';
export { EmailJobPage } from './EmailJobPage';
export { EmailTemplatePage } from './EmailTemplatePage';
export { EmailConfigPage } from './EmailConfigPage';

export { SystemTestPage } from './SystemTestPage';

export function TeamsPage() {
  return <div><h1 className="text-2xl font-bold">Teams</h1><p className="text-muted-foreground text-sm">EP05</p></div>;
}
