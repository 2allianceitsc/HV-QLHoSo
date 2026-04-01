'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Paperclip } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useStore } from '@/store/useStore';
import { MOCK_MA_PHI } from '@/lib/mockData';
import { getPhanQuyenDuyet, getUserById, today } from '@/lib/utils';
import { LoaiToTrinh, ChiPhiDong } from '@/types';
import Link from 'next/link';

const BO_PHANS = ['IT', 'Kế toán', 'Marketing', 'Mua hàng', 'Hành chính'];

export default function TaoToTrinhPage() {
  const router = useRouter();
  const { addToTrinh, guiToTrinh, currentUser } = useStore();

  const [loai, setLoai] = useState<LoaiToTrinh>('MS');
  const [veViec, setVeViec] = useState('');
  const [noiDung, setNoiDung] = useState('');
  const [boPhan, setBoPhan] = useState(currentUser?.boPhan ?? 'IT');

  // MS fields
  const [chiPhi, setChiPhi] = useState<ChiPhiDong[]>([
    { id: 'new-1', maPhi: '', tenMaPhi: '', soTien: 0, nhaCungCap: '' }
  ]);

  // NT fields
  const [ngayBatDau, setNgayBatDau] = useState('');
  const [ngayHetHan, setNgayHetHan] = useState('');
  const [nhaCungCap, setNhaCungCap] = useState('');

  const phanQuyen = getPhanQuyenDuyet(boPhan);
  const thamDinh = getUserById(phanQuyen.thamDinhId);
  const pheDuyet = getUserById(phanQuyen.pheDuyetId);

  const maMaPhiList = MOCK_MA_PHI.filter(mp => mp.boPhan === boPhan || true);

  const addChiPhi = () => {
    setChiPhi(prev => [...prev, { id: `new-${Date.now()}`, maPhi: '', tenMaPhi: '', soTien: 0, nhaCungCap: '' }]);
  };

  const removeChiPhi = (id: string) => {
    setChiPhi(prev => prev.filter(c => c.id !== id));
  };

  const updateChiPhi = (id: string, field: keyof ChiPhiDong, value: string | number) => {
    setChiPhi(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (field === 'maPhi') {
        const mp = MOCK_MA_PHI.find(m => m.ma === value);
        return { ...c, maPhi: String(value), tenMaPhi: mp?.ten ?? '' };
      }
      return { ...c, [field]: value };
    }));
  };

  const handleSave = (gui: boolean) => {
    if (!veViec.trim()) return;
    const id = addToTrinh({
      loai,
      nguoiTrinhId: currentUser?.id ?? 'u7',
      boPhan,
      ngayTrinh: today(),
      veViec,
      noiDung,
      trangThai: 'nhap',
      chiPhi: loai === 'MS' ? chiPhi : undefined,
      ngayBatDauHD: loai === 'NT' ? ngayBatDau : undefined,
      ngayHetHanHD: loai === 'NT' ? ngayHetHan : undefined,
      nhaCungCap: loai === 'NT' ? nhaCungCap : undefined,
      thamDinhId: phanQuyen.thamDinhId,
      pheDuyetId: phanQuyen.pheDuyetId,
      fileDinhKem: [],
    });
    if (gui) guiToTrinh(id);
    router.push('/to-trinh');
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link href="/to-trinh" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>

        <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Tạo tờ trình mới</h1>

        <div className="space-y-5">
          {/* Loại tờ trình */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Thông tin chung</h2>
            <div className="space-y-4">
              <div>
                <label>Loại tờ trình</label>
                <div className="flex gap-3">
                  {(['MS', 'NT'] as LoaiToTrinh[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setLoai(t)}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all"
                      style={{
                        background: loai === t ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface-2)',
                        borderColor: loai === t ? 'var(--primary)' : 'var(--border)',
                        color: loai === t ? 'var(--primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {t === 'MS' ? 'Tờ trình mua sắm' : 'Tờ trình nguyên tắc'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Người trình</label>
                  <input value={currentUser?.hoTen ?? ''} readOnly style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <label>Bộ phận</label>
                  <select value={boPhan} onChange={e => setBoPhan(e.target.value)}>
                    {BO_PHANS.map(bp => <option key={bp} value={bp}>{bp}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label>Về việc <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  value={veViec}
                  onChange={e => setVeViec(e.target.value)}
                  placeholder="Nhập tiêu đề tờ trình..."
                />
              </div>

              <div>
                <label>Nội dung đề xuất</label>
                <textarea
                  value={noiDung}
                  onChange={e => setNoiDung(e.target.value)}
                  rows={5}
                  placeholder="KG BLĐ xin phê duyệt,&#10;KG ... xin thẩm định,&#10;..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Chi phí (MS) */}
          {loai === 'MS' && (
            <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chi phí</h2>
                <button onClick={addChiPhi} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all" style={{ color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}>
                  <Plus size={13} /> Thêm dòng
                </button>
              </div>
              <div className="space-y-3">
                {chiPhi.map((c, idx) => (
                  <div key={c.id} className="rounded-lg p-3 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Dòng {idx + 1}</span>
                      {chiPhi.length > 1 && (
                        <button onClick={() => removeChiPhi(c.id)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label>Mã phí</label>
                        <select value={c.maPhi} onChange={e => updateChiPhi(c.id, 'maPhi', e.target.value)}>
                          <option value="">-- Chọn mã phí --</option>
                          {maMaPhiList.map(mp => (
                            <option key={mp.id} value={mp.ma}>{mp.ma} - {mp.ten}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Số tiền (VNĐ)</label>
                        <input
                          type="number"
                          value={c.soTien || ''}
                          onChange={e => updateChiPhi(c.id, 'soTien', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label>Nhà cung cấp</label>
                      <input
                        value={c.nhaCungCap}
                        onChange={e => updateChiPhi(c.id, 'nhaCungCap', e.target.value)}
                        placeholder="Tên nhà cung cấp hoặc 'Nhà cung cấp vãng lai'"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hợp đồng (NT) */}
          {loai === 'NT' && (
            <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Thông tin hợp đồng</h2>
              <div className="space-y-4">
                <div>
                  <label>Nhà cung cấp</label>
                  <input value={nhaCungCap} onChange={e => setNhaCungCap(e.target.value)} placeholder="Tên nhà cung cấp / đối tác" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label>Ngày bắt đầu HĐ</label>
                    <input type="date" value={ngayBatDau} onChange={e => setNgayBatDau(e.target.value)} />
                  </div>
                  <div>
                    <label>Ngày hết hạn HĐ</label>
                    <input type="date" value={ngayHetHan} onChange={e => setNgayHetHan(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phê duyệt & Đính kèm */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Phân quyền duyệt</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label>Người thẩm định (tự động)</label>
                <input value={thamDinh?.hoTen ?? ''} readOnly style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }} />
              </div>
              <div>
                <label>Người phê duyệt (tự động)</label>
                <input value={pheDuyet?.hoTen ?? ''} readOnly style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div>
              <label>Tài liệu đính kèm</label>
              <div
                className="rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-80"
                style={{ border: '2px dashed var(--border)', background: 'var(--surface-2)' }}
              >
                <Paperclip size={20} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click để đính kèm file</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, Word, Excel, Hình ảnh</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-6">
            <button
              onClick={() => handleSave(false)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Lưu nháp
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={!veViec.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: veViec.trim() ? 'var(--primary)' : 'var(--border)',
                cursor: veViec.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Gửi tờ trình
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
