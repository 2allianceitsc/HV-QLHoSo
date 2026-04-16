export type LoaiToTrinh = 'MS' | 'NT';

export type TrangThaiToTrinh = 'nhap' | 'cho_duyet' | 'tham_dinh' | 'phe_duyet' | 'tu_choi';

export interface User {
  id: string;
  username: string;
  hoTen: string;
  boPhan: string;
  chucVu: string;
  email: string;
  role: 'nhan_vien' | 'tham_dinh' | 'phe_duyet' | 'admin';
  avatarColor: string;
}

export interface MaPhi {
  id: string;
  ma: string;
  ten: string;
  boPhan: string;
}

export interface ChiPhiDong {
  id: string;
  maPhi: string;
  tenMaPhi: string;
  soTien: number;
  nhaCungCap: string;
}

export interface ToTrinh {
  id: string;
  loai: LoaiToTrinh;
  ma: string;
  nguoiTrinhId: string;
  boPhan: string;
  ngayTrinh: string;
  veViec: string;
  noiDung: string;
  trangThai: TrangThaiToTrinh;
  // MS fields
  chiPhi?: ChiPhiDong[];
  // NT fields
  ngayBatDauHD?: string;
  ngayHetHanHD?: string;
  nhaCungCap?: string;
  // Approval
  thamDinhId: string;
  pheDuyetId: string;
  thamDinhLuc?: string;
  pheDuyetLuc?: string;
  lyDoTuChoi?: string;
  // Files
  fileDinhKem: FileDinhKem[];
  hopDongDaKy?: FileDinhKem;
  anhNoiDung?: string[];
  // Meta
  createdAt: string;
}

export interface FileDinhKem {
  id: string;
  ten: string;
  url: string;
}

export interface PhanQuyenDuyet {
  boPhan: string;
  maPhi?: string;
  thamDinhId: string;
  pheDuyetId: string;
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}
