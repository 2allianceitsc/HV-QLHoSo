'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import ToTrinhForm, { ToTrinhFormValues } from '@/components/to-trinh/ToTrinhForm';
import { useStore } from '@/store/useStore';
import { getPhanQuyenDuyet, today } from '@/lib/utils';

export default function TaoToTrinhPage() {
  const router = useRouter();
  const { addToTrinh, guiToTrinh, currentUser } = useStore();

  const handleSave = (values: ToTrinhFormValues, gui: boolean) => {
    if (!values.veViec.trim()) return;
    const phanQuyen = getPhanQuyenDuyet(values.boPhan);
    const id = addToTrinh({
      loai: values.loai,
      nguoiTrinhId: currentUser?.id ?? 'u7',
      boPhan: values.boPhan,
      ngayTrinh: today(),
      veViec: values.veViec,
      noiDung: values.noiDung,
      trangThai: 'nhap',
      chiPhi: values.loai === 'MS' ? values.chiPhi : undefined,
      ngayBatDauHD: values.loai === 'NT' ? values.ngayBatDau : undefined,
      ngayHetHanHD: values.loai === 'NT' ? values.ngayHetHan : undefined,
      nhaCungCap: values.loai === 'NT' ? values.nhaCungCap : undefined,
      thamDinhId: phanQuyen.thamDinhId,
      pheDuyetId: phanQuyen.pheDuyetId,
      fileDinhKem: [],
      anhNoiDung: values.anhNoiDung.length > 0 ? values.anhNoiDung : undefined,
    });
    if (gui) guiToTrinh(id);
    router.push('/to-trinh');
  };

  return (
    <AppLayout>
      <Link href="/to-trinh" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>
      <ToTrinhForm
        title="Tạo tờ trình mới"
        onSave={handleSave}
        onCancel={() => router.push('/to-trinh')}
        submitLabel="Lưu nháp"
      />
    </AppLayout>
  );
}
