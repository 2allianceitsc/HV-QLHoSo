'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import ToTrinhForm, { ToTrinhFormValues } from '@/components/to-trinh/ToTrinhForm';
import { useStore } from '@/store/useStore';
import { getPhanQuyenDuyet } from '@/lib/utils';

export default function SuaToTrinhPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toTrinhs, currentUser, updateToTrinh } = useStore();
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

  // Only draft submissions can be edited
  if (tt.trangThai !== 'nhap' || tt.nguoiTrinhId !== currentUser?.id) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <FileText size={48} style={{ color: 'var(--text-muted)' }} className="opacity-30" />
          <p style={{ color: 'var(--text-muted)' }}>Tờ trình này không thể chỉnh sửa</p>
          <Link href={`/to-trinh/${id}`} style={{ color: 'var(--primary)' }} className="text-sm hover:underline">Quay lại tờ trình</Link>
        </div>
      </AppLayout>
    );
  }

  const handleSave = (values: ToTrinhFormValues, gui: boolean) => {
    if (!values.veViec.trim()) return;
    const phanQuyen = getPhanQuyenDuyet(values.boPhan);
    updateToTrinh(id, {
      loai: values.loai,
      boPhan: values.boPhan,
      veViec: values.veViec,
      noiDung: values.noiDung,
      chiPhi: values.loai === 'MS' ? values.chiPhi : undefined,
      ngayBatDauHD: values.loai === 'NT' ? values.ngayBatDau : undefined,
      ngayHetHanHD: values.loai === 'NT' ? values.ngayHetHan : undefined,
      nhaCungCap: values.loai === 'NT' ? values.nhaCungCap : undefined,
      thamDinhId: phanQuyen.thamDinhId,
      pheDuyetId: phanQuyen.pheDuyetId,
      anhNoiDung: values.anhNoiDung.length > 0 ? values.anhNoiDung : undefined,
      trangThai: gui ? 'cho_duyet' : 'nhap',
    });
    router.push(`/to-trinh/${id}`);
  };

  return (
    <AppLayout>
      <Link href={`/to-trinh/${id}`} className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={16} /> Quay lại tờ trình
      </Link>
      <ToTrinhForm
        title={`Sửa tờ trình — ${tt.ma}`}
        initialValues={{
          loai: tt.loai,
          veViec: tt.veViec,
          noiDung: tt.noiDung,
          boPhan: tt.boPhan,
          chiPhi: tt.chiPhi ?? [],
          ngayBatDau: tt.ngayBatDauHD ?? '',
          ngayHetHan: tt.ngayHetHanHD ?? '',
          nhaCungCap: tt.nhaCungCap ?? '',
          anhNoiDung: tt.anhNoiDung ?? [],
        }}
        onSave={handleSave}
        onCancel={() => router.push(`/to-trinh/${id}`)}
        submitLabel="Lưu thay đổi"
      />
    </AppLayout>
  );
}
