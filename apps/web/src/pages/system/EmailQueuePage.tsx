import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, RotateCcw, Copy, Check } from 'lucide-react';
import { DateRangePresetPicker } from '@/components/filters/DateRangePresetPicker';
import { TablePagination } from '@/components/ui/TablePagination';
import { formatDateTimeSeconds } from '@/lib/dateFormat';
import { getEmailQueue, retryEmail, type IEmailQueueItem, type IEmailQueueFilter } from '@/api/email.api';
import { toast } from '@/hooks/use-toast';

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  pending: 'outline',
  sending: 'secondary',
  sent: 'default',
  failed: 'destructive',
  ignored: 'secondary',
};

const STATUSES = ['', 'pending', 'sending', 'sent', 'ignored', 'failed'];
const STATUS_LABELS: Record<string, string> = {
  '': 'All',
  pending: 'Pending',
  sending: 'Sending',
  sent: 'Sent',
  ignored: 'Ignored',
  failed: 'Failed',
};

const LIMIT = 20;

export function EmailQueuePage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<IEmailQueueFilter>({ page: 1, limit: LIMIT });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['email-queue', appliedFilter],
    queryFn: () => getEmailQueue(appliedFilter),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: retryEmail,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['email-queue'] });
      toast({ title: 'Email queued for retry' });
    },
    onError: () => {
      toast({ title: 'Failed to retry email', variant: 'destructive' });
    },
  });

  function applyFilters(nextPage = 1) {
    setPage(nextPage);
    setAppliedFilter({
      page: nextPage,
      limit: LIMIT,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      subject: subjectFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }

  function handleStatusChange(s: string) {
    setStatusFilter(s);
    setPage(1);
    setAppliedFilter((prev) => ({ ...prev, status: s || undefined, page: 1 }));
  }

  function handleReset() {
    setStatusFilter('');
    setTypeFilter('');
    setSubjectFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setAppliedFilter({ page: 1, limit: LIMIT });
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    setAppliedFilter((prev) => ({ ...prev, page: nextPage }));
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Queue</h1>
          <p className="text-sm text-muted-foreground">Outbound emails — status, retry counts, and processing notes</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              statusFilter === s
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>Type</Label>
            <Input
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder="e.g. otp, welcome"
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className="space-y-1">
            <Label>Subject contains</Label>
            <Input
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              placeholder="Search subject..."
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <DateRangePresetPicker
            value={{ startDate, endDate }}
            onChange={({ startDate: s, endDate: e }) => {
              setStartDate(s ?? '');
              setEndDate(e ?? '');
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => applyFilters()}>Search</Button>
          <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">To</th>
                <th className="px-3 py-2 text-left font-medium">Subject</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Retry #</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Sent At</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Queued At</th>
                <th className="px-3 py-2 text-left font-medium">Note / Error</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : !data?.items?.length ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No emails found.</td>
                </tr>
              ) : (
                data.items.map((item: IEmailQueueItem) => (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs max-w-[180px] truncate" title={item.to}>{item.to}</td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate" title={item.subject}>{item.subject}</td>
                    <td className="px-3 py-2 text-xs font-mono">{item.type}</td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_VARIANTS[item.status] ?? 'secondary'} className="text-xs capitalize">
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-center">{item.retryCount}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap font-mono">
                      {item.sentAt ? formatDateTimeSeconds(item.sentAt) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap font-mono">
                      {formatDateTimeSeconds(item.logCreatedAt)}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs max-w-[220px] ${item.lastError ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {(item.note ?? item.lastError) ? (
                        <div className="flex items-center gap-2 group">
                          <span className="truncate flex-1" title={item.note ?? item.lastError ?? ''}>
                            {item.note ?? item.lastError}
                          </span>
                          <button
                            onClick={() => handleCopy(item.note ?? item.lastError ?? '', item.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                            title="Copy to clipboard"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {item.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={retryMutation.isPending}
                          onClick={() => retryMutation.mutate(item.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={data?.total}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
