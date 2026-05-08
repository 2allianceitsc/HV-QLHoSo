import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { AuditLogPage } from './AuditLogPage';
import { ApiLogPage } from './ApiLogPage';
import { ErrorLogPage } from './ErrorLogPage';
import { DebugLogPage } from './DebugLogPage';
import { TeamHistoryPage } from '@/pages/attendance/TeamHistoryPage';
import { EmailLogTab } from './EmailLogTab';

const BASE_TABS = ['email', 'audit', 'api'] as const;
const ALL_TABS = ['email', 'audit', 'api', 'exception', 'debug', 'login-log'] as const;
type LogTab = (typeof ALL_TABS)[number];

function isValidTab(t: string | null, allowed: readonly string[]): t is LogTab {
  return allowed.includes(t ?? '');
}

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') ?? false;
  const canSeeLoginLog = user?.roles?.some(r => ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(r)) ?? false;

  const allowedTabs: string[] = [
    ...BASE_TABS,
    ...(isSuperAdmin ? ['exception', 'debug'] : []),
    ...(canSeeLoginLog ? ['login-log'] : []),
  ];

  const rawTab = searchParams.get('tab');
  const activeTab: LogTab = isValidTab(rawTab, allowedTabs) ? rawTab : 'email';

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Nhật ký hệ thống</h1>
        <p className="text-sm text-muted-foreground">Email log, audit trail và nhật ký hệ thống.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="email">Email Log</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="api">API Log</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="exception">Exception Log</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="debug">Debug</TabsTrigger>}
          {canSeeLoginLog && <TabsTrigger value="login-log">Login Log</TabsTrigger>}
        </TabsList>

        <TabsContent value="email" className="pt-4">
          <EmailLogTab />
        </TabsContent>
        <TabsContent value="audit" className="pt-4">
          <AuditLogPage />
        </TabsContent>
        <TabsContent value="api" className="pt-4">
          <ApiLogPage />
        </TabsContent>
        {isSuperAdmin && (
          <TabsContent value="exception" className="pt-4">
            <ErrorLogPage />
          </TabsContent>
        )}
        {isSuperAdmin && (
          <TabsContent value="debug" className="pt-4">
            <DebugLogPage />
          </TabsContent>
        )}
        {canSeeLoginLog && (
          <TabsContent value="login-log" className="pt-4">
            <TeamHistoryPage />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
