# 02 — Màn Hình Còn Thiếu So Với BA

> 8 màn hình trong BA §2 chưa có trong mockup. Phân loại theo độ ưu tiên cho **giai đoạn demo tiếp theo**.

## Nhóm A — Auth (S02-S04) — Production only

> 3 màn hình này **không cần cho demo mockup**. Chỉ cần khi build production thật vì mockup không có password.

### S02 — Đổi mật khẩu lần đầu (`/change-password`)

- Trigger: user mới login lần đầu (`isFirstLogin = true`)
- Form: nhập mật khẩu mới + xác nhận
- Server: ép user phải đổi trước khi vào hệ thống — chặn mọi API khác

### S03 — Quên mật khẩu (`/forgot-password`)

- Form: nhập email
- Server: gửi link reset (TTL 15 phút)
- Trả về success bất kể email có tồn tại không (chống user enumeration)

### S04 — Reset mật khẩu (`/reset-password?token=...`)

- Form: nhập mật khẩu mới sau khi click link email
- Validate token, password policy
- Revoke tất cả refresh token khác

---

## Nhóm B — Báo Cáo (S09 đúng nghĩa, S10) — Demo cần

> Đây là **gap lớn** — mockup hiện có `/bao-cao` nhưng làm chuyện khác.

### S09 — Báo cáo TỔNG HỢP (`/bao-cao`)

**BA yêu cầu** (§4.8, §6.5): dashboard thống kê chung
- Số lượng theo trạng thái
- Số lượng theo loại MS / NT
- Số lượng theo bộ phận (bar chart)
- Biểu đồ theo tháng (12 tháng gần nhất)
- Tỉ lệ phê duyệt / từ chối

**Mockup hiện tại** (`app/bao-cao/page.tsx`): theo dõi **hạn hợp đồng NT**:
- Đếm hợp đồng tổng, sắp hết hạn (≤30 ngày), đã hết hạn
- Bảng danh sách HĐ NT với cảnh báo "Còn N ngày"

→ **Đây là một tính năng hữu ích nhưng KHÔNG phải S09 theo BA.**

**Đề xuất:**
- Đổi route mockup hiện tại thành `/bao-cao/hop-dong` (báo cáo HĐ NT)
- Tạo route mới `/bao-cao` (S09) dashboard đúng nghĩa BA
- Hoặc thêm tab "Tổng hợp / Hạn hợp đồng" trong cùng `/bao-cao`

### S10 — Báo cáo CHI TIẾT chi phí (`/bao-cao/chi-phi`)

**BA yêu cầu** (§4.8, §6.5): chi tiết chi phí
- Filter: từ ngày, đến ngày, bộ phận, mã phí, NCC
- Tổng chi phí (chuaVAT + coVAT) theo bộ phận / mã phí / NCC
- Danh sách chi tiết tờ trình kèm chi phí
- Export PDF/Excel

**Mockup hiện tại**: không có.

**Auth**: chỉ `phe_duyet` và `admin` thấy.

---

## Nhóm C — Quản trị admin (S11-S14) — Production only

> 4 màn hình admin BA mô tả là Critical/High. Không cần cho demo, nhưng **mockup nên ghi chú là sẽ có sau**.

### S11 — Quản lý người dùng (`/admin/users`)

- CRUD user, gán role, reset mật khẩu
- Hiện đang hard-code 9 user trong `lib/mockData.ts:MOCK_USERS`

### S12 — Quản lý bộ phận (`/admin/bo-phan`)

- CRUD bộ phận
- Hiện đang hard-code 6 bộ phận: IT, Kế toán, Marketing, Mua hàng, Hành chính, Ban lãnh đạo

### S13 — Quản lý mã phí (`/admin/ma-phi`)

- CRUD mã phí theo bộ phận
- Hiện đang hard-code 10 mã phí trong `lib/mockData.ts:MOCK_MA_PHI`

### S14 — Cấu hình phân quyền duyệt (`/admin/phan-quyen`)

- Cho từng bộ phận, gán: 1 thẩm định + 1 phê duyệt
- Hiện đang hard-code trong `lib/mockData.ts:PHAN_QUYEN_DUYET`

---

## Nhóm D — Hồ sơ cá nhân (S15) — Optional cho demo

### S15 — Profile (`/profile`)

- Xem & sửa thông tin cá nhân
- Đổi mật khẩu

**Hiện tại**: thông tin user chỉ hiển thị ở góc sidebar (`AppLayout.tsx:106-117`), không click được.

---

## Modal còn thiếu

### M02 — Confirm xoá tờ trình

Mockup có action `deleteToTrinh` trong store nhưng **không có nút xoá ở UI nào**. Cần thêm:
- Nút xoá ở `app/to-trinh/[id]/page.tsx` (chỉ hiện khi `nhap` + `isOwner`)
- Modal confirm trước khi xoá

### M04 — Lightbox xem ảnh

Ảnh nhúng `tt.anhNoiDung` chỉ hiển thị inline, click không zoom. Cần modal full-screen.

### M07 — Confirm gửi tờ trình

Bấm "Gửi tờ trình" tại detail page (`app/to-trinh/[id]/page.tsx:316`) là gửi luôn, không hỏi xác nhận. BA §2.5 muốn confirm dialog trước khi gửi (vì gửi rồi không sửa được nữa).

---

## Tổng kết

| Mức độ | Số màn hình thiếu | Demo tiếp theo có cần? |
|--------|-------------------|------------------------|
| **Critical cho demo** | 1 (S09 báo cáo tổng hợp) | ✅ Cần |
| **High cho demo** | 2 (S10 báo cáo chi phí, M07 confirm gửi) | ✅ Nên có |
| **Medium cho demo** | 3 (S15 profile, M02 confirm xoá, M04 lightbox) | ⚠️ Tuỳ |
| **Production only** | 7 (S02-S04 auth, S11-S14 admin) | ❌ Sau MVP |
