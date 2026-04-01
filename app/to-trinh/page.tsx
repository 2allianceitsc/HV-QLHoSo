'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, ChevronRight } from 'lucide-react';
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Tờ trình</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Quản lý và theo dõi tờ trình duyệt hồ sơ</p>
          </div>
          <Link
            href="/to-trinh/tao"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: 'var(--primary)' }}
          >
            <Plus size={16} />
            Tạo tờ trình
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Tổng số', value: stats.total, color: 'var(--primary)' },
            { label: 'Chờ duyệt', value: stats.choDuyet, color: 'var(--warning)' },
            { label: 'Đã phê duyệt', value: stats.pheduyet, color: 'var(--success)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex rounded-lg p-1 gap-1" style={{ background: 'var(--surface-2)' }}>
              {(['MS', 'NT'] as LoaiToTrinh[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    background: tab === t ? 'var(--primary)' : 'transparent',
                    color: tab === t ? '#fff' : 'var(--text-secondary)',
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
                className="pl-8 pr-4 py-2 text-sm rounded-lg w-64"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['STT', 'Mã tờ trình', 'Bộ phận', 'Ngày trình', 'Nội dung', tab === 'MS' ? 'Số tiền' : 'Hết hạn HĐ', 'Thẩm định', 'Phê duyệt', 'Trạng thái', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                      <FileText size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Không có tờ trình nào</p>
                    </td>
                  </tr>
                ) : filtered.map((tt, idx) => {
                  const nguoiTrinh = getUserById(tt.nguoiTrinhId);
                  const thamDinh = getUserById(tt.thamDinhId);
                  const pheDuyet = getUserById(tt.pheDuyetId);
                  const tongTien = tt.chiPhi?.reduce((s, c) => s + c.soTien, 0) ?? 0;

                  return (
                    <tr
                      key={tt.id}
                      className="transition-colors hover:bg-[var(--surface-2)]"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-xs" style={{ color: 'var(--primary)' }}>{tt.ma}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--text-secondary)' }}>{tt.boPhan}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(tt.ngayTrinh)}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-sm" style={{ color: 'var(--text-primary)' }}>{tt.veViec}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {tab === 'MS' ? formatCurrency(tongTien) : formatDate(tt.ngayHetHanHD ?? '')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ApproverName
                          name={thamDinh?.hoTen ?? '—'}
                          approved={!!tt.thamDinhLuc}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ApproverName
                          name={pheDuyet?.hoTen ?? '—'}
                          approved={!!tt.pheDuyetLuc}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={tt.trangThai} />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/to-trinh/${tt.id}`} className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-70 whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                          Xem <ChevronRight size={12} />
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
