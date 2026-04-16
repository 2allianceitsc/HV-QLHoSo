'use client';
import { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Image, X } from 'lucide-react';
import { ChiPhiDong, LoaiToTrinh } from '@/types';
import { MOCK_MA_PHI } from '@/lib/mockData';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/lib/utils';

export interface ToTrinhFormValues {
  loai: LoaiToTrinh;
  veViec: string;
  noiDung: string;
  boPhan: string;
  chiPhi: ChiPhiDong[];
  ngayBatDau: string;
  ngayHetHan: string;
  nhaCungCap: string;
  anhNoiDung: string[];
}

const BO_PHAN_LIST = ['IT', 'Kế toán', 'Marketing', 'Mua hàng', 'Hành chính'];

const EMPTY_VALUES: ToTrinhFormValues = {
  loai: 'MS',
  veViec: '',
  noiDung: '',
  boPhan: 'IT',
  chiPhi: [],
  ngayBatDau: '',
  ngayHetHan: '',
  nhaCungCap: '',
  anhNoiDung: [],
};

interface Props {
  title: string;
  initialValues?: Partial<ToTrinhFormValues>;
  onSave: (values: ToTrinhFormValues, gui: boolean) => void;
  onCancel: () => void;
  submitLabel: string;
}

export default function ToTrinhForm({ title, initialValues, onSave, onCancel, submitLabel }: Props) {
  const { currentUser } = useStore();
  const [values, setValues] = useState<ToTrinhFormValues>({ ...EMPTY_VALUES, boPhan: currentUser?.boPhan ?? 'IT', ...initialValues });
  const [errors, setErrors] = useState<Partial<Record<keyof ToTrinhFormValues, string>>>({});
  const imgInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ToTrinhFormValues>(key: K, val: ToTrinhFormValues[K]) =>
    setValues(v => ({ ...v, [key]: val }));

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!values.veViec.trim()) e.veViec = 'Vui lòng nhập tiêu đề';
    if (values.loai === 'NT') {
      if (!values.nhaCungCap.trim()) e.nhaCungCap = 'Vui lòng nhập tên nhà cung cấp';
      if (!values.ngayBatDau) e.ngayBatDau = 'Vui lòng chọn ngày bắt đầu';
      if (!values.ngayHetHan) e.ngayHetHan = 'Vui lòng chọn ngày hết hạn';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Chi phi handlers
  const addChiPhi = () => {
    const maPhi = MOCK_MA_PHI.find(m => m.boPhan === values.boPhan) ?? MOCK_MA_PHI[0];
    set('chiPhi', [...values.chiPhi, {
      id: `cp-${Date.now()}`,
      maPhi: maPhi.ma,
      tenMaPhi: maPhi.ten,
      soTien: 0,
      nhaCungCap: '',
    }]);
  };

  const updateChiPhi = (idx: number, field: keyof ChiPhiDong, val: string | number) => {
    const updated = values.chiPhi.map((c, i) => {
      if (i !== idx) return c;
      if (field === 'maPhi') {
        const mp = MOCK_MA_PHI.find(m => m.ma === val);
        return { ...c, maPhi: String(val), tenMaPhi: mp?.ten ?? '' };
      }
      return { ...c, [field]: val };
    });
    set('chiPhi', updated);
  };

  const removeChiPhi = (idx: number) => set('chiPhi', values.chiPhi.filter((_, i) => i !== idx));

  // Image handlers
  const readFileAsDataURL = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      if (src) setValues(v => ({ ...v, anhNoiDung: [...v.anhNoiDung, src] }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) readFileAsDataURL(file);
    });
  }, [readFileAsDataURL]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter(it => it.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    imageItems.forEach(item => {
      const file = item.getAsFile();
      if (file) readFileAsDataURL(file);
    });
  }, [readFileAsDataURL]);

  const removeAnh = (idx: number) => set('anhNoiDung', values.anhNoiDung.filter((_, i) => i !== idx));

  const tongTien = values.chiPhi.reduce((s, c) => s + (Number(c.soTien) || 0), 0);

  const filteredMaPhi = MOCK_MA_PHI.filter(m => m.boPhan === values.boPhan);

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>{title}</h1>

      <div className="space-y-4">
        {/* Loai + Bo phan */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Thông tin chung</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Loại tờ trình</label>
              <div className="flex rounded-lg p-1 gap-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {(['MS', 'NT'] as LoaiToTrinh[]).map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => set('loai', l)}
                    className="flex-1 py-1.5 rounded-md text-sm font-semibold transition-all"
                    style={{
                      background: values.loai === l ? 'var(--primary)' : 'transparent',
                      color: values.loai === l ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {l === 'MS' ? 'Mua sắm' : 'Nguyên tắc'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Bộ phận</label>
              <select
                value={values.boPhan}
                onChange={e => set('boPhan', e.target.value)}
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', fontSize: '13px', padding: '8px 10px' }}
              >
                {BO_PHAN_LIST.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Tiêu đề / Về việc <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              value={values.veViec}
              onChange={e => { set('veViec', e.target.value); if (errors.veViec) setErrors(v => ({ ...v, veViec: undefined })); }}
              placeholder="VD: IT - Mua máy tính bổ sung cho nhân sự mới..."
              style={{ fontSize: '13px', padding: '8px 10px', borderColor: errors.veViec ? 'var(--danger)' : 'var(--border)' }}
            />
            {errors.veViec && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.veViec}</p>}
          </div>
        </div>

        {/* Noi dung */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nội dung đề xuất</h2>
          <div>
            <textarea
              value={values.noiDung}
              onChange={e => set('noiDung', e.target.value)}
              onPaste={handlePaste}
              rows={5}
              placeholder="Nhập nội dung tờ trình... (có thể paste ảnh trực tiếp vào đây)"
              style={{ resize: 'vertical', fontSize: '13px', padding: '10px' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Có thể paste ảnh (Ctrl+V) hoặc tải ảnh lên bên dưới</p>
          </div>

          {/* Image upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Ảnh đính kèm nội dung</span>
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{ color: 'var(--primary)', background: 'var(--primary-muted)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}
              >
                <Image size={12} /> Thêm ảnh
              </button>
              <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageFiles(e.target.files)} />
            </div>
            {values.anhNoiDung.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {values.anhNoiDung.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt={`Ảnh ${i + 1}`} className="h-24 rounded-lg object-cover border" style={{ borderColor: 'var(--border)' }} />
                    <button
                      type="button"
                      onClick={() => removeAnh(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--danger)', color: '#fff' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chi phi (MS only) */}
        {values.loai === 'MS' && (
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chi phí</h2>
              <button
                type="button"
                onClick={addChiPhi}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{ color: 'var(--primary)', background: 'var(--primary-muted)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}
              >
                <Plus size={12} /> Thêm dòng
              </button>
            </div>

            {values.chiPhi.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có dòng chi phí nào. Nhấn "Thêm dòng" để thêm.</p>
            ) : (
              <div className="space-y-2">
                {values.chiPhi.map((c, idx) => (
                  <div key={c.id} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Mã phí</label>
                        <select
                          value={c.maPhi}
                          onChange={e => updateChiPhi(idx, 'maPhi', e.target.value)}
                          style={{ fontSize: '12px', padding: '6px 8px' }}
                        >
                          {filteredMaPhi.length > 0
                            ? filteredMaPhi.map(m => <option key={m.ma} value={m.ma}>{m.ma} - {m.ten}</option>)
                            : MOCK_MA_PHI.map(m => <option key={m.ma} value={m.ma}>{m.ma} - {m.ten}</option>)
                          }
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Nhà cung cấp</label>
                        <input
                          value={c.nhaCungCap}
                          onChange={e => updateChiPhi(idx, 'nhaCungCap', e.target.value)}
                          placeholder="Tên nhà cung cấp..."
                          style={{ fontSize: '12px', padding: '6px 8px' }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Số tiền (VNĐ)</label>
                        <input
                          type="number"
                          value={c.soTien || ''}
                          onChange={e => updateChiPhi(idx, 'soTien', Number(e.target.value))}
                          placeholder="0"
                          min={0}
                          style={{ fontSize: '12px', padding: '6px 8px' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeChiPhi(idx)}
                        className="mt-4 p-2 rounded-lg transition-all hover:opacity-80"
                        style={{ color: 'var(--danger)', background: 'var(--danger-muted)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-1 px-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Tổng cộng</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{formatCurrency(tongTien)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hop dong (NT only) */}
        {values.loai === 'NT' && (
          <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Thông tin hợp đồng</h2>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Nhà cung cấp <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                value={values.nhaCungCap}
                onChange={e => { set('nhaCungCap', e.target.value); if (errors.nhaCungCap) setErrors(v => ({ ...v, nhaCungCap: undefined })); }}
                placeholder="Tên công ty / nhà cung cấp..."
                style={{ fontSize: '13px', padding: '8px 10px', borderColor: errors.nhaCungCap ? 'var(--danger)' : 'var(--border)' }}
              />
              {errors.nhaCungCap && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.nhaCungCap}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Ngày bắt đầu <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={values.ngayBatDau}
                  onChange={e => { set('ngayBatDau', e.target.value); if (errors.ngayBatDau) setErrors(v => ({ ...v, ngayBatDau: undefined })); }}
                  style={{ fontSize: '13px', padding: '8px 10px', borderColor: errors.ngayBatDau ? 'var(--danger)' : 'var(--border)' }}
                />
                {errors.ngayBatDau && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.ngayBatDau}</p>}
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Ngày hết hạn <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={values.ngayHetHan}
                  onChange={e => { set('ngayHetHan', e.target.value); if (errors.ngayHetHan) setErrors(v => ({ ...v, ngayHetHan: undefined })); }}
                  style={{ fontSize: '13px', padding: '8px 10px', borderColor: errors.ngayHetHan ? 'var(--danger)' : 'var(--border)' }}
                />
                {errors.ngayHetHan && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.ngayHetHan}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => { if (validate()) onSave(values, false); }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {submitLabel}
          </button>
          <button
            type="button"
            onClick={() => { if (validate()) onSave(values, true); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent)' }}
          >
            Lưu &amp; Gửi ngay
          </button>
        </div>
      </div>
    </div>
  );
}
