# BA Review — Mockup vs BA Requirements

> **Ngày review:** 2026-04-26
> **Người review:** Claude
> **Nguồn so sánh:**
> - Mockup hiện tại tại `app/` (Next.js demo)
> - BA docs tại `app/BA/requirements.md` v2.0.0 (cập nhật 2026-04-25)

## Mục đích

Mockup hiện tại được build trước khi có BA docs chi tiết. Folder này lưu các vấn đề phát hiện khi đối chiếu mockup với BA requirements mới — để khách hàng và team biết:

1. Mockup đang **thiếu** gì so với BA?
2. Mockup đang **sai/lệch** gì so với BA?
3. **Câu hỏi blocking** nào cần PM/khách hàng quyết trước khi code thật?
4. **Ưu tiên fix** trong mockup tiếp theo là gì?

## Cấu trúc

| File | Nội dung |
|------|----------|
| [01-tong-quan.md](01-tong-quan.md) | Tổng quan mức độ phủ — bảng đối chiếu screen-by-screen, feature-by-feature |
| [02-thieu-man-hinh.md](02-thieu-man-hinh.md) | Màn hình BA yêu cầu chưa có trong mockup (S02-S04, S10-S15) |
| [03-thieu-tinh-nang.md](03-thieu-tinh-nang.md) | Tính năng BA backlog F001-F018 — đã có / chưa có |
| [04-bug-mockup.md](04-bug-mockup.md) | Bug & lệch logic phát hiện trong mockup hiện tại |
| [05-cau-hoi-blocking.md](05-cau-hoi-blocking.md) | 6 câu hỏi 🔴 blocking từ `BA/open-questions.md` cần khách hàng trả lời |
| [06-de-xuat-uu-tien.md](06-de-xuat-uu-tien.md) | Đề xuất ưu tiên fix mockup trước demo tiếp theo |

## Tóm tắt nhanh

### ✅ Mockup đã có (mạnh)

- 4 luồng tờ trình MS/NT — tạo, sửa, gửi, thẩm định, phê duyệt, từ chối
- Filter & search danh sách theo bộ phận / trạng thái / NCC / người duyệt / khoảng ngày
- Chi tiết tờ trình với timeline phê duyệt, in PDF, upload hợp đồng đã ký
- Toast notification mô phỏng email
- Dark mode, responsive sidebar, role-based dept filter (nhan_vien)
- Báo cáo theo dõi hạn hợp đồng NT (sắp hết hạn / đã hết hạn)
- Print stylesheet cho tờ trình
- Mock data đầy đủ 9 user, 10 mã phí, 10 tờ trình

### ❌ Mockup chưa có (so với BA)

- **Auth thật**: Login đang là user-picker, không có password/JWT/refresh token
- **6 màn hình admin/profile**: S02 (đổi MK lần đầu), S03 (quên MK), S04 (reset MK), S11-S14 (CRUD users/bộ phận/mã phí/phân quyền), S15 (profile)
- **Báo cáo tổng hợp (S09) đúng nghĩa BA**: dashboard thống kê theo trạng thái/bộ phận/tháng — mockup đang là báo cáo hợp đồng
- **Báo cáo chi phí (S10)**: chi tiết theo bộ phận / mã phí / NCC — chưa có
- **Lịch sử tờ trình (audit trail)**: không có entity `LichSuToTrinh` để truy vết hành động
- **Phân trang** danh sách (F009)
- **Email thật** (đang là toast)
- **Sidebar menu theo role** (đang dùng chung 1 menu cho mọi role)

### 🐛 Bug đáng chú ý trong mockup

1. **Không sửa được tờ trình bị từ chối** — vi phạm BA §4.5. `app/to-trinh/[id]/sua/page.tsx:30` và `[id]/page.tsx:44` chỉ cho sửa khi `nhap`, không cho `tu_choi`.
2. **Mã tờ trình `K00001`** trong mock data — sai pattern (phải là `MS0004`). `lib/mockData.ts:126`.
3. **nhan_vien chọn được bộ phận khác** khi tạo tờ trình — không khoá theo `currentUser.boPhan`.
4. **Sidebar menu giống nhau cho mọi role** — admin / phê duyệt / nhân viên đều thấy "Tờ trình + Báo cáo HĐ + Giới thiệu" giống nhau.
5. **Form cho phép gửi tờ trình MS với 0 dòng chi phí** — vi phạm BA backend rule `phải có ≥ 1 ChiPhiDong`.

### 🔴 Blocking — cần khách hàng quyết trước

(Trích `BA/open-questions.md`)

- **Q01**: Người thẩm định / phê duyệt tự tạo tờ trình cho bộ phận mình → ai duyệt?
- **Q02**: Người phê duyệt tạo tờ trình → ai phê duyệt?
- **Q06**: Form tạo có cho chọn bộ phận khác không? Hay khoá theo current user?
- **Q08**: Có hàng hoá VAT ≠ 10% không? Cách nhập 2 ô tiền VAT độc lập hay tự tính?
- **Q15**: Mã tờ trình có cần liên tục không khi soft delete?
- **Q16**: `User.boPhan` lưu ID hay tên?
- **Q20**: Nghiệp vụ tờ trình NT khác MS thế nào (có chi phí dự kiến không, cảnh báo hạn HĐ tự động không)?

## Đọc theo thứ tự nào?

- **PM / khách hàng**: đọc theo thứ tự `01 → 05 → 06`
- **Dev**: đọc `02 → 03 → 04 → 06`
- **Tester / QA**: đọc `04 → 03`

## Câu hỏi mở chưa giải đáp

- **Quyết định folder docs**: review này đặt tại `app/docs/ba-review/` (cùng cấp với `superpowers/`). Nếu khách hàng muốn ở chỗ khác (`docs/` ngoài app, hay `BA/review/` cạnh requirements) thì xin chỉ định lại.
- **Ưu tiên giai đoạn tiếp theo**: fix bug mockup (mức demo) hay bắt đầu code production (auth + DB)? Cần PM xác nhận.
