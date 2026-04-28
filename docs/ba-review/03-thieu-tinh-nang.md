# 03 — Tính Năng Còn Thiếu (Theo BA Backlog F001-F018)

> Đối chiếu mockup vs `BA/requirements.md §8 Requirement Backlog`.

| ID | Tính năng | Mức | BA Status | Mockup |
|----|-----------|-----|-----------|--------|
| F001 | Xác thực JWT + Refresh Token | Critical | Planned | ❌ Login = chọn user |
| F002 | Đổi mật khẩu lần đầu | Critical | Planned | ❌ Không có |
| F003 | Quên mật khẩu qua email | High | Planned | ❌ Không có |
| F004 | Upload file thật (object storage) | High | Planned | ❌ Mock với `url: '#'` |
| F005 | Báo cáo S09 + S10 đầy đủ | High | Planned | ⚠️ Một phần — chỉ có theo dõi hạn HĐ |
| F006 | Quản trị admin S11-S14 | High | Planned | ❌ Không có |
| F007 | Lịch sử tờ trình (timeline) | High | Planned | ⚠️ Có timeline UI nhưng **không có entity LichSuToTrinh** |
| F008 | Sửa & gửi lại sau từ chối | High | Planned | ❌ **Bug: chặn sửa khi `tu_choi`** |
| F009 | Phân trang danh sách | High | Planned | ❌ Render tất cả |
| F010 | Email thật (SMTP/SendGrid) | High | Planned | ❌ Toast mô phỏng |
| F011 | Export PDF tờ trình | Medium | Planned | ✅ Có print stylesheet đầy đủ |
| F012 | Export Excel báo cáo | Medium | Planned | ❌ Không có |
| F013 | Nhúng ảnh vào nội dung | Medium | In Progress | ✅ Có (paste / upload, hiển thị) |
| F014 | Tự động tính VAT (×1.1) | Medium | Planned | ❌ Phải nhập tay 2 ô |
| F015 | Hồ sơ cá nhân (S15) | Medium | Planned | ❌ |
| F016 | Dark mode | Low | Done | ✅ |
| F017 | Trang giới thiệu hệ thống | Low | Done | ✅ |
| F018 | Notification real-time WebSocket | Low | Planned | ❌ Toast in-memory |

## Tóm tắt theo trạng thái

- ✅ **Done**: 4/18 (F011 PDF, F013 ảnh, F016 dark mode, F017 intro)
- ⚠️ **Một phần**: 2/18 (F005 báo cáo, F007 lịch sử)
- ❌ **Chưa có**: 12/18

## Phân tích chi tiết một số mục đáng chú ý

### F007 — Lịch sử tờ trình (timeline)

Mockup có UI timeline trong `app/to-trinh/[id]/page.tsx:271-294` hiển thị 2 bước **Thẩm định** và **Phê duyệt**. Nhưng:

- **Không có entity `LichSuToTrinh`** — chỉ dùng 2 trường `thamDinhLuc`, `pheDuyetLuc` trong `ToTrinh`
- **Mất thông tin "ai làm gì lúc nào"** — ví dụ: ai sửa tờ trình lần thứ 2? ai gửi lại sau từ chối? ai upload hợp đồng đã ký?
- **BA mockup S07** muốn timeline đầy đủ 4 bước: Tạo → Gửi → Thẩm định → Phê duyệt với timestamp + tên người mỗi bước

→ Production cần thêm bảng `LichSuToTrinh` để ghi lại mọi `hanhDong` (`tao`, `sua`, `gui`, `tham_dinh`, `phe_duyet`, `tu_choi`, `gui_lai`, `xoa`).

### F008 — Sửa & gửi lại sau từ chối

**BA workflow §4.5:**
```
[Tờ trình tu_choi] → Sửa → Gửi lại → cho_duyet
```

**Mockup hiện tại** chặn flow này:
- `app/to-trinh/[id]/sua/page.tsx:30`:
  ```ts
  if (tt.trangThai !== 'nhap' || tt.nguoiTrinhId !== currentUser?.id) {
    return <p>Tờ trình này không thể chỉnh sửa</p>;
  }
  ```
- `app/to-trinh/[id]/page.tsx:44`:
  ```ts
  const canEdit = isOwner && tt.trangThai === 'nhap';
  const canGui = isOwner && tt.trangThai === 'nhap';
  ```

→ Cần đổi điều kiện thành `tt.trangThai === 'nhap' || tt.trangThai === 'tu_choi'`.

### F009 — Phân trang

Mockup `app/to-trinh/page.tsx` render thẳng tất cả tờ trình filter được. Hiện chỉ có 10 mock records nên ổn, nhưng BA mockup §7 đã design sẵn `[← 1 2 3 ... →] 20 / trang`.

### F014 — Tự động tính VAT

BA §4.3:
> Điền `soTienChuaVAT` → hệ thống tự tính `soTienCoVAT = soTienChuaVAT × 1.1`
> Hoặc điền `soTienCoVAT` trực tiếp

**Mockup**: 2 ô tách rời, không tự tính. Nhưng đây có thể là quyết định mới — xem [05-cau-hoi-blocking.md Q08](05-cau-hoi-blocking.md) (có thể VAT ≠ 10%).

→ Cần khách hàng xác nhận trước khi auto-calc.

### F011 — Export PDF

✅ Mockup đã có print stylesheet đầy đủ trong `app/to-trinh/[id]/page.tsx:72-108`:
- Ẩn sidebar, button khi in
- Header công ty + mã tờ trình
- Bảng chi phí có border
- Block chữ ký 3 cột (người trình / thẩm định / phê duyệt)
- Page break tránh cắt block chữ ký

→ Khi production, chỉ cần thay `window.print()` bằng server-side PDF (Puppeteer / wkhtmltopdf) nếu cần kiểm soát layout chính xác hơn.

### F018 — Notification real-time

Mockup có hệ thống toast in-memory (`store/useStore.ts:118-125`). Khi gửi tờ trình, toast xuất hiện ở góc dưới phải. **Tuy nhiên**:
- Toast chỉ hiển thị cho **người trình** sau khi họ thao tác
- Người thẩm định / phê duyệt không thấy "có tờ trình mới" cho đến khi họ tự refresh trang

→ Production cần WebSocket (hoặc polling 30s) để push notification cho người được gán duyệt.

## Đề xuất ưu tiên cho mockup tiếp theo

| Ưu tiên | Tính năng | Lý do |
|---------|-----------|-------|
| 🔴 P0 | F008 fix bug sửa sau từ chối | Sai luồng nghiệp vụ chính |
| 🔴 P0 | F005 thêm dashboard tổng hợp đúng nghĩa S09 | Khách hàng xem mockup sẽ thấy gap lớn nhất |
| 🟡 P1 | F009 phân trang | Khi data nhiều sẽ chậm |
| 🟡 P1 | F007 timeline đầy đủ 4 bước | UX rõ hơn, không cần backend |
| 🟢 P2 | F014 auto-calc VAT (nếu Q08 quyết) | Convenience |
| 🟢 P2 | M02/M04/M07 modal | Nâng cao chất lượng demo |
