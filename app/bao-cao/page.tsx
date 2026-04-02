'use client';
import { useState, useMemo } from 'react';
import { Search, Printer, AlertTriangle, CheckCircle, Clock, Filter, X } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useStore } from '@/store/useStore';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

const WARNING_DAYS = 30;

function daysUntilExpiry(dateStr: string): number {
  if (!dateStr) return Infinity;
  const exp = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function BaoCaoPage() {
  const { toTrinhs } = useStore();

  const [search, setSearch] = useState('');
  const [filterExpiry, setFilterExpiry] = useState<'all' | 'warning' | 'expired'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const ntContracts = useMemo(() => toTrinhs.filter(tt => tt.loai === 'NT'), [toTrinhs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return ntContracts
      .filter(tt => !q || tt.ma.toLowerCase().includes(q) || tt.veViec.toLowerCase().includes(q) || (tt.nhaCungCap ?? '').toLowerCase().includes(q))
      .filter(tt => {
        if (filterExpiry === 'all') return true;
        const days = daysUntilExpiry(tt.ngayHetHanHD ?? '');
        if (filterExpiry === 'expired') return days < 0;
        if (filterExpiry === 'warning') return days >= 0 && days <= WARNING_DAYS;
        return true;
      })
      .filter(tt => filterDateFrom === '' || (tt.ngayHetHanHD ?? '') >= filterDateFrom)
      .filter(tt => filterDateTo === '' || (tt.ngayHetHanHD ?? '') <= filterDateTo)
      .sort((a, b) => (a.ngayHetHanHD ?? '').localeCompare(b.ngayHetHanHD ?? ''));
  }, [ntContracts, search, filterExpiry, filterDateFrom, filterDateTo]);

  const stats = useMemo(() => ({
    total: ntContracts.length,
    expiring: ntContracts.filter(tt => { const d = daysUntilExpiry(tt.ngayHetHanHD ?? ''); return d >= 0 && d <= WARNING_DAYS; }).length,
    expired: ntContracts.filter(tt => daysUntilExpiry(tt.ngayHetHanHD ?? '') < 0).length,
  }), [ntContracts]);

  const hasActiveFilter = filterExpiry !== 'all' || filterDateFrom !== '' || filterDateTo !== '';

  const clearFilters = () => {
    setFilterExpiry('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
  };

  return (
    <AppLayout>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Báo cáo hợp đồng</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Tổng hợp tờ trình nguyên tắc — theo dõi hạn hợp đồng</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 no-print"
            style={{ background: 'var(--primary-muted)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)', color: 'var(--primary)' }}
          >
            <Printer size={16} /> In / Xuất PDF
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Tổng hợp đồng', value: stats.total, color: 'var(--primary)', bg: 'var(--primary-muted)', icon: CheckCircle },
            { label: 'Sắp hết hạn (≤30 ngày)', value: stats.expiring, color: 'var(--warning)', bg: 'var(--warning-muted)', icon: AlertTriangle },
            { label: 'Đã hết hạn', value: stats.expired, color: 'var(--danger)', bg: 'var(--danger-muted)', icon: Clock },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          {/* Toolbar */}
          <div className="px-4 py-3 space-y-3" style={{ borderBottom: showFilter ? 'none' : '1px solid var(--border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 no-print">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo mã, NCC, nội dung..."
                  className="pl-9 pr-4 py-2 text-sm rounded-lg w-full"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex gap-2">
                {/* Quick expiry filter */}
                {(['all', 'warning', 'expired'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setFilterExpiry(v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: filterExpiry === v
                        ? v === 'warning' ? 'var(--warning-muted)' : v === 'expired' ? 'var(--danger-muted)' : 'var(--primary-muted)'
                        : 'var(--surface-2)',
                      color: filterExpiry === v
                        ? v === 'warning' ? 'var(--warning)' : v === 'expired' ? 'var(--danger)' : 'var(--primary)'
                        : 'var(--text-secondary)',
                      border: `1px solid ${filterExpiry === v
                        ? v === 'warning' ? 'color-mix(in srgb, var(--warning) 40%, transparent)' : v === 'expired' ? 'color-mix(in srgb, var(--danger) 40%, transparent)' : 'color-mix(in srgb, var(--primary) 40%, transparent)'
                        : 'var(--border)'}`,
                    }}
                  >
                    {v === 'all' ? 'Tất cả' : v === 'warning' ? '⚠ Sắp hết hạn' : '✕ Đã hết hạn'}
                  </button>
                ))}

                <button
                  onClick={() => setShowFilter(f => !f)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: hasActiveFilter && (filterDateFrom || filterDateTo) ? 'var(--primary-muted)' : 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Filter size={12} /> Ngày
                </button>
              </div>
            </div>

            {showFilter && (
              <div className="rounded-xl p-3 flex flex-wrap gap-3 items-end no-print" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Hết hạn từ</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ fontSize: '13px', padding: '7px 10px' }} />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Hết hạn đến</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ fontSize: '13px', padding: '7px 10px' }} />
                </div>
                {hasActiveFilter && (
                  <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium" style={{ color: 'var(--danger)', background: 'var(--danger-muted)', border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)' }}>
                    <X size={12} /> Xoá lọc
                  </button>
                )}
              </div>
            )}
          </div>

          {showFilter && <div style={{ borderBottom: '1px solid var(--border)' }} />}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Mã tờ trình', 'Bộ phận', 'Về việc', 'Nhà cung cấp', 'Ngày bắt đầu', 'Ngày hết hạn', 'Còn lại', 'HĐ đã ký', 'Trạng thái', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                      <p className="text-sm font-medium">Không có hợp đồng nào phù hợp</p>
                    </td>
                  </tr>
                ) : filtered.map((tt, idx) => {
                  const days = daysUntilExpiry(tt.ngayHetHanHD ?? '');
                  const isExpired = days < 0;
                  const isWarning = !isExpired && days <= WARNING_DAYS;

                  return (
                    <tr key={tt.id} className="transition-colors hover:bg-[var(--surface-2)]" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-xs px-2 py-1 rounded-md" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>{tt.ma}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{tt.boPhan}</td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tt.veViec}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs max-w-[140px]">
                        <p className="truncate" style={{ color: 'var(--text-secondary)' }}>{tt.nhaCungCap ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(tt.ngayBatDauHD ?? '')}</td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap font-semibold" style={{ color: isExpired ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {formatDate(tt.ngayHetHanHD ?? '')}
                      </td>
                      {/* Days remaining */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>
                            <AlertTriangle size={10} /> Hết hạn {Math.abs(days)}n
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>
                            <AlertTriangle size={10} /> Còn {days} ngày
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Còn {days} ngày</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: tt.hopDongDaKy ? 'var(--success)' : 'var(--text-muted)' }}>
                        {tt.hopDongDaKy ? '✓ Đã ký' : '—'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={tt.trangThai} />
                      </td>
                      <td className="px-4 py-3.5 no-print">
                        <Link href={`/to-trinh/${tt.id}`} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap" style={{ color: 'var(--primary)', background: 'var(--primary-muted)' }}>
                          Xem
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
