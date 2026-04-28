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
import { useAuditLogs } from '@/hooks/useSystem';
import type { IAuditLog, IAuditLogFilter } from '@/api/system.api';
import { ChevronDown, ChevronRight } from 'lucide-react';

const ACTION_VARIANTS: Record<string, 'default' | 'destructive' | 'secondary'> = {
  CREATE: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
};

function ChangesCell({ changes }: { changes?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!changes) return <span className="text-muted-foreground">—</span>;
  let parsed: unknown;
  try { parsed = JSON.parse(changes); } catch { return <span className="text-xs">{changes}</span>; }
  return (
    <div>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? 'Hide' : 'Show'}
      </button>
      {expanded && (
        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-w-xs">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}

const ACTION_OPTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const LIMIT = 20;

// Text/date inputs only — page is managed separately (immediate, no commit gate)
type AuditLogDraft = { entity: string; action: string; startDate: string; endDate: string } & Record<string, unknown>;
const DEFAULT_INPUTS: AuditLogDraft = { entity: '', action: '', startDate: '', endDate: '' };

function toApiFilter(f: AuditLogDraft, page: number): IAuditLogFilter {
  return {
    page,
    limit: LIMIT,
    entity: f.entity || undefined,
    action: f.action || undefined,
    startDate: f.startDate || undefined,
    endDate: f.endDate || undefined,
  };
}

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const { draft, setDraft, committed, commit, reset } = useCommittedFilter<AuditLogDraft>({
    key: 'vibe365.audit-log.filter',
    defaultValue: DEFAULT_INPUTS,
    mode: 'localStorage',
  });

  const { data, isLoading } = useAuditLogs(toApiFilter(committed, page));

  const activeCount = [committed.entity, committed.action, committed.startDate, committed.endDate]
    .filter(Boolean).length;

  function handleSearch() { commit(); setPage(1); }
  function handleReset() { reset(); setPage(1); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Read-only system activity log</p>
      </div>

      <FilterBar
        activeCount={activeCount}
        testId="audit-log-filter-bar"
        actions={
          <FilterActions
            onSearch={handleSearch}
            onReset={handleReset}
            testIdPrefix="audit-log"
          />
        }
      >
        <FilterField label="Entity Type">
          <SearchInput
            value={draft.entity}
            onChange={(v) => setDraft({ entity: v })}
            onEnter={handleSearch}
            placeholder="e.g. Staff, BusinessClient"
            testId="audit-log-entity-filter"
          />
        </FilterField>

        <FilterField label="Action">
          <select
            value={draft.action}
            onChange={(e) => setDraft({ action: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="audit-log-action-filter"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a || 'All Actions'}</option>
            ))}
          </select>
        </FilterField>

        <DateRangePresetPicker
          value={{ startDate: draft.startDate, endDate: draft.endDate }}
          onChange={({ startDate, endDate }) =>
            setDraft({ startDate: startDate ?? '', endDate: endDate ?? '' })
          }
          className="sm:col-span-2"
          testId="audit-log-date-range"
        />
      </FilterBar>

      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Actor</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Entity</th>
                <th className="px-3 py-2 text-left font-medium">Entity ID</th>
                <th className="px-3 py-2 text-left font-medium">Changes</th>
                <th className="px-3 py-2 text-left font-medium">IP</th>
                <th className="px-3 py-2 text-left font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">Loading...</td></tr>
              ) : !data || !Array.isArray(data.data) || data.data.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No audit logs found.</td></tr>
              ) : (
                data.data.map((log: IAuditLog) => (
                  <tr key={log.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2">{log.actorName ?? log.actorId ?? '—'}</td>
                    <td className="px-3 py-2">
                      <Badge variant={ACTION_VARIANTS[log.action] ?? 'secondary'}>{log.action}</Badge>
                    </td>
                    <td className="px-3 py-2">{log.entity}</td>
                    <td className="px-3 py-2 font-mono text-xs">{log.entityId.slice(0, 12)}…</td>
                    <td className="px-3 py-2"><ChangesCell changes={log.changes} /></td>
                    <td className="px-3 py-2 text-xs">{log.ipAddress ?? '—'}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDateTimeSeconds(log.createdAt)}</td>
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
