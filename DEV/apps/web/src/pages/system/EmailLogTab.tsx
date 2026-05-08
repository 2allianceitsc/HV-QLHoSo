import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { formatDateTimeSeconds } from '@/lib/dateFormat';
import { getEmailLogs, getEmailLogById, type IEmailLogItem, type IEmailLogFilter } from '@/api/email.api';

const EVENT_LABELS: Record<string, string> = {
  E001: 'E001 — Tờ trình gửi đi (thông báo thẩm định)',
  E002: 'E002 — Thẩm định xong (thông báo phê duyệt)',
  E003: 'E003 — Đã phê duyệt (thông báo người trình)',
  E004: 'E004 — Từ chối (thông báo người trình)',
  E005: 'E005 — Tạo tài khoản mới',
  E006: 'E006 — Quên mật khẩu',
  E007: 'E007 — Admin reset mật khẩu',
};

const EVENT_CODES = Object.keys(EVENT_LABELS);

const LIMIT = 20;

function StatusIcon({ status }: { status: string }) {
  if (status === 'sent') return <CheckCircle2 size={16} className="text-green-600" />;
  if (status === 'failed') return <XCircle size={16} className="text-destructive" />;
  return <span className="text-xs text-muted-foreground">{status}</span>;
}

function TypeCell({ type }: { type: string }) {
  const label = EVENT_LABELS[type];
  const shortCode = EVENT_CODES.includes(type) ? type : type;
  return (
    <span
      className="font-mono text-xs text-muted-foreground cursor-default"
      title={label ?? type}
    >
      {shortCode}
    </span>
  );
}

// ─── Email Preview Dialog ─────────────────────────────────────────────────────

function EmailPreviewDialog({ emailId, onClose }: { emailId: string | null; onClose: () => void }) {
  const open = emailId !== null;
  const { data, isLoading } = useQuery({
    queryKey: ['email-log-detail', emailId],
    queryFn: () => getEmailLogById(emailId!),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isLoading ? 'Đang tải...' : (data?.subject ?? 'Nội dung email')}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-8 text-muted-foreground text-sm">
            Đang tải...
          </div>
        ) : data ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              <span className="font-medium text-foreground whitespace-nowrap">Đến:</span>
              <span className="text-muted-foreground">{data.to}</span>
              <span className="font-medium text-foreground whitespace-nowrap">Loại:</span>
              <span className="text-muted-foreground">{EVENT_LABELS[data.type] ?? data.type}</span>
              <span className="font-medium text-foreground whitespace-nowrap">Thời gian:</span>
              <span className="text-muted-foreground">{data.sentAt ? formatDateTimeSeconds(data.sentAt) : formatDateTimeSeconds(data.logCreatedAt)}</span>
            </div>
            <div className="flex-1 rounded border border-border overflow-hidden min-h-0">
              <iframe
                srcDoc={`<style>html,body,*{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;font-size:13px}</style>${data.bodyHtml}`}
                sandbox="allow-same-origin"
                title="Email preview"
                className="w-full h-full min-h-[320px]"
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function EmailLogTab() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const filter: IEmailLogFilter = {
    q: q || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit: LIMIT,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['email-logs-hv', filter],
    queryFn: () => getEmailLogs(filter),
    refetchInterval: 60_000,
  });

  const STATUS_TABS = [
    { value: '', label: 'Tất cả' },
    { value: 'sent', label: 'Đã gửi' },
    { value: 'failed', label: 'Thất bại' },
    { value: 'pending', label: 'Chờ gửi' },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm người nhận / tiêu đề..."
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === '__all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Loại sự kiện" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Tất cả loại</SelectItem>
            {EVENT_CODES.map((code) => (
              <SelectItem key={code} value={code}>{code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((st) => (
          <Button
            key={st.value}
            variant={statusFilter === st.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setStatusFilter(st.value); setPage(1); }}
          >
            {st.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap">NGƯỜI NHẬN</TableHead>
                <TableHead className="whitespace-nowrap">TIÊU ĐỀ</TableHead>
                <TableHead className="whitespace-nowrap w-16">LOẠI</TableHead>
                <TableHead className="whitespace-nowrap w-12 text-center">T.T</TableHead>
                <TableHead className="whitespace-nowrap">THỜI GIAN</TableHead>
                <TableHead className="whitespace-nowrap">GHI CHÚ LỖI</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Đang tải...</TableCell>
                </TableRow>
              ) : !data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Không có email nào.</TableCell>
                </TableRow>
              ) : (
                data.items.map((item: IEmailLogItem) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono max-w-[180px] truncate" title={item.to}>{item.to}</TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate" title={item.subject}>{item.subject}</TableCell>
                    <TableCell><TypeCell type={item.type} /></TableCell>
                    <TableCell className="text-center">
                      <StatusIcon status={item.status} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap font-mono">
                      {item.sentAt
                        ? formatDateTimeSeconds(item.sentAt)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={item.lastError ?? ''}>
                      {item.lastError || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPreviewId(item.id)}>
                        Xem
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {(data?.totalPages ?? 0) > 1 && (
        <TablePagination
          page={page}
          totalPages={data!.totalPages}
          total={data!.total}
          onPageChange={setPage}
        />
      )}

      <EmailPreviewDialog emailId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}
