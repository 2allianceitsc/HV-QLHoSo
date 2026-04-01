'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, ChevronRight, BarChart2, Clock, CheckCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge, ApproverName } from '@/components/ui/StatusBadge';
import { useStore } from '@/store/useStore';
import { getUserById, formatCurrency, formatDate } from '@/lib/utils';
import { LoaiToTrinh } from '@/types';

export default function ToTrinhPage() {
  const { toTrinhs, currentUser } = useStore();
  const [tab, setTab] = useState<LoaiToTrinh>('MS');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return toTrinhs
      .filter(tt => tt.loai === tab)
      .filter(tt =>
        !q ||
        tt.ma.toLowerCase().includes(q) ||
        tt.veViec.toLowerCase().includes(q) ||
        tt.noiDung.toLowerCase().includes(q)
      );
  }, [toTrinhs, tab, search]);

  const stats = useMemo(() => ({
    total: toTrinhs.filter(t => t.loai === tab).length,
    choDuyet: toTrinhs.filter(t => t.loai === tab && t.trangThai === 'cho_duyet').length,
    pheduyet: toTrinhs.filter(t => t.loai === tab && t.trangThai === 'phe_duyet').length,
  }), [toTrinhs, tab]);

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
            { label: 'Chờ duyệt', value: stats.choDuyet, color: 'var(--warning)', bgColor: 'var(--warning-muted)', icon: Clock },
            { label: 'Đã phê duyệt', value: stats.pheduyet, color: 'var(--success)', bgColor: 'var(--success-muted)', icon: CheckCircle },
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
          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex rounded-lg p-1 gap-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
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
            <div className="relative sm:ml-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo mã hoặc nội dung..."
                className="pl-9 pr-4 py-2 text-sm rounded-lg w-64"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Mã tờ trình', 'Bộ phận', 'Ngày trình', 'Về việc', tab === 'MS' ? 'Số tiền' : 'Hết hạn HĐ', 'Thẩm định', 'Phê duyệt', 'Trạng thái', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                      <div className="inline-flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          <FileText size={24} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className="text-sm font-medium">Không có tờ trình nào</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((tt, idx) => {
                  const nguoiTrinh = getUserById(tt.nguoiTrinhId);
                  const thamDinhUser = getUserById(tt.thamDinhId);
                  const pheDuyetUser = getUserById(tt.pheDuyetId);
                  const tongTien = tt.chiPhi?.reduce((s, c) => s + c.soTien, 0) ?? 0;

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
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {tab === 'MS' ? formatCurrency(tongTien) : formatDate(tt.ngayHetHanHD ?? '')}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ApproverName
                          name={thamDinhUser?.hoTen ?? '—'}
                          approved={!!tt.thamDinhLuc}
                        />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ApproverName
                          name={pheDuyetUser?.hoTen ?? '—'}
                          approved={!!tt.pheDuyetLuc}
                        />
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
