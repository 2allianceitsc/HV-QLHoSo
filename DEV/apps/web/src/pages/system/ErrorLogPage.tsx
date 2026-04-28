import { useState } from 'react';
import { formatDateTimeSeconds } from '@/lib/dateFormat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/ui/TablePagination';
import { useFilterState } from '@/components/filters';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { ChevronDown, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface IErrorLog {
  id: string;
  source: 'BACKEND' | 'FRONTEND';
  statusCode?: number | null;
  method?: string | null;
  url?: string | null;
  message: string;
  stack?: string | null;
  userId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface IErrorLogFilter extends Record<string, unknown> {
  page: number;
  limit: number;
  source: string;
  search: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useErrorLogs(filter: IErrorLogFilter) {
  return useQuery({
    queryKey: ['error-logs', filter],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: { data: IErrorLog[]; total: number; page: number; limit: number };
      }>('/error-logs', {
        params: {
          page: filter.page,
          limit: filter.limit,
          source: filter.source || undefined,
          search: filter.search || undefined,
        },
      });
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

// ── Stack expander ────────────────────────────────────────────────────────────

function StackCell({ stack, testId }: { stack?: string | null; testId?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!stack) return <span className="text-muted-foreground">—</span>;
  return (
    <div>
      <button
        data-testid={testId}
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? 'Hide' : 'Show stack'}
      </button>
      {expanded && (
        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-w-sm max-h-48 whitespace-pre-wrap break-all">
          {stack}
        </pre>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const DEFAULT_FILTER: IErrorLogFilter = { page: 1, limit: 50, source: '', search: '' };

export function ErrorLogPage() {
  const [filter, setFilter, resetFilter] = useFilterState<IErrorLogFilter>({
    key: 'hvflow.error-log.filter',
    defaultValue: DEFAULT_FILTER,
    mode: 'localStorage',
  });

  // Staging input for search — committed to filter only on Search click or Enter
  const [searchInput, setSearchInput] = useState(filter.search);

  const { data, isLoading, refetch, isFetching } = useErrorLogs(filter);

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;

  function handleSearch() {
    setFilter((prev) => ({ ...prev, search: searchInput, page: 1 }));
  }

  function handleSourceChange(s: string) {
    setFilter((prev) => ({ ...prev, source: s, page: 1 }));
  }

  function handleReset() {
    setSearchInput('');
    resetFilter();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Exception Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Backend + Frontend errors captured in real time.
          </p>
        </div>
        <Button
          data-testid="error-log-refresh"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters — compact inline layout, preserved from original */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex gap-1">
          {(['', 'BACKEND', 'FRONTEND'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter.source === s ? 'default' : 'outline'}
              data-testid={`error-log-filter-${s === '' ? 'all' : s.toLowerCase()}`}
              onClick={() => handleSourceChange(s)}
            >
              {s || 'All'}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            data-testid="error-log-search"
            placeholder="Search message / URL / user ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-72"
          />
          <Button data-testid="error-log-search-btn" size="sm" onClick={handleSearch}>
            Search
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="error-log-table" className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-36">Time</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-24">Source</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-16">Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-16">Method</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">URL / Message</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-28">User</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-24">Stack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Loading…</td>
                </tr>
              )}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No errors found.</td>
                </tr>
              )}
              {logs.map((log: IErrorLog) => (
                <tr
                  key={log.id}
                  data-testid={`error-log-row-${log.id}`}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTimeSeconds(log.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={log.source === 'BACKEND' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {log.source}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono">
                    {log.statusCode ? (
                      <span className={
                        log.statusCode >= 500
                          ? 'text-destructive'
                          : log.statusCode >= 400
                            ? 'text-orange-500'
                            : 'text-muted-foreground'
                      }>
                        {log.statusCode}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                    {log.method ?? '—'}
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    {log.url && (
                      <div className="text-xs text-muted-foreground truncate mb-0.5" title={log.url}>
                        {log.url}
                      </div>
                    )}
                    <div className="text-xs break-words line-clamp-2" title={log.message}>
                      {log.message}
                    </div>
                  </td>
                  <td
                    className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[7rem]"
                    title={log.userId ?? ''}
                  >
                    {log.userId ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <StackCell stack={log.stack} testId={`error-log-stack-${log.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        page={filter.page}
        totalPages={Math.max(1, Math.ceil(total / 50))}
        total={total}
        onPageChange={(p) => setFilter((prev) => ({ ...prev, page: p }))}
        testId="error-log-pagination"
      />
    </div>
  );
}
