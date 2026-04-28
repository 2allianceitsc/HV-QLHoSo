# 01 — Tổng Quan: Mockup vs BA

> So sánh mức độ phủ giữa mockup hiện tại và BA requirements v2.0.0.

## 1. Phủ màn hình (Screen List — BA §2)

| ID | Màn hình BA yêu cầu | Route BA | Mockup | Ghi chú |
|----|---------------------|----------|--------|---------|
| S01 | Đăng nhập | `/login` | ⚠️ Lệch | Đang là **user-picker demo**, không có password/JWT |
| S02 | Đổi mật khẩu lần đầu | `/change-password` | ❌ | Chưa có |
| S03 | Quên mật khẩu | `/forgot-password` | ❌ | Chưa có |
| S04 | Reset mật khẩu | `/reset-password` | ❌ | Chưa có |
| S05 | Danh sách tờ trình | `/to-trinh` | ✅ | Đầy đủ filter, search, tab MS/NT, stats |
| S06 | Tạo tờ trình | `/to-trinh/tao` | ✅ | Form MS + NT, upload ảnh, chi phí |
| S07 | Chi tiết tờ trình | `/to-trinh/[id]` | ✅ | Có timeline, in PDF, upload HĐ ký |
| S08 | Sửa tờ trình | `/to-trinh/[id]/sua` | ⚠️ Lệch | Chỉ cho sửa `nhap`, **không cho `tu_choi`** (vi phạm BA §4.5) |
| S09 | **Báo cáo tổng hợp** (dashboard thống kê theo trạng thái/bộ phận/tháng) | `/bao-cao` | ⚠️ Lệch | Mockup `/bao-cao` đang là **theo dõi hạn HĐ NT**, không phải dashboard tổng hợp như BA |
| S10 | Báo cáo chi tiết chi phí | `/bao-cao/chi-phi` | ❌ | Chưa có |
| S11 | Quản lý người dùng | `/admin/users` | ❌ | Chưa có |
| S12 | Quản lý bộ phận | `/admin/bo-phan` | ❌ | Chưa có |
| S13 | Quản lý mã phí | `/admin/ma-phi` | ❌ | Chưa có |
| S14 | Cấu hình phân quyền duyệt | `/admin/phan-quyen` | ❌ | Chưa có (đang hard-code trong `lib/mockData.ts:PHAN_QUYEN_DUYET`) |
| S15 | Hồ sơ cá nhân | `/profile` | ❌ | Chưa có |

| ID | Modal BA yêu cầu | Mockup | Ghi chú |
|----|------------------|--------|---------|
| M01 | Xác nhận từ chối | ✅ | Có textarea nhập lý do |
| M02 | Xác nhận xoá tờ trình | ❌ | Mockup chưa có nút xoá nào trên UI (chỉ có action store) |
| M03 | Upload file | ⚠️ | Mockup mock với url `#`, không upload thật |
| M04 | Xem trước hình ảnh (lightbox) | ❌ | Ảnh nhúng chỉ hiển thị, click không zoom |
| M05 | Filter panel | ✅ | Đã có panel lọc trượt |
| M06 | Toast notification | ✅ | Auto-close sau 4s |
| M07 | Confirm gửi tờ trình | ❌ | Bấm "Gửi" là gửi luôn, không hỏi xác nhận |

**Tổng kết:** 7/15 screen + 4/7 modal đã có (≈ 50%). Phần thiếu chủ yếu là **auth + admin + báo cáo đúng nghĩa**.

---

## 2. Phủ vai trò (Role — BA §3)

| Role | BA định nghĩa | Mockup | Ghi chú |
|------|---------------|--------|---------|
| `nhan_vien` | Tạo & quản lý tờ trình bộ phận mình | ✅ | Có lọc theo `boPhan` ở `app/to-trinh/page.tsx:50-52` |
| `tham_dinh` | Thẩm định tờ trình được phân công | ✅ | Có check `currentUser.id === thamDinhId` |
| `phe_duyet` | Phê duyệt tờ trình được phân công | ✅ | Có check `currentUser.id === pheDuyetId` |
| `admin` | Toàn quyền | ⚠️ | Định nghĩa trong type nhưng **không có UI/menu/page admin** |

### Sidebar menu theo role

BA §11 định nghĩa menu khác nhau cho từng role:
- `nhan_vien`: chỉ Tờ trình
- `tham_dinh`: Tờ trình + Báo cáo
- `phe_duyet`: Tờ trình + Báo cáo + Báo cáo chi phí
- `admin`: tất cả + 4 menu admin

**Mockup**: Sidebar trong `components/layout/AppLayout.tsx:11-15` hard-code 3 mục giống nhau cho mọi role:
```ts
const NAV = [
  { href: '/to-trinh', label: 'Tờ trình' },
  { href: '/bao-cao', label: 'Báo cáo HĐ' },
  { href: '/introduce', label: 'Giới thiệu' },
];
```

→ Cần refactor menu theo role.

---

## 3. Phủ data model (Entity — BA §5)

| Entity BA | Mockup | Field thiếu |
|-----------|--------|-------------|
| `User` | ⚠️ | Thiếu `passwordHash`, `isActive`, `isFirstLogin`, `lastLoginAt` |
| `BoPhan` | ❌ | Đang là string trong `User.boPhan`, không phải entity riêng |
| `PhanQuyenDuyet` | ⚠️ | Có nhưng dạng const array, không CRUD được |
| `MaPhi` | ⚠️ | Có nhưng không có `isActive`, không CRUD |
| `ToTrinh` | ⚠️ | Thiếu `createdBy`, `updatedAt`, `isDeleted`. `boPhan` lưu tên thay vì FK ID |
| `ChiPhiDong` | ✅ | Có đủ |
| `VatTuCoSan` | ✅ | Có đủ |
| `FileDinhKem` | ⚠️ | Thiếu `loaiFile` (`dinh_kem` vs `hop_dong_ky`), `mimeType`, `sizeBytes`, `uploadedBy` |
| `LichSuToTrinh` (audit) | ❌ | **Hoàn toàn chưa có** — mất hoàn toàn lịch sử thay đổi |
| `RefreshToken` | ❌ | Cần khi có auth thật |
| `PasswordResetToken` | ❌ | Cần khi có auth thật |
| `DanhMucVatTu` | ✅ | Có `MOCK_VAT_TU` |

→ Mockup đủ cho demo, nhưng **thiếu hoàn toàn audit trail** (LichSuToTrinh) — đây là yêu cầu compliance quan trọng.

---

## 4. Phủ luồng nghiệp vụ (Flow — BA §4)

| Luồng BA | Mockup | Ghi chú |
|----------|--------|---------|
| 4.1 Đăng nhập | ⚠️ | Login = chọn user, không có password/refresh |
| 4.2 Refresh token | ❌ | Không có |
| 4.3 Tạo tờ trình | ✅ | Đủ cho cả MS và NT |
| 4.4 Duyệt tờ trình (workflow chính) | ✅ | Có đủ thẩm định / phê duyệt / từ chối |
| 4.5 **Sửa & gửi lại sau từ chối** | ❌ | **Mockup chặn sửa khi `tu_choi`** — bug. Xem [04-bug-mockup.md](04-bug-mockup.md) |
| 4.6 Upload file | ⚠️ | Mock với `url: '#'` |
| 4.7 Tìm kiếm & lọc | ✅ | Đầy đủ |
| 4.8 Báo cáo | ❌ | Chưa có dashboard tổng hợp & báo cáo chi phí |

---

## 5. Phủ error handling (BA §9)

BA định nghĩa 14 mã lỗi E001-E014 + E500. Mockup không có error handling chuẩn nào (toàn bộ là client-side với toast).

**Cần khi sang production:**
- E001 sai login, E002 tài khoản khóa, E003 không quyền
- E006 chuyển trạng thái không hợp lệ
- E012 lý do từ chối rỗng — đã có check ở UI nhưng chưa có error code
- E013 tờ trình MS không có chi phí — **mockup chưa check** (xem [04-bug-mockup.md](04-bug-mockup.md))

---

## 6. Phủ notification (BA §10)

### 10.1 In-App toast

| ID | Trigger | Mockup |
|----|---------|--------|
| N001 | Gửi tờ trình | ✅ |
| N002 | Thẩm định xong | ✅ |
| N003 | Phê duyệt thành công | ✅ |
| N004 | Từ chối | ✅ |
| N005 | Tạo tờ trình thành công | ❌ Không có toast khi save nháp |
| N006 | Upload file thành công | ❌ |

### 10.2 Email thật

Toàn bộ ❌ (mockup chỉ có toast mô phỏng).

---

## 7. Tỷ lệ phủ tổng hợp

| Hạng mục | Phủ |
|----------|-----|
| Screen | 7/15 (47%) |
| Modal | 4/7 (57%) |
| Role menu | 0/4 (0%) |
| Entity (đủ field) | 4/12 (33%) |
| Flow nghiệp vụ | 5/8 (62%) |
| Error code | 0/14 (0%) |
| In-app notification | 4/6 (67%) |
| Email | 0/7 (0%) |

**Kết luận:** Mockup đã phủ luồng nghiệp vụ chính rất tốt — đủ để demo cho khách hàng hình dung. Phần thiếu lớn là **auth thật, admin, báo cáo tổng hợp, audit trail** — đây là việc của giai đoạn build production, không phải mockup.
