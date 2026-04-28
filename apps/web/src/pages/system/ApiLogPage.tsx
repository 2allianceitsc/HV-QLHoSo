import { useState } from 'react';
import { formatDateTimeSeconds } from '@/lib/dateFormat';
import { Badge } from '@/components/ui/badge';
import { TablePagination } from '@/components/ui/TablePagination';
import {
  FilterBar,
  FilterField,
  FilterActions,
  SearchInput,
  DateRangePresetPicker,
  useCommittedFilter,
} from '@/components/filters';
import { Input } from '@/components/ui/input';
import { useApiLogs } from '@/hooks/useSystem';
import type { IApiRequestLog, IApiLogFilter } from '@/api/system.api';
import { ChevronDown, ChevronRight } from 'lucide-react';

const METHOD_VARIANTS: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  GET: 'secondary',
  POST: 'default',
  PUT: 'outline',
  PATCH: 'outline',
  DELETE: 'destructive',
};

function statusColor(code: number): string {
  if (code < 300) return 'text-green-600';
  if (code < 400) return 'text-yellow-600';
  if (code < 500) return 'text-orange-500';
  return 'text-destructive';
}

function durationColor(ms: number): string {
  if (ms < 200) return 'text-green-600';
  if (ms < 1000) return 'text-yellow-600';
  return 'text-destructive';
}

function BodyCell({ value, label }: { value?: string | null; label: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { parsed = value; }
  return (
    <div>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
        aria-label={`Toggle ${label}`}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? 'Hide' : 'Show'}
      </button>
      {expanded && (
        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-w-xs max-h-40">
          {typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const LIMIT = 50;

// All text inputs as strings; statusCode converted to number at API boundary
type ApiLogDraft = {
  url: string;
  method: string;
  statusCode: string;
  userId: string;
  startDate: string;
  endDate: string;
} & Record<string, unknown>;

const DEFAULT_INPUTS: ApiLogDraft = {
  url: '',
  method: '',
  statusCode: '',
  userId: '',
  startDate: '',
  endDate: '',
};

function toApiFilter(f: ApiLogDraft, page: number): IApiLogFilter {
  return {
    page,
    limit: LIMIT,
    url: f.url || undefined,
    method: f.method || undefined,
    statusCode: f.statusCode ? Number(f.statusCode) : undefined,
    userId: f.userId || undefined,
    startDate: f.startDate || undefined,
    endDate: f.endDate || undefined,
  };
}

export function ApiLogPage() {
  const [page, setPage] = useState(1);
  const { draft, setDraft, committed, commit, reset } = useCommittedFilter<ApiLogDraft>({
    key: 'vibe365.api-log.filter',
    defaultValue: DEFAULT_INPUTS,
    mode: 'localStorage',
  });

  const { data, isLoading } = useApiLogs(toApiFilter(committed, page));

  const activeCount = [
    committed.url,
    committed.method,
    committed.statusCode,
    committed.userId,
    committed.startDate,
    committed.endDate,
  ].filter(Boolean).length;

  function handleSearch() { commit(); setPage(1); }
  function handleReset() { reset(); setPage(1); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Request Log</h1>
        <p className="text-sm text-muted-foreground">
          All API calls — who called, from where, and how long it took
        </p>
      </div>

      <FilterBar
        activeCount={activeCount}
        testId="api-log-filter-bar"
        actions={
          <FilterActions
            onSearch={handleSearch}
            onReset={handleReset}
            testIdPrefix="api-log"
          />
        }
      >
        <FilterField label="URL contains">
          <SearchInput
            value={draft.url}
            onChange={(v) => setDraft({ url: v })}
            onEnter={handleSearch}
            placeholder="/attendance"
            testId="api-log-url-filter"
          />
        </FilterField>

        <FilterField label="Method">
          <select
            value={draft.method}
            onChange={(e) => setDraft({ method: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="api-log-method-filter"
          >
            <option value="">All</option>
            {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </FilterField>

        <FilterField label="Status Code">
          <Input
            value={draft.statusCode}
            onChange={(e) => setDraft({ statusCode: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. 500"
            type="number"
            data-testid="api-log-status-filter"
          />
        </FilterField>

        <FilterField label="User ID">
          <SearchInput
            value={draft.userId}
            onChange={(v) => setDraft({ userId: v })}
            onEnter={handleSearch}
            placeholder="userId"
            testId="api-log-user-filter"
          />
        </FilterField>

        <DateRangePresetPicker
          value={{ startDate: draft.startDate, endDate: draft.endDate }}
          onChange={({ startDate, endDate }) =>
            setDraft({ startDate: startDate ?? '', endDate: endDate ?? '' })
          }
          className="sm:col-span-2"
          testId="api-log-date-range"
        />
      </FilterBar>

      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Time</th>
                <th className="px-3 py-2 text-left font-medium">Method</th>
                <th className="px-3 py-2 text-left font-medium">URL</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Duration</th>
                <th className="px-3 py-2 text-left font-medium">User</th>
                <th className="px-3 py-2 text-left font-medium">IP</th>
                <th className="px-3 py-2 text-left font-medium">Body</th>
                <th className="px-3 py-2 text-left font-medium">Query</th>
                <th className="px-3 py-2 text-left font-medium">Client</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : !data?.data?.length ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No API logs found.</td></tr>
              ) : (
                data.data.map((log: IApiRequestLog) => (
                  <tr key={log.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs whitespace-nowrap font-mono">
                      {formatDateTimeSeconds(log.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={METHOD_VARIANTS[log.method] ?? 'secondary'} className="font-mono text-xs">
                        {log.method}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs max-w-[220px] truncate" title={log.url}>
                      {log.url}
                    </td>
                    <td className={`px-3 py-2 font-mono font-semibold text-xs ${statusColor(log.statusCode)}`}>
                      {log.statusCode}
                    </td>
                    <td className={`px-3 py-2 font-mono text-xs whitespace-nowrap ${durationColor(log.durationMs)}`}>
                      {log.durationMs}ms
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {log.userName ?? log.userId ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">{log.ipAddress ?? '—'}</td>
                    <td className="px-3 py-2 text-xs"><BodyCell value={log.requestBody} label="request body" /></td>
                    <td className="px-3 py-2 text-xs"><BodyCell value={log.queryParams} label="query params" /></td>
                    <td className="px-3 py-2 text-xs"><BodyCell value={log.clientInfo} label="client info" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data?.pagination && (
        <TablePagination
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
