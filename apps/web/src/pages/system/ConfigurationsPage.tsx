import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusConfigPage } from './StatusConfigPage';
import { VibeIconsPage } from './VibeIconsPage';

const TABS = ['statuses', 'icons'] as const;
type ConfigTab = (typeof TABS)[number];

function isValidTab(t: string | null): t is ConfigTab {
  return TABS.includes(t as ConfigTab);
}

export function ConfigurationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: ConfigTab = isValidTab(rawTab) ? rawTab : 'statuses';

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configurations</h1>
        <p className="text-sm text-muted-foreground">Status definitions and VIBE icon sets.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="statuses">Status Config</TabsTrigger>
          <TabsTrigger value="icons">VIBE Icons</TabsTrigger>
        </TabsList>

        <TabsContent value="statuses" className="pt-4">
          <StatusConfigPage />
        </TabsContent>
        <TabsContent value="icons" className="pt-4">
          <VibeIconsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
