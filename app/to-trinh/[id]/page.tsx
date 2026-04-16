'use client';
import { use, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Paperclip, CheckCircle2, XCircle, Clock, FileText,
  Pencil, Printer, X, AlertCircle, Upload,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useStore } from '@/store/useStore';
import { getUserById, formatCurrency, formatDate } from '@/lib/utils';

export default function ChiTietToTrinhPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toTrinhs, currentUser, thamDinh, pheDuyet, tuChoi, guiToTrinh, updateToTrinh } = useStore();
  const tt = toTrinhs.find(t => t.id === id);

  // Rejection modal state
  const [showTuChoiModal, setShowTuChoiModal] = useState(false);
  const [lyDoInput, setLyDoInput] = useState('');

  // Signed contract upload (mock)
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const isOwner = currentUser?.id === tt.nguoiTrinhId;
  const canEdit = isOwner && tt.trangThai === 'nhap';
  const canGui = isOwner && tt.trangThai === 'nhap';
  const canThamDinh = currentUser?.id === tt.thamDinhId && tt.trangThai === 'cho_duyet';
  const canPheDuyet = currentUser?.id === tt.pheDuyetId && tt.trangThai === 'tham_dinh';
  const isPheduyet = tt.trangThai === 'phe_duyet';

  const tongTien = tt.chiPhi?.reduce((s, c) => s + c.soTien, 0) ?? 0;

  const handleTuChoi = () => {
    if (!lyDoInput.trim()) return;
    tuChoi(tt.id, lyDoInput.trim());
    setShowTuChoiModal(false);
    setLyDoInput('');
  };

  const handleSignedContractUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Mock: store filename as hopDongDaKy
    updateToTrinh(tt.id, {
      hopDongDaKy: { id: `hdk-${Date.now()}`, ten: file.name, url: '#' },
    });
    e.target.value = '';
  };

  return (
    <AppLayout>
      {/* Print styles */}
      <style>{`
        @media print {
          /* Ẩn chrome */
          aside, header, nav, .no-print, button { display: none !important; }

          /* Page */
          body { background: white !important; font-family: 'Times New Roman', serif !important; color: #000 !important; margin: 0; }
          .print-full { max-width: 170mm !important; margin: 0 auto !important; padding: 10mm 5mm !important; }

          /* Cards phẳng */
          [style*="background: var(--surface)"], [style*="background:var(--surface)"] {
            background: white !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
          }

          /* Print-only elements */
          .print-header { display: flex !important; }
          .print-signature { display: table !important; }

          /* Tables */
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #888 !important; padding: 5px 8px !important; font-size: 10pt !important; }
          thead tr { background: #f0f0f0 !important; }

          /* Typography */
          h1 { font-size: 14pt !important; }
          h2 { font-size: 11pt !important; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
          p, span { font-size: 10pt !important; color: #000 !important; }

          /* Images */
          img { max-width: 100% !important; max-height: 80mm !important; object-fit: contain !important; }

          /* Page break */
          .print-signature { page-break-inside: avoid; }
        }
      `}</style>

      <div className="print-full">
        {/* Print header - chỉ hiển thị khi in */}
        <div className="print-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14pt', letterSpacing: '0.5px' }}>HV SYSTEM</div>
            <div style={{ fontSize: '9pt', color: '#555', marginTop: '2px' }}>Quy trình duyệt hồ sơ</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>PHIẾU ĐỀ XUẤT PHÊ DUYỆT</div>
            <div style={{ fontSize: '9pt', color: '#555', marginTop: '2px' }}>Mã: {tt.ma} | Ngày: {formatDate(tt.ngayTrinh)}</div>
          </div>
        </div>

        {/* Back + actions */}
        <div className="flex items-center justify-between mb-6 no-print">
          <Link href="/to-trinh" className="inline-flex items-center gap-2 text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} /> Quay lại danh sách
          </Link>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Link
                href={`/to-trinh/${tt.id}/sua`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <Pencil size={14} /> Sửa tờ trình
              </Link>
            )}
            {isPheduyet && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--primary-muted)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)', color: 'var(--primary)' }}
              >
                <Printer size={14} /> In / Xuất PDF
              </button>
            )}
          </div>
        </div>

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
          {/* Rejection reason banner */}
          {tt.trangThai === 'tu_choi' && tt.lyDoTuChoi && (
            <div className="rounded-xl p-4 flex gap-3" style={{ background: 'var(--danger-muted)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}>
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--danger)' }}>Lý do từ chối</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tt.lyDoTuChoi}</p>
              </div>
            </div>
          )}

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
            <p className="text-sm whitespace-pre-wrap leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              {tt.noiDung || <span style={{ color: 'var(--text-muted)' }}>(Không có nội dung)</span>}
            </p>
            {/* Inline images */}
            {tt.anhNoiDung && tt.anhNoiDung.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {tt.anhNoiDung.map((src, i) => (
                  <img key={i} src={src} alt={`Ảnh ${i + 1}`} className="rounded-lg max-h-48 object-contain border" style={{ borderColor: 'var(--border)' }} />
                ))}
              </div>
            )}
          </div>

          {/* Chi phí (MS) */}
          {tt.loai === 'MS' && tt.chiPhi && tt.chiPhi.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Chi phí</h2>
              <div className="space-y-2">
                {tt.chiPhi.map(c => (
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

          {/* Hợp đồng đã ký */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Hợp đồng đã ký kết</h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all no-print"
                style={{ color: 'var(--primary)', background: 'var(--primary-muted)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}
              >
                <Upload size={12} /> Tải lên
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleSignedContractUpload} />
            </div>
            {tt.hopDongDaKy ? (
              <a href={tt.hopDongDaKy.url} className="flex items-center gap-3 p-3 rounded-lg hover:opacity-80 transition-opacity" style={{ background: 'var(--success-muted)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)' }}>
                <Paperclip size={16} style={{ color: 'var(--success)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>{tt.hopDongDaKy.ten}</span>
              </a>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có hợp đồng đã ký. Tải lên sau khi ký kết.</p>
            )}
          </div>

          {/* Phê duyệt */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Tiến trình phê duyệt</h2>
            <div className="relative pl-6">
              <div className="absolute left-[11px] top-5 bottom-5 w-0.5" style={{ background: 'var(--border)' }} />
              <div className="space-y-5">
                <ApprovalStep
                  label="Thẩm định"
                  name={thamDinhUser?.hoTen ?? '—'}
                  approved={!!tt.thamDinhLuc}
                  rejected={tt.trangThai === 'tu_choi' && !tt.thamDinhLuc}
                  time={tt.thamDinhLuc}
                  pending={tt.trangThai === 'cho_duyet'}
                />
                <ApprovalStep
                  label="Phê duyệt"
                  name={pheDuyetUser?.hoTen ?? '—'}
                  approved={tt.trangThai === 'phe_duyet'}
                  rejected={tt.trangThai === 'tu_choi' && !!tt.thamDinhLuc}
                  time={tt.pheDuyetLuc}
                  pending={tt.trangThai === 'tham_dinh'}
                />
              </div>
            </div>
          </div>

          {/* File đính kèm (bản nháp) */}
          {tt.fileDinhKem.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Tài liệu đính kèm (bản nháp)</h2>
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
            <div className="flex gap-3 pb-6 no-print">
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
                    onClick={() => setShowTuChoiModal(true)}
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

          {/* Chữ ký - chỉ hiển thị khi in */}
          <div className="print-signature" style={{ display: 'none', width: '100%', marginTop: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Người trình', 'Thẩm định', 'Phê duyệt'].map(h => (
                    <th key={h} style={{ border: '1px solid #888', padding: '6px 10px', textAlign: 'center', fontSize: '10pt', background: '#f0f0f0', fontWeight: 'bold' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[0, 1, 2].map(i => (
                    <td key={i} style={{ border: '1px solid #888', height: '60px', padding: '6px 10px' }} />
                  ))}
                </tr>
                <tr>
                  <td style={{ border: '1px solid #888', padding: '6px 10px', textAlign: 'center', fontSize: '10pt' }}>
                    {nguoiTrinh?.hoTen ?? '—'}
                  </td>
                  <td style={{ border: '1px solid #888', padding: '6px 10px', textAlign: 'center', fontSize: '10pt' }}>
                    <div>{thamDinhUser?.hoTen ?? '—'}</div>
                    {tt.thamDinhLuc && <div style={{ fontSize: '9pt', color: '#555' }}>{new Date(tt.thamDinhLuc).toLocaleDateString('vi-VN')}</div>}
                  </td>
                  <td style={{ border: '1px solid #888', padding: '6px 10px', textAlign: 'center', fontSize: '10pt' }}>
                    <div>{pheDuyetUser?.hoTen ?? '—'}</div>
                    {tt.pheDuyetLuc && <div style={{ fontSize: '9pt', color: '#555' }}>{new Date(tt.pheDuyetLuc).toLocaleDateString('vi-VN')}</div>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rejection modal */}
      {showTuChoiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Xác nhận từ chối</h3>
              <button onClick={() => setShowTuChoiModal(false)} className="p-1 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Vui lòng nhập lý do từ chối tờ trình này:</p>
            <textarea
              value={lyDoInput}
              onChange={e => setLyDoInput(e.target.value)}
              rows={4}
              placeholder="Nhập lý do từ chối..."
              style={{ resize: 'vertical' }}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowTuChoiModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Huỷ
              </button>
              <button
                onClick={handleTuChoi}
                disabled={!lyDoInput.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: lyDoInput.trim() ? 'var(--danger)' : 'var(--border)',
                  cursor: lyDoInput.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
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

function ApprovalStep({ label, name, approved, rejected, time, pending }: {
  label: string; name: string; approved: boolean; rejected?: boolean; time?: string; pending: boolean;
}) {
  const Icon = approved ? CheckCircle2 : rejected ? XCircle : pending ? Clock : XCircle;
  const color = approved ? 'var(--success)' : rejected ? 'var(--danger)' : pending ? 'var(--warning)' : 'var(--text-muted)';
  const bgColor = approved ? 'var(--success-muted)' : rejected ? 'var(--danger-muted)' : pending ? 'var(--warning-muted)' : 'var(--surface-2)';

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
          {rejected && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}>Từ chối</span>
          )}
        </div>
        {time && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(time).toLocaleString('vi-VN')}</p>}
      </div>
    </div>
  );
}
