import { useState } from 'react';
import { useReportSummary } from '@/hooks/useHvReports';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp', pending_review: 'Chờ thẩm định', in_review: 'Đang thẩm định',
  approved: 'Đã duyệt', rejected: 'Từ chối',
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));
const YEARS = [2024, 2025, 2026, 2027].map((y) => ({ value: y, label: String(y) }));

export function ReportSummaryPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>();
  const { data, isLoading } = useReportSummary({ year, month });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Báo cáo tổng hợp</h1>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(+v)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map((y) => <SelectItem key={y.value} value={String(y.value)}>{y.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={month ? String(month) : '__all__'} onValueChange={(v) => setMonth(v === '__all__' ? undefined : +v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Tất cả tháng" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả tháng</SelectItem>
              {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <div className="text-muted-foreground">Đang tải...</div>}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="col-span-2 md:col-span-1 border rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{data.total}</p>
              <p className="text-sm text-muted-foreground">Tổng tờ trình</p>
            </div>
            {data.byStatus.map((b) => (
              <div key={b.status} className="border rounded-lg p-4 text-center">
                <p className="text-3xl font-bold">{b.count}</p>
                <p className="text-sm text-muted-foreground">{STATUS_LABEL[b.status] ?? b.status}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-semibold mb-3">Theo bộ phận</h2>
              <div className="space-y-2">
                {data.byDepartment.map((d) => (
                  <div key={d.departmentId} className="flex items-center gap-3">
                    <span className="w-36 text-sm truncate">{d.departmentName}</span>
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-primary h-3 rounded-full"
                        style={{ width: `${data.total > 0 ? (d.count / data.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-3">Theo tháng</h2>
              {data.byMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có dữ liệu</p>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const maxCount = Math.max(...data.byMonth.map((m) => m.count), 1);
                    return data.byMonth.map((m) => {
                      const [, mm] = m.month.split('-');
                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="w-8 text-sm text-right shrink-0">T{parseInt(mm, 10)}</span>
                          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-primary h-3 rounded-full"
                              style={{ width: `${(m.count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{m.count}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
