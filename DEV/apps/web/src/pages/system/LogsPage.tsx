import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { AuditLogPage } from './AuditLogPage';
import { ApiLogPage } from './ApiLogPage';
import { ErrorLogPage } from './ErrorLogPage';
import { DebugLogPage } from './DebugLogPage';

const BASE_TABS = ['audit', 'api'] as const;
const ALL_TABS = ['audit', 'api', 'exception', 'debug'] as const;
type LogTab = (typeof ALL_TABS)[number];

function isValidTab(t: string | null, isSuperAdmin: boolean): t is LogTab {
  const allowed: readonly string[] = isSuperAdmin ? ALL_TABS : BASE_TABS;
  return allowed.includes(t ?? '');
}

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') ?? false;

  const rawTab = searchParams.get('tab');
  const activeTab: LogTab = isValidTab(rawTab, isSuperAdmin) ? rawTab : 'audit';

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Logs</h1>
        <p className="text-sm text-muted-foreground">Audit trail, API request log, and exception log.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="api">API Log</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="exception">Exception Log</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="debug">Debug</TabsTrigger>}
        </TabsList>

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
      </Tabs>
    </div>
  );
}
