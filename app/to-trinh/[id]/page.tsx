'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Paperclip, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useStore } from '@/store/useStore';
import { getUserById, formatCurrency, formatDate } from '@/lib/utils';

export default function ChiTietToTrinhPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toTrinhs, currentUser, thamDinh, pheDuyet, tuChoi, guiToTrinh } = useStore();
  const tt = toTrinhs.find(t => t.id === id);

  if (!tt) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <FileText size={48} style={{ color: 'var(--text-muted)' }} className="opacity-30" />
          <p style={{ color: 'var(--text-muted)' }}>Không tìm thấy tờ trình</p>
          <Link href="/to-trinh" style={{ color: 'var(--primary)' }} className="text-sm hover:underline">Quay lại danh sách</Link>
        </div>
      </AppLayout>
    );
  }

  const nguoiTrinh = getUserById(tt.nguoiTrinhId);
  const thamDinhUser = getUserById(tt.thamDinhId);
  const pheDuyetUser = getUserById(tt.pheDuyetId);

  const canThamDinh = currentUser?.id === tt.thamDinhId && tt.trangThai === 'cho_duyet';
  const canPheDuyet = currentUser?.id === tt.pheDuyetId && tt.trangThai === 'tham_dinh';
  const canGui = tt.nguoiTrinhId === currentUser?.id && tt.trangThai === 'nhap';

  const tongTien = tt.chiPhi?.reduce((s, c) => s + c.soTien, 0) ?? 0;

  return (
    <AppLayout>
      <div>
        {/* Back */}
        <Link href="/to-trinh" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm font-bold" style={{ color: 'var(--primary)' }}>{tt.ma}</span>
              <StatusBadge status={tt.trangThai} />
            </div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{tt.veViec}</h1>
          </div>
        </div>

        <div className="space-y-4">
          {/* Thông tin chung */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Thông tin chung</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Row label="Loại tờ trình" value={tt.loai === 'MS' ? 'Tờ trình mua sắm' : 'Tờ trình nguyên tắc'} />
              <Row label="Người trình" value={nguoiTrinh?.hoTen ?? '—'} />
              <Row label="Bộ phận" value={tt.boPhan} />
              <Row label="Ngày trình" value={formatDate(tt.ngayTrinh)} />
            </div>
          </div>

          {/* Nội dung */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Nội dung đề xuất</h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {tt.noiDung || <span style={{ color: 'var(--text-muted)' }}>(Không có nội dung)</span>}
            </p>
          </div>

          {/* Chi phí (MS) */}
          {tt.loai === 'MS' && tt.chiPhi && tt.chiPhi.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Chi phí</h2>
              <div className="space-y-2">
                {tt.chiPhi.map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.maPhi} - {c.tenMaPhi}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.nhaCungCap}</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(c.soTien)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 px-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Tổng cộng</span>
                  <span className="text-base font-bold" style={{ color: 'var(--primary)' }}>{formatCurrency(tongTien)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Hợp đồng (NT) */}
          {tt.loai === 'NT' && (
            <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Thông tin hợp đồng</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <Row label="Nhà cung cấp" value={tt.nhaCungCap ?? '—'} />
                <div />
                <Row label="Ngày bắt đầu" value={formatDate(tt.ngayBatDauHD ?? '')} />
                <Row label="Ngày hết hạn" value={formatDate(tt.ngayHetHanHD ?? '')} />
              </div>
            </div>
          )}

          {/* Phê duyệt */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Tiến trình phê duyệt</h2>
            <div className="relative pl-6">
              {/* Vertical connector line */}
              <div className="absolute left-[11px] top-5 bottom-5 w-0.5" style={{ background: 'var(--border)' }} />
              <div className="space-y-5">
                <ApprovalStep
                  label="Thẩm định"
                  name={thamDinhUser?.hoTen ?? '—'}
                  approved={!!tt.thamDinhLuc}
                  time={tt.thamDinhLuc}
                  pending={tt.trangThai === 'cho_duyet'}
                />
                <ApprovalStep
                  label="Phê duyệt"
                  name={pheDuyetUser?.hoTen ?? '—'}
                  approved={!!tt.pheDuyetLuc}
                  time={tt.pheDuyetLuc}
                  pending={tt.trangThai === 'tham_dinh'}
                />
              </div>
            </div>
          </div>

          {/* File đính kèm */}
          {tt.fileDinhKem.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Tài liệu đính kèm</h2>
              <div className="space-y-2">
                {tt.fileDinhKem.map(f => (
                  <a key={f.id} href={f.url} className="flex items-center gap-3 p-3 rounded-lg hover:opacity-80 transition-opacity" style={{ background: 'var(--surface-2)' }}>
                    <Paperclip size={16} style={{ color: 'var(--primary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{f.ten}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {(canGui || canThamDinh || canPheDuyet) && (
            <div className="flex gap-3 pb-6">
              {canGui && (
                <button
                  onClick={() => { guiToTrinh(tt.id); router.refresh(); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--primary)', boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent)' }}
                >
                  Gửi tờ trình
                </button>
              )}
              {(canThamDinh || canPheDuyet) && (
                <>
                  <button
                    onClick={() => { tuChoi(tt.id); }}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: 'var(--danger-muted)', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => { canThamDinh ? thamDinh(tt.id) : pheDuyet(tt.id); }}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: 'var(--success)', boxShadow: '0 2px 8px color-mix(in srgb, var(--success) 30%, transparent)' }}
                  >
                    {canThamDinh ? 'Thẩm định' : 'Phê duyệt'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function ApprovalStep({ label, name, approved, time, pending }: {
  label: string; name: string; approved: boolean; time?: string; pending: boolean;
}) {
  const Icon = approved ? CheckCircle2 : pending ? Clock : XCircle;
  const color = approved ? 'var(--success)' : pending ? 'var(--warning)' : 'var(--text-muted)';
  const bgColor = approved ? 'var(--success-muted)' : pending ? 'var(--warning-muted)' : 'var(--surface-2)';

  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 relative z-10" style={{ background: bgColor, border: `1.5px solid ${color}` }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div className="flex-1 pb-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span className="text-sm font-bold" style={{ color }}>{name}</span>
          {pending && !approved && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}>Đang chờ</span>
          )}
        </div>
        {time && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(time).toLocaleString('vi-VN')}</p>}
      </div>
    </div>
  );
}
