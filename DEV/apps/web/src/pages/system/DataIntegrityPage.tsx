import { useState } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import {
  useIntegrityChecks,
  useIntegrityCheckDetails,
  INTEGRITY_CHECKS_KEY,
} from '@/hooks/useSystem';
import type { IIntegrityCheckSummary } from '@/api/system.api';
import { format } from 'date-fns';

// ── Severity helpers ──────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'error') {
    return (
      <span className="flex items-center gap-1 text-destructive text-xs font-medium">
        <AlertCircle className="h-3.5 w-3.5" /> Error
      </span>
    );
  }
  if (severity === 'warning') {
    return (
      <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
        <AlertTriangle className="h-3.5 w-3.5" /> Warning
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
      Info
    </span>
  );
}

function rowBg(check: IIntegrityCheckSummary): string {
  if (check.violationCount === 0) return '';
  if (check.severity === 'error') return 'bg-red-50/40 dark:bg-red-950/10';
  return 'bg-amber-50/40 dark:bg-amber-950/10';
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    try { return format(new Date(value), 'yyyy-MM-dd HH:mm:ss'); } catch { /* fall through */ }
  }
  return String(value);
}

// ── Inline detail expander ────────────────────────────────────────────────────

function DetailRows({ check, colSpan }: { check: IIntegrityCheckSummary; colSpan: number }) {
  const { data: rows = [], isLoading } = useIntegrityCheckDetails(check.checkId);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <tr>
      <td colSpan={colSpan} className="px-0 py-0">
        <div className="border-t border-border bg-muted/20">
          <div className="px-4 py-2 flex items-center justify-between border-b border-border/50">
            <span className="text-xs text-muted-foreground">
              {check.violationCount} violation{check.violationCount !== 1 ? 's' : ''} · max 100 rows
            </span>
            <span className="text-xs text-muted-foreground">{check.description}</span>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading detail…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No rows returned.</div>
          ) : (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-3 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/40">
                      {columns.map((col) => (
                        <td key={col} className="px-3 py-1.5 font-mono whitespace-nowrap max-w-[260px] truncate" title={formatCell(row[col])}>
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type SeverityFilter = 'all' | 'error' | 'warning';
type ViolationFilter = 'all' | 'violations';

export function DataIntegrityPage() {
  const qc = useQueryClient();
  const { data: checks = [], isLoading, isFetching, dataUpdatedAt, isError } = useIntegrityChecks();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [violationFilter, setViolationFilter] = useState<ViolationFilter>('all');

  const totalErrors = checks.filter((c) => c.severity === 'error' && c.violationCount > 0).length;
  const totalWarnings = checks.filter((c) => c.severity === 'warning' && c.violationCount > 0).length;
  const totalPassing = checks.filter((c) => c.violationCount === 0).length;
  const totalCheckErrors = checks.filter((c) => c.violationCount === -1).length;

  const filtered = checks.filter((c) => {
    if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
    if (violationFilter === 'violations' && c.violationCount === 0) return false;
    return true;
  });

  function violationDisplay(check: IIntegrityCheckSummary) {
    if (check.violationCount === -1) {
      return <Badge variant="outline" className="border-orange-400 text-orange-500 text-xs">Check error</Badge>;
    }
    if (check.violationCount > 0) {
      return (
        <Badge
          variant={check.severity === 'error' ? 'destructive' : 'outline'}
          className={check.severity === 'warning' ? 'border-amber-500 text-amber-600' : ''}
        >
          {check.violationCount}
        </Badge>
      );
    }
    return (
      <span className="flex items-center justify-end gap-1 text-xs text-green-600 font-medium">
        <CheckCircle2 className="h-3 w-3" /> OK
      </span>
    );
  }

  function handleRefresh() {
    void qc.invalidateQueries({ queryKey: [INTEGRITY_CHECKS_KEY] });
  }

  function toggleExpand(checkId: string) {
    setExpandedId((prev) => (prev === checkId ? null : checkId));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Running checks…
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> Failed to load checks. Try refreshing.
            </div>
          ) : (
            <div className="flex items-center gap-4 text-sm">
              {totalErrors > 0 && (
                <span className="flex items-center gap-1.5 text-destructive font-medium">
                  <AlertCircle className="h-4 w-4" />
                  {totalErrors} error{totalErrors !== 1 ? 's' : ''}
                </span>
              )}
              {totalWarnings > 0 && (
                <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  {totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}
                </span>
              )}
              {totalErrors === 0 && totalWarnings === 0 && totalCheckErrors === 0 && checks.length > 0 && (
                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  All {totalPassing} checks passing
                </span>
              )}
              {totalCheckErrors > 0 && (
                <span className="flex items-center gap-1.5 text-orange-500 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  {totalCheckErrors} check function error{totalCheckErrors !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-muted-foreground">
              Last run: {format(new Date(dataUpdatedAt), 'yyyy-MM-dd HH:mm:ss')} · {checks.length} checks total
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Run Checks
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-md border overflow-hidden text-xs">
          {(['all', 'error', 'warning'] as SeverityFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setSeverityFilter(v)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                severityFilter === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border overflow-hidden text-xs">
          {(['violations', 'all'] as ViolationFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setViolationFilter(v)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                violationFilter === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {v === 'violations' ? 'Violations only' : 'All checks'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Running integrity checks…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {violationFilter === 'violations'
                ? `All ${checks.length} checks passing — no violations found`
                : 'No checks match the selected filter'}
            </p>
            {violationFilter === 'violations' && checks.length > 0 && (
              <button
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={() => setViolationFilter('all')}
              >
                Show all {checks.length} checks
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium w-8" />
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Check</th>
                <th className="px-4 py-3 font-medium text-right">Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((check) => (
                <>
                  <tr
                    key={check.checkId}
                    className={`${rowBg(check)} ${check.violationCount !== 0 ? 'cursor-pointer hover:brightness-95' : ''} transition-all`}
                    onClick={() => check.violationCount !== 0 && toggleExpand(check.checkId)}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {check.violationCount !== 0 && (
                        expandedId === check.checkId
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={check.severity} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{check.category}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{check.checkName}</div>
                      {check.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {check.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {violationDisplay(check)}
                    </td>
                  </tr>
                  {expandedId === check.checkId && (
                    <DetailRows key={`${check.checkId}-detail`} check={check} colSpan={5} />
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
