import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInCalendarDays } from 'date-fns';
import { Printer, Search, FileCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { SubmissionStatusBadge } from '@/components/submission/SubmissionStatusBadge';
import { DateRangePresetPicker } from '@/components/filters/DateRangePresetPicker';
import { useReportContracts } from '@/hooks/useHvReports';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—';
  return format(new Date(d), 'dd/MM/yyyy');
}

/** Returns days until expiry (negative = already expired). */
function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(new Date(endDate), today);
}

function DaysLeftCell({ endDate }: { endDate: string | null }) {
  const days = daysLeft(endDate);
  if (days === null) return <span className="text-muted-foreground">—</span>;
  if (days <= 0)
    return (
      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        Đã hết hạn {Math.abs(days)} ngày
      </span>
    );
  if (days <= 30)
    return <span className="text-amber-600 font-medium text-sm">{days} ngày</span>;
  return <span className="text-sm">{days} ngày</span>;
}

// ── Summary card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, colorClass = 'text-foreground' }: { label: string; value: number; colorClass?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-2 sm:px-4 py-2 sm:py-3">
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold mt-0.5 ${colorClass}`}>{value}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ReportContractsPage() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [contractStatus, setContractStatus] = useState('');
  const [endDateFrom, setEndDateFrom] = useState('');
  const [endDateTo, setEndDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  // Reset to page 1 on any filter change
  useEffect(() => { setPage(1); }, [q, contractStatus, endDateFrom, endDateTo]);

  const { data, isLoading } = useReportContracts({
    q: q || undefined,
    contractStatus: contractStatus || undefined,
    contractEndDateFrom: endDateFrom || undefined,
    contractEndDateTo: endDateTo || undefined,
    page,
    limit: 20,
  });

  const hasFilter = !!(q || contractStatus || endDateFrom || endDateTo);
  const clearFilters = () => { setQInput(''); setQ(''); setContractStatus(''); setEndDateFrom(''); setEndDateTo(''); };

  return (
    <div className="p-3 sm:p-6 space-y-4">

      {/* Header — hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl sm:text-2xl font-semibold">Báo cáo Hợp đồng</h1>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer size={15} className="mr-1.5" /> In / PDF
        </Button>
      </div>

      {/* Print-only heading */}
      <h1 className="hidden print:block text-xl font-bold text-center mb-2">Báo cáo Hợp đồng</h1>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
          <StatCard label="Tổng hợp đồng" value={data.summary.total} />
          <StatCard label="Sắp hết hạn (≤ 30 ngày)" value={data.summary.expiringSoon} colorClass="text-amber-600" />
          <StatCard label="Đã hết hạn" value={data.summary.expired} colorClass="text-red-600" />
        </div>
      )}

      {/* Filters — hidden when printing */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative w-full sm:max-w-xs sm:flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Mã TT / NCC / nội dung..."
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 h-10">
          {([
            { value: '', label: 'Tất cả' },
            { value: 'expiring_soon', label: 'Sắp hết hạn' },
            { value: 'expired', label: 'Đã hết hạn' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setContractStatus(opt.value)}
              className={cn(
                'h-full rounded-md px-3 text-sm font-medium transition-all',
                contractStatus === opt.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <DateRangePresetPicker
            label=""
            placeholder="Ngày hết hạn: Từ – Đến"
            value={{ startDate: endDateFrom, endDate: endDateTo }}
            onChange={({ startDate, endDate }) => { setEndDateFrom(startDate ?? ''); setEndDateTo(endDate ?? ''); }}
          />
        </div>

        {hasFilter && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearFilters}>
            Xóa lọc
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading && <div className="text-muted-foreground py-4">Đang tải...</div>}

      {data && (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2 print:hidden">
            {data.data.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Không có dữ liệu.</p>
            ) : data.data.map((item, idx) => {
              const signedContract = item.attachments[0];
              const rowNum = (page - 1) * 20 + idx + 1;
              return (
                <div key={item.id} className="border rounded-md p-3 bg-card space-y-1.5">
                  {/* Row 1: code + status + signed contract */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground shrink-0">{rowNum}.</span>
                    <Link
                      to={`/submissions/${item.id}`}
                      className="font-mono text-sm font-semibold text-primary hover:underline"
                    >
                      {item.code}
                    </Link>
                    <SubmissionStatusBadge status={item.status as import('@/api/submission.api').SubmissionStatus} />
                    {signedContract && (
                      <a href={signedContract.publicUrl} target="_blank" rel="noreferrer" title={signedContract.name}
                        className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium">
                        <FileCheck2 size={13} /> HĐ ký
                      </a>
                    )}
                  </div>

                  {/* Row 2: title */}
                  <p className="text-sm font-medium leading-snug line-clamp-2">{item.title}</p>

                  {/* Row 3: supplier + department */}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {item.supplier && <span>{item.supplier}</span>}
                    <span>{item.department.name}</span>
                  </div>

                  {/* Row 4: dates + days left */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{fmtDate(item.contractStartDate)} – {fmtDate(item.contractEndDate)}</span>
                    <DaysLeftCell endDate={item.contractEndDate} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block rounded-md border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead className="whitespace-nowrap">MÃ TT</TableHead>
                    <TableHead className="whitespace-nowrap">BỘ PHẬN</TableHead>
                    <TableHead className="whitespace-nowrap">VỀ VIỆC</TableHead>
                    <TableHead className="whitespace-nowrap">NHÀ CUNG CẤP</TableHead>
                    <TableHead className="whitespace-nowrap">NGÀY BẮT ĐẦU</TableHead>
                    <TableHead className="whitespace-nowrap">NGÀY HẾT HẠN</TableHead>
                    <TableHead className="whitespace-nowrap">CÒN LẠI</TableHead>
                    <TableHead className="w-16 text-center">HĐ KÝ</TableHead>
                    <TableHead className="whitespace-nowrap">TRẠNG THÁI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        Không có dữ liệu.
                      </TableCell>
                    </TableRow>
                  ) : data.data.map((item, idx) => {
                    const signedContract = item.attachments[0];
                    const rowNum = (page - 1) * 20 + idx + 1;
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell className="text-center text-xs text-muted-foreground">{rowNum}</TableCell>

                        <TableCell>
                          <Link
                            to={`/submissions/${item.id}`}
                            className="font-mono text-sm font-medium text-primary hover:underline"
                          >
                            {item.code}
                          </Link>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-sm">{item.department.name}</TableCell>

                        <TableCell className="max-w-[220px]">
                          <span className="block truncate text-sm" title={item.title}>{item.title}</span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-sm">{item.supplier ?? '—'}</TableCell>

                        <TableCell className="whitespace-nowrap text-sm font-mono">{fmtDate(item.contractStartDate)}</TableCell>

                        <TableCell className="whitespace-nowrap text-sm font-mono">{fmtDate(item.contractEndDate)}</TableCell>

                        <TableCell className="whitespace-nowrap">
                          <DaysLeftCell endDate={item.contractEndDate} />
                        </TableCell>

                        <TableCell className="text-center">
                          {signedContract ? (
                            <a href={signedContract.publicUrl} target="_blank" rel="noreferrer" title={signedContract.name}>
                              <FileCheck2 size={16} className="mx-auto text-green-600" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <SubmissionStatusBadge status={item.status as import('@/api/submission.api').SubmissionStatus} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {data.totalPages > 1 && (
            <div className="print:hidden">
              <TablePagination
                page={page}
                totalPages={data.totalPages}
                total={data.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
