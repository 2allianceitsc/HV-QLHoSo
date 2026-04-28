# 06 — Đề Xuất Ưu Tiên Fix Mockup & Lộ Trình Tiếp Theo

> Đề xuất việc cần làm theo thứ tự, chia thành 3 giai đoạn:
> **A.** Fix nhanh trong mockup (1-2 ngày, không cần backend)
> **B.** Bổ sung mockup demo (3-5 ngày, vẫn dùng zustand mock)
> **C.** Sang production (sprint dài, cần auth + DB + admin)

---

## Giai đoạn A — Fix nhanh mockup hiện tại (1-2 ngày)

**Mục tiêu:** sửa các bug làm sai luồng nghiệp vụ chính, không thêm tính năng mới. Sau giai đoạn này khách hàng demo sẽ thấy luồng chuẩn theo BA.

### A1. Fix BUG-01 — cho sửa & gửi lại tờ trình từ chối

- File: [app/to-trinh/[id]/sua/page.tsx:30](../../app/to-trinh/[id]/sua/page.tsx#L30), [app/to-trinh/[id]/page.tsx:44-45](../../app/to-trinh/[id]/page.tsx#L44)
- Đổi điều kiện cho cả `nhap` và `tu_choi`
- Đổi label nút "Gửi tờ trình" → "Gửi lại" khi `tu_choi`

### A2. Fix BUG-04 — sửa mã `K00001` → `MS0004`

- File: [lib/mockData.ts:126](../../lib/mockData.ts#L126)
- Đổi 1 dòng

### A3. Fix BUG-05 — validate MS phải có ≥ 1 chi phí

- File: [components/to-trinh/ToTrinhForm.tsx:52-62](../../components/to-trinh/ToTrinhForm.tsx#L52)
- Thêm rule khi `loai === 'MS'`

### A4. Fix BUG-07 — validate `ngayHetHan > ngayBatDau`

- File: cùng `ToTrinhForm.tsx`

### A5. Fix BUG-09 — toast khi tạo tờ trình & upload

- File: [app/to-trinh/tao/page.tsx](../../app/to-trinh/tao/page.tsx)
- Gọi `addNotification` khi save thành công

### A6. Fix BUG-03 — sidebar menu theo role

- File: [components/layout/AppLayout.tsx:11-15](../../components/layout/AppLayout.tsx#L11)
- Filter `NAV` theo `currentUser.role`
- 4 menu admin (S11-S14) tạo placeholder route hiển thị "Chức năng đang phát triển" để khách hàng thấy

### A7. Fix BUG-02 + BUG-08 — chốt cách xử lý dept dropdown (đợi Q06)

- Tạm khoá cho `nhan_vien` trước, sau khi Q06 quyết thì điều chỉnh
- File: `ToTrinhForm.tsx`, `app/to-trinh/page.tsx`

**Ước tính:** 4-8 giờ code.

---

## Giai đoạn B — Bổ sung mockup demo (3-5 ngày)

**Mục tiêu:** lấp các gap quan trọng trong UX để khách hàng hình dung sản phẩm cuối — vẫn không cần backend thật.

### B1. Tách `/bao-cao` thành đúng nghĩa S09 + tab cũ

- Route mới `/bao-cao` = dashboard tổng hợp (theo trạng thái / loại / bộ phận / tháng)
- Tab/route cũ "Báo cáo HĐ" → `/bao-cao/hop-dong`
- Dùng chart đơn giản (CSS bars hoặc Recharts) cho mockup

### B2. Tạo `/bao-cao/chi-phi` (S10)

- Bảng tổng hợp chi phí theo bộ phận / mã phí / NCC
- Filter: từ ngày, đến ngày, bộ phận, mã phí, NCC
- Stats card: tổng chưa VAT, tổng có VAT, số dòng chi phí
- Chỉ `phe_duyet` + `admin` thấy menu này

### B3. Phân trang danh sách tờ trình (F009)

- Pagination 20 dòng/trang theo BA mockup §7
- Cần khi data nhiều — hiện 10 dòng nên không phân trang được nhưng nên có UI

### B4. Timeline đầy đủ 4 bước (F007)

- Hiện chỉ có Thẩm định + Phê duyệt
- Thêm Tạo + Gửi (dùng `createdAt` + một timestamp gửi)
- Mock đầy đủ trong `MOCK_TO_TRINH`

### B5. Modal M02, M04, M07

- M02: Confirm xoá tờ trình (thêm nút xoá ở detail page khi `nhap`)
- M04: Lightbox xem ảnh nhúng `anhNoiDung`
- M07: Confirm gửi tờ trình (popup "Gửi rồi không sửa được, xác nhận?")

### B6. Toast email visibility

- Hiện toast chỉ hiện cho người đang thao tác. Khi đổi user (login khác), không thấy lại
- Đề xuất: hiển thị tab "Hộp thư" (in-app) lưu các thông báo email đã gửi cho user hiện tại
- Cách đơn giản: thêm `inbox: AppNotification[]` vào store, persist riêng theo user

### B7. Profile page S15 (đơn giản)

- Hiển thị thông tin user, không cho sửa (mockup)
- Click avatar trong sidebar mở modal hoặc route

### B8. Danh sách user trong BA Phụ lục A đầy đủ

- BA phụ lục A liệt kê 9 user. Mockup đã có đủ ✅
- Verify password mockup (nếu A1 cần)

**Ước tính:** 3-5 ngày code.

---

## Giai đoạn C — Sang production (sprint nhiều tuần)

**Mục tiêu:** chuyển từ mockup zustand sang ứng dụng thật với BE + DB + auth + admin.

### C1. Tech stack production

> Cần điền vào [BA/techstack.md](../../BA/techstack.md) (hiện đang để trống) trước khi bắt đầu C.

Câu hỏi mở:
- BE: Node.js (NestJS) hay .NET hay khác?
- DB: PostgreSQL? SQL Server (vì có `NVARCHAR`, `NTEXT` trong BA §5)?
- Object storage: S3 / MinIO / local disk?
- Email: SendGrid / SMTP nội bộ?
- Hosting: cloud nào? on-premise?

### C2. Schema migration (cần Q15, Q16 chốt trước)

- Tạo entity: User, BoPhan, MaPhi, PhanQuyenDuyet, ToTrinh, ChiPhiDong, VatTuCoSan, FileDinhKem, **LichSuToTrinh**, RefreshToken, PasswordResetToken
- Standard audit fields: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isDeleted`
- Soft delete cascade strategy

### C3. Auth real (F001-F003)

- S01 login real: username + password + JWT + refresh token
- S02 đổi mật khẩu lần đầu
- S03/S04 quên & reset
- Bcrypt cost ≥ 12

### C4. Admin pages (F006)

- S11: CRUD users
- S12: CRUD bộ phận
- S13: CRUD mã phí
- S14: Cấu hình phân quyền duyệt

### C5. Audit trail (F007)

- Mỗi action trên tờ trình INSERT vào `LichSuToTrinh`
- Detail page hiển thị timeline đầy đủ từ DB

### C6. Real upload (F004) + email (F010)

- Object storage tích hợp
- Email service: 7 template E001-E007

### C7. Reports & exports (F005, F011, F012)

- Server-side aggregate cho S09, S10
- Export PDF (Puppeteer) và Excel

---

## Lộ trình đề xuất

```
Tuần 1   ─ Giai đoạn A (fix bug)
           Hỏi khách hàng 7 câu blocking + tech stack
Tuần 2-3 ─ Giai đoạn B (bổ sung demo)
           Demo lần 2 với khách hàng — chốt UX
Tuần 4   ─ Bắt đầu giai đoạn C: tech stack + DB schema
Tuần 5+  ─ Build production theo phase: auth → CRUD → admin → reports
```

---

## Quyết định cần khách hàng / PM

1. **Folder lưu BA review**: hiện đặt tại `app/docs/ba-review/`. Có cần đổi sang `docs/ba-review/` (project root, ngoài git) hay `BA/review/` không?
2. **Có demo lại với khách hàng** sau giai đoạn A không, hay chờ giai đoạn B mới demo?
3. **Tech stack** — cần điền `BA/techstack.md` trước khi vào C
4. **7 câu blocking** trong [05-cau-hoi-blocking.md](05-cau-hoi-blocking.md) — chốt từng câu

---

## Câu hỏi mở

- Mockup hiện tại có sẽ tiếp tục được dùng làm BASELINE cho production không, hay sẽ scrap và viết lại với tech stack mới? (Ảnh hưởng quyết định ưu tiên — nếu scrap thì bỏ qua giai đoạn A&B, đi thẳng C)
- Khách hàng đang **chờ deliverable nào tiếp theo** — bản demo cải tiến hay tài liệu thiết kế production?
