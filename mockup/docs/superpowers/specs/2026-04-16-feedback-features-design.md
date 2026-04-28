# Design: Feedback Features — Toast Email, Print CSS, Sửa/Từ chối

**Date:** 2026-04-16
**Status:** Approved

---

## Scope

Implement 4 feedback items từ người dùng:

1. **Sửa tờ trình** — đã xong (ToTrinhForm tạo ở session trước)
2. **Xuất PDF / In tờ trình** — cải thiện `window.print()` với CSS đẹp hơn
3. **Lý do từ chối** — đã xong (store fix + banner hiện có)
4. **Email thông báo (mock)** — toast giả lập khi thực hiện các hành động

---

## 1. Toast Notification System (Mock Email)

### Mục tiêu
Giả lập việc gửi email thông báo bằng toast UI, không gửi email thật.

### Kiến trúc
- Store-based: `notifications[]` trong Zustand store
- `AppNotification` type: `{ id: string; message: string; type: 'success' | 'warning' | 'info' }`
- `ToastContainer` component render trong `AppLayout` (global)

### Store changes — `store/useStore.ts`
Thêm vào `AppState`:
```typescript
notifications: AppNotification[];
addNotification: (message: string, type?: AppNotification['type']) => void;
removeNotification: (id: string) => void;
```

Cập nhật 4 action để push notification:
- `guiToTrinh(id)` → lookup thamDinhUser từ tờ trình → push:
  `"📧 Email gửi đến [thamDinhUser.hoTen] để thẩm định tờ trình [ma]"`  (type: `info`)
- `thamDinh(id)` → lookup pheDuyetUser → push:
  `"📧 Email gửi đến [pheDuyetUser.hoTen] để phê duyệt tờ trình [ma]"` (type: `info`)
- `pheDuyet(id)` → lookup nguoiTrinh → push:
  `"📧 Email thông báo tờ trình [ma] đã phê duyệt gửi đến [nguoiTrinh.hoTen]"` (type: `success`)
- `tuChoi(id, lyDo)` → lookup nguoiTrinh → push:
  `"📧 Email thông báo từ chối tờ trình [ma] gửi đến [nguoiTrinh.hoTen]"` (type: `warning`)

Notifications **không** được persist (không nằm trong `partialize`).

### Component — `components/ui/Toast.tsx`
- Nhận `notifications[]` và `removeNotification` từ store
- Fixed position: `bottom-4 right-4`, `z-50`
- Mỗi toast: icon Mail (lucide) + text message + nút ✕
- Màu theo type: `success` → green, `warning` → yellow, `info` → blue (dùng CSS vars hiện có)
- Auto-dismiss: `setTimeout(removeNotification, 4000)` khi mount
- CSS transition slide-up khi xuất hiện: `translate-y-2 opacity-0` → `translate-y-0 opacity-100`

### AppLayout change — `components/layout/AppLayout.tsx`
- Import `Toast` component
- Render `<Toast />` ngay trước closing `</div>` của main wrapper

---

## 2. Print CSS — Tờ trình chi tiết

### Mục tiêu
`window.print()` tạo ra văn bản A4 trông chuyên nghiệp, có đủ thông tin, ô chữ ký.

### Thay đổi — `app/to-trinh/[id]/page.tsx`

Thay thế khối `<style>` print hiện có bằng CSS chi tiết hơn:

#### Ẩn khi in (class `no-print` hiện có + thêm selectors):
- Sidebar (`aside`), header mobile, tất cả `<button>`, link "Quay lại", `<nav>`, toast container

#### Layout A4:
```css
@media print {
  body { background: white; font-family: serif; font-size: 12pt; }
  .print-full { max-width: 170mm; margin: 0 auto; padding: 10mm 0; }
}
```

#### Header tài liệu (thêm element `.print-header` hidden khi không in):
```
HV SYSTEM                          PHIẾU ĐỀ XUẤT PHÊ DUYỆT
Quy trình duyệt hồ sơ              Mã: [ma] | Ngày: [ngayTrinh]
```

#### Nội dung in:
- Thông tin chung: bảng 2 cột border
- Nội dung đề xuất: whitespace-pre-wrap, full width
- Ảnh nội dung: `max-width: 100%`, hiển thị inline
- Chi phí (MS): table kẻ border đầy đủ, dòng tổng in đậm
- Hợp đồng (NT): bảng 2 cột
- File đính kèm: danh sách tên file (không hiển thị URL)

#### Phần chữ ký (thêm element `.print-signature` ở cuối):
```
| Người trình        | Thẩm định             | Phê duyệt              |
| (khoảng trống)     | (khoảng trống)        | (khoảng trống)         |
| [nguoiTrinh.hoTen] | [thamDinh + ngày]     | [pheDuyet + ngày]      |
```
- Chỉ hiển thị khi print (`display: none` bình thường, `display: table` khi print)

---

## 3. Sửa tờ trình

Đã hoàn thành ở session trước:
- `components/to-trinh/ToTrinhForm.tsx` đã tạo
- Trang `/to-trinh/[id]/sua/page.tsx` dùng form này
- Logic `canEdit = isOwner && trangThai === 'nhap'` đúng

**Không cần thay đổi thêm.**

---

## 4. Lý do từ chối

Đã hoàn thành ở session trước:
- Store `tuChoi(id, lyDo)` lưu `lyDoTuChoi`
- Banner đỏ hiện thị khi `trangThai === 'tu_choi' && lyDoTuChoi` trên trang chi tiết
- Hoạt động cho cả MS lẫn NT (cùng 1 trang chi tiết)

**Không cần thay đổi thêm.**

---

## Files sẽ thay đổi

| File | Thay đổi |
|---|---|
| `store/useStore.ts` | Thêm notifications state + 4 action cập nhật |
| `components/ui/Toast.tsx` | Tạo mới |
| `components/layout/AppLayout.tsx` | Import + render Toast |
| `app/to-trinh/[id]/page.tsx` | Cải thiện print CSS + thêm print-header + print-signature |

---

## Không nằm trong scope

- Gửi email thật (Resend, SendGrid, SMTP)
- Cải thiện trang sửa tờ trình (đã hoạt động)
- Thay đổi logic lý do từ chối
