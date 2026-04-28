import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeSeconds } from '@/lib/dateFormat';
import { ChevronDown, ChevronRight, RefreshCw, Trash2, Bug, Power, PowerOff } from 'lucide-react';

interface IDebugLogEntry {
  id: string;
  createdAt: string;
  context: string;
  message: string;
  data?: unknown;
}

interface IDebugLogResponse {
  entries: IDebugLogEntry[];
  total: number;
  enabled: boolean;
}

function useDebugLogs(contextFilter: string) {
  return useQuery({
    queryKey: ['debug-logs', contextFilter],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: IDebugLogResponse }>(
        '/system/debug-logs',
        { params: { limit: 500, context: contextFilter || undefined } },
      );
      return res.data.data;
    },
    refetchInterval: 3_000,
    staleTime: 1_000,
  });
}

function useClearDebugLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete('/system/debug-logs'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debug-logs'] }),
  });
}

function useToggleDebugMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      apiClient.put<{ success: boolean; data: { enabled: boolean } }>(
        '/system/debug-mode',
        { enabled },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debug-logs'] }),
  });
}

function JsonRow({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState(false);
  if (data === undefined || data === null) return <span className="text-muted-foreground">—</span>;
  const serialized = JSON.stringify(data, null, 2);
  const preview =
    serialized.length > 80 ? `${serialized.slice(0, 80).replace(/\n/g, ' ')}…` : serialized;
  return (
    <div>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-start gap-1 text-xs text-primary hover:underline text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 mt-0.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
        )}
        <code className="font-mono break-all">{preview}</code>
      </button>
      {expanded && (
        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-w-3xl max-h-72 whitespace-pre-wrap break-all">
          {serialized}
        </pre>
      )}
    </div>
  );
}

export function DebugLogPage() {
  const [contextInput, setContextInput] = useState('');
  const [contextFilter, setContextFilter] = useState('');

  const { data, isLoading, refetch, isFetching } = useDebugLogs(contextFilter);
  const clearMut = useClearDebugLogs();
  const toggleMut = useToggleDebugMode();

  const enabled = data?.enabled ?? false;
  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Debug Logs</h2>
            <p className="text-xs text-muted-foreground">
              In-memory ring buffer (last 500). Cleared on server restart.
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant={enabled ? 'default' : 'outline'} className="gap-1">
            {enabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
            Debug mode: {enabled ? 'ON' : 'OFF'}
          </Badge>
          <Button
            size="sm"
            variant={enabled ? 'outline' : 'default'}
            onClick={() => toggleMut.mutate(!enabled)}
            disabled={toggleMut.isPending}
          >
            Turn {enabled ? 'OFF' : 'ON'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Input
          placeholder="Filter by context (e.g. AuthService.login)"
          value={contextInput}
          onChange={(e) => setContextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setContextFilter(contextInput)}
          className="w-72"
        />
        <Button size="sm" onClick={() => setContextFilter(contextInput)}>
          Filter
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setContextInput('');
            setContextFilter('');
          }}
        >
          Reset
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (confirm('Clear all debug log entries in the buffer?')) clearMut.mutate();
          }}
          disabled={clearMut.isPending}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Clear
        </Button>
      </div>

      {!enabled && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
          Debug mode is currently <strong>OFF</strong>. New events won't be captured. Turn it ON
          above, then reproduce the issue to populate this log.
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-36">
                  Time
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-56">
                  Context
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                  Message / Data
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && entries.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                    No entries. {enabled ? 'Reproduce the issue to populate.' : ''}
                  </td>
                </tr>
              )}
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap align-top">
                    {formatDateTimeSeconds(entry.createdAt)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <code className="text-xs font-mono">{entry.context}</code>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="text-sm mb-1">{entry.message}</div>
                    <JsonRow data={entry.data} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {entries.length} of {total} buffered entries. Auto-refreshes every 3s.
      </div>
    </div>
  );
}
