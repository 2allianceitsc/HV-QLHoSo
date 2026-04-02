'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus, Search, FileText, ChevronRight, BarChart2, Clock, CheckCircle,
  Filter, X, Paperclip,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge, ApproverName } from '@/components/ui/StatusBadge';
import { useStore } from '@/store/useStore';
import { getUserById, formatCurrency, formatDate, TRANG_THAI_LABEL } from '@/lib/utils';
import { LoaiToTrinh, TrangThaiToTrinh } from '@/types';

const ALL_STATUSES: TrangThaiToTrinh[] = ['nhap', 'cho_duyet', 'tham_dinh', 'phe_duyet', 'tu_choi'];

export default function ToTrinhPage() {
  const { toTrinhs, currentUser } = useStore();
  const [tab, setTab] = useState<LoaiToTrinh>('MS');

  // Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<TrangThaiToTrinh | ''>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const hasActiveFilter = filterStatus !== '' || filterDateFrom !== '' || filterDateTo !== '';

  const clearFilters = () => {
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
  };

  // Department-based permission: nhan_vien only sees own dept
  const visibleToTrinhs = useMemo(() => {
    if (!currentUser || currentUser.role !== 'nhan_vien') return toTrinhs;
    return toTrinhs.filter(tt => tt.boPhan === currentUser.boPhan);
  }, [toTrinhs, currentUser]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return visibleToTrinhs
      .filter(tt => tt.loai === tab)
      .filter(tt => !q || tt.ma.toLowerCase().includes(q) || tt.veViec.toLowerCase().includes(q) || tt.noiDung.toLowerCase().includes(q) || (tt.nhaCungCap ?? '').toLowerCase().includes(q))
      .filter(tt => filterStatus === '' || tt.trangThai === filterStatus)
      .filter(tt => filterDateFrom === '' || tt.ngayTrinh >= filterDateFrom)
      .filter(tt => filterDateTo === '' || tt.ngayTrinh <= filterDateTo);
  }, [visibleToTrinhs, tab, search, filterStatus, filterDateFrom, filterDateTo]);

  const stats = useMemo(() => ({
    total: visibleToTrinhs.filter(t => t.loai === tab).length,
    choThamDinh: visibleToTrinhs.filter(t => t.loai === tab && t.trangThai === 'cho_duyet').length,
    pheDuyet: visibleToTrinhs.filter(t => t.loai === tab && t.trangThai === 'phe_duyet').length,
  }), [visibleToTrinhs, tab]);

  const msHeaders = ['#', 'Mã tờ trình', 'Bộ phận', 'Ngày trình', 'Về việc', 'Nhà cung cấp', 'Số tiền', 'HĐ đã ký', 'Thẩm định', 'Phê duyệt', 'Trạng thái', ''];
  const ntHeaders = ['#', 'Mã tờ trình', 'Bộ phận', 'Ngày trình', 'Về việc', 'Nhà cung cấp', 'Hết hạn HĐ', 'HĐ đã ký', 'Thẩm định', 'Phê duyệt', 'Trạng thái', ''];

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Tờ trình</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Quản lý và theo dõi tờ trình duyệt hồ sơ</p>
          </div>
          <Link
            href="/to-trinh/tao"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', boxShadow: '0 1px 3px color-mix(in srgb, var(--primary) 40%, transparent)' }}
          >
            <Plus size={16} />
            Tạo tờ trình
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Tổng số', value: stats.total, color: 'var(--primary)', bgColor: 'var(--primary-muted)', icon: BarChart2 },
            { label: 'Chờ thẩm định', value: stats.choThamDinh, color: 'var(--warning)', bgColor: 'var(--warning-muted)', icon: Clock },
            { label: 'Đã phê duyệt', value: stats.pheDuyet, color: 'var(--success)', bgColor: 'var(--success-muted)', icon: CheckCircle },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bgColor }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          {/* Toolbar: Tabs + Search + Filter */}
          <div className="px-4 py-3 space-y-3" style={{ borderBottom: showFilter ? 'none' : '1px solid var(--border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Tabs */}
              <div className="flex rounded-lg p-1 gap-1 flex-shrink-0" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {(['MS', 'NT'] as LoaiToTrinh[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="px-4 py-1.5 rounded-md text-sm font-semibold transition-all"
                    style={{
                      background: tab === t ? 'var(--primary)' : 'transparent',
                      color: tab === t ? '#fff' : 'var(--text-secondary)',
                      boxShadow: tab === t ? '0 1px 3px color-mix(in srgb, var(--primary) 30%, transparent)' : 'none',
                    }}
                  >
                    {t === 'MS' ? 'Tờ trình mua sắm' : 'Tờ trình nguyên tắc'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative sm:ml-auto flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo mã, nội dung, NCC..."
                  className="pl-9 pr-4 py-2 text-sm rounded-lg w-full"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilter(f => !f)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0"
                style={{
                  background: hasActiveFilter ? 'var(--primary-muted)' : 'var(--surface-2)',
                  border: `1px solid ${hasActiveFilter ? 'var(--primary)' : 'var(--border)'}`,
                  color: hasActiveFilter ? 'var(--primary)' : 'var(--text-secondary)',
                }}
              >
                <Filter size={14} />
                Lọc
                {hasActiveFilter && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />}
              </button>
            </div>

            {/* Filter panel */}
            {showFilter && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                <div className="flex flex-wrap gap-3 items-end">
                  {/* Status filter */}
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Trạng thái</label>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value as TrangThaiToTrinh | '')}
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)', fontSize: '13px', padding: '7px 10px' }}
                    >
                      <option value="">Tất cả trạng thái</option>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{TRANG_THAI_LABEL[s]}</option>)}
                    </select>
                  </div>

                  {/* Date from */}
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Từ ngày</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={e => setFilterDateFrom(e.target.value)}
                      style={{ fontSize: '13px', padding: '7px 10px' }}
                    />
                  </div>

                  {/* Date to */}
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Đến ngày</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={e => setFilterDateTo(e.target.value)}
                      style={{ fontSize: '13px', padding: '7px 10px' }}
                    />
                  </div>

                  {hasActiveFilter && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ color: 'var(--danger)', background: 'var(--danger-muted)', border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)' }}
                    >
                      <X size={12} /> Xoá bộ lọc
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filter divider */}
          {showFilter && <div style={{ borderBottom: '1px solid var(--border)' }} />}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {(tab === 'MS' ? msHeaders : ntHeaders).map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                      <div className="inline-flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          <FileText size={24} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className="text-sm font-medium">Không có tờ trình nào</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((tt, idx) => {
                  const thamDinhUser = getUserById(tt.thamDinhId);
                  const pheDuyetUser = getUserById(tt.pheDuyetId);
                  const tongTien = tt.chiPhi?.reduce((s, c) => s + c.soTien, 0) ?? 0;
                  // First supplier from chiPhi lines or NT nhaCungCap
                  const ncc = tab === 'MS'
                    ? (tt.chiPhi?.[0]?.nhaCungCap ?? '—')
                    : (tt.nhaCungCap ?? '—');

                  return (
                    <tr
                      key={tt.id}
                      className="transition-colors hover:bg-[var(--surface-2)] group"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td className="px-4 py-3.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-xs px-2 py-1 rounded-md" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>{tt.ma}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs" style={{ color: 'var(--text-secondary)' }}>{tt.boPhan}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(tt.ngayTrinh)}</td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tt.veViec}</p>
                      </td>
                      {/* Nhà cung cấp */}
                      <td className="px-4 py-3.5 max-w-[140px]">
                        <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{ncc}</p>
                      </td>
                      {/* Số tiền (MS) or Hết hạn HĐ (NT) */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {tab === 'MS' ? formatCurrency(tongTien) : formatDate(tt.ngayHetHanHD ?? '')}
                      </td>
                      {/* HĐ đã ký */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {tt.hopDongDaKy ? (
                          <a href={tt.hopDongDaKy.url} className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--success)' }}>
                            <Paperclip size={11} /> Đã đính kèm
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ApproverName name={thamDinhUser?.hoTen ?? '—'} approved={!!tt.thamDinhLuc} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ApproverName name={pheDuyetUser?.hoTen ?? '—'} approved={!!tt.pheDuyetLuc} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={tt.trangThai} />
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/to-trinh/${tt.id}`} className="inline-flex items-center gap-1 text-xs font-semibold transition-all px-2.5 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap" style={{ color: 'var(--primary)', background: 'var(--primary-muted)' }}>
                          Xem <ChevronRight size={11} />
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
