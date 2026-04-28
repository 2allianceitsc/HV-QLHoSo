import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailConfigPage } from './EmailConfigPage';
import { EmailTemplatePage } from './EmailTemplatePage';
import { EmailQueuePage } from './EmailQueuePage';
import { EmailJobPage } from './EmailJobPage';

const TABS = ['providers', 'templates', 'queue', 'job'] as const;
type EmailTab = (typeof TABS)[number];

function isValidTab(t: string | null): t is EmailTab {
  return TABS.includes(t as EmailTab);
}

export function EmailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: EmailTab = isValidTab(rawTab) ? rawTab : 'providers';

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Email</h1>
        <p className="text-sm text-muted-foreground">Manage email providers, templates, queue, and background jobs.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="job">Job</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="pt-4">
          <EmailConfigPage />
        </TabsContent>
        <TabsContent value="templates" className="pt-4">
          <EmailTemplatePage />
        </TabsContent>
        <TabsContent value="queue" className="pt-4">
          <EmailQueuePage />
        </TabsContent>
        <TabsContent value="job" className="pt-4">
          <EmailJobPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
