import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSystemWarnings, SYSTEM_WARNINGS_KEY } from '@/hooks/useSystem';
import { SystemWarningsPanel } from '@/components/SystemWarningsPanel';
import { DataIntegrityPage } from './DataIntegrityPage';
import { SessionIssuesTab } from './SessionIssuesTab';
import { useQueryClient } from '@tanstack/react-query';

const TABS = ['warnings', 'integrity', 'sessions'] as const;
type WarningsTab = (typeof TABS)[number];

function isValidTab(t: string | null): t is WarningsTab {
  return TABS.includes(t as WarningsTab);
}

function SystemWarningsTab() {
  const qc = useQueryClient();
  const { isLoading, isFetching, data } = useSystemWarnings();

  function handleRefresh() {
    void qc.invalidateQueries({ queryKey: [SYSTEM_WARNINGS_KEY] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Checking system health...</p>
      ) : data?.length === 0 ? (
        <div className="rounded-lg border border-green-300/60 bg-green-50 dark:bg-green-950/20 px-4 py-6 text-center">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            All clear — no active warnings.
          </p>
        </div>
      ) : (
        <SystemWarningsPanel />
      )}
    </div>
  );
}

export function SystemWarningsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: WarningsTab = isValidTab(rawTab) ? rawTab : 'warnings';

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">System Health</h1>
        <p className="text-sm text-muted-foreground">
          Active warnings and data integrity checks.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="warnings">System Warnings</TabsTrigger>
          <TabsTrigger value="integrity">Data Integrity</TabsTrigger>
          <TabsTrigger value="sessions">Session Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="warnings" className="pt-4">
          <SystemWarningsTab />
        </TabsContent>
        <TabsContent value="integrity" className="pt-4">
          <DataIntegrityPage />
        </TabsContent>
        <TabsContent value="sessions" className="pt-4">
          <SessionIssuesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
