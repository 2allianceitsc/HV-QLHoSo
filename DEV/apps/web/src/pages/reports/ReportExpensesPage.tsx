import { useState } from 'react';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { useReportExpenses } from '@/hooks/useHvReports';
import { hvReportsApi } from '@/api/hvReports.api';
import { exportExpensesToExcel } from '@/lib/exportExpenses';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DateRangePresetPicker } from '@/components/filters/DateRangePresetPicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { useToast } from '@/hooks/use-toast';

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function ReportExpensesPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const { data, isLoading } = useReportExpenses({
    fromDate: fromDate || undefined, toDate: toDate || undefined,
    supplier: supplier || undefined, page, limit: 30,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await hvReportsApi.expensesAll({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        supplier: supplier || undefined,
      });
      if (!all.items.length) {
        toast({ title: 'Không có dữ liệu để xuất', variant: 'destructive' });
        return;
      }
      exportExpensesToExcel(all, { fromDate, toDate, supplier });
      toast({ title: `Đã xuất ${all.items.length} dòng chi phí` });
    } catch {
      toast({ title: 'Không thể xuất Excel', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilter = !!(fromDate || toDate || supplier);

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Báo cáo chi tiết chi phí</h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download size={15} className="mr-1.5" />
          {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
        <DateRangePresetPicker
          label="Khoảng thời gian"
          value={{ startDate: fromDate, endDate: toDate }}
          onChange={({ startDate, endDate }) => {
            setFromDate(startDate ?? '');
            setToDate(endDate ?? '');
            setPage(1);
          }}
          className="w-full sm:w-72"
        />
        <div className="w-full sm:w-auto">
          <p className="text-xs text-muted-foreground mb-1">Nhà cung cấp</p>
          <Input placeholder="Lọc NCC..." value={supplier} onChange={(e) => { setSupplier(e.target.value); setPage(1); }} className="w-full sm:w-48" />
        </div>
        {hasActiveFilter && (
          <Button variant="outline" onClick={() => { setFromDate(''); setToDate(''); setSupplier(''); setPage(1); }}>
            Xóa lọc
          </Button>
        )}
      </div>

      {data?.summary && (
        <div className="grid grid-cols-3 gap-2 sm:gap-6 border rounded-lg p-3 sm:p-4 bg-muted/20">
          <div>
            <span className="text-muted-foreground text-xs sm:text-sm">Tổng chưa VAT</span>
            <p className="text-base sm:text-xl font-bold tabular-nums">{formatVND(data.summary.totalExVat)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs sm:text-sm">Tổng đã VAT</span>
            <p className="text-base sm:text-xl font-bold tabular-nums">{formatVND(data.summary.totalIncVat)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs sm:text-sm">Số dòng</span>
            <p className="text-base sm:text-xl font-bold">{data.total}</p>
          </div>
        </div>
      )}

      {isLoading && <div className="text-muted-foreground">Đang tải...</div>}

      {data && (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2">
            {data.items.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Không có dữ liệu.</p>
            )}
            {data.items.map((item) => (
              <div key={item.id} className="border rounded-md p-3 bg-card space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-primary">{item.submission.code}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(item.submission.submittedDate), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{item.submission.department.name}</span>
                  <span>·</span>
                  <span>{item.costCode.code}</span>
                </div>
                {item.supplier && (
                  <p className="text-xs text-muted-foreground truncate">{item.supplier}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm pt-0.5">
                  <span className="text-muted-foreground text-xs">Chưa VAT: <span className="tabular-nums text-foreground">{formatVND(item.amountExVat)}</span></span>
                  <span className="text-xs font-semibold tabular-nums">Đã VAT: {formatVND(item.amountIncVat)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tờ trình</TableHead>
                  <TableHead>Bộ phận</TableHead>
                  <TableHead>Mã phí</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead className="text-right">Chưa VAT</TableHead>
                  <TableHead className="text-right">Đã VAT</TableHead>
                  <TableHead>Ngày</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.submission.code}</TableCell>
                    <TableCell>{item.submission.department.name}</TableCell>
                    <TableCell>{item.costCode.code}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell className="text-right">{formatVND(item.amountExVat)}</TableCell>
                    <TableCell className="text-right">{formatVND(item.amountIncVat)}</TableCell>
                    <TableCell className="text-xs">{format(new Date(item.submission.submittedDate), 'dd/MM/yy')}</TableCell>
                  </TableRow>
                ))}
                {data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Không có dữ liệu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {data.totalPages > 1 && <TablePagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
