@AGENTS.md

# HV-QLHoSo — Quy trình làm việc

## Bối cảnh dự án

Đây là **mockup/demo** cho dự án quản lý quy trình duyệt hồ sơ. Mỗi phiên code là làm việc **trực tiếp với khách hàng** để trình bày luồng nghiệp vụ và giao diện — không phải môi trường production.

## Nguyên tắc bắt buộc

### 1. Code nhanh, ra kết quả ngay
- Ưu tiên tốc độ và kết quả nhìn thấy được ngay trên UI
- Không over-engineer, không abstraction thừa, không chuẩn bị cho tương lai
- Mỗi thay đổi phải chạy được ngay, không cần setup thêm

### 2. Dữ liệu phải đồng nhất
- Toàn bộ dữ liệu đi qua Zustand store (`store/useStore.ts`) + mock data (`lib/mockData.ts`)
- Khi thêm trường mới vào `types/index.ts`, phải cập nhật mock data và UI cùng lúc
- Không để UI hiển thị `undefined`, `null`, hoặc trống ở những chỗ có dữ liệu mock
- Người dùng mock: `MOCK_USERS` — luôn dùng các user này cho tất cả quan hệ trong tờ trình

### 3. Push lên origin/dev ngay sau khi code xong
```bash
git add <files>
git commit -m "feat/fix: mô tả ngắn"
git push origin dev
```
- Branch duy nhất: `dev` — đây cũng là branch deploy
- Không giữ thay đổi local, không chờ review, push ngay để deploy lên server demo

## Tech stack

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js (App Router) — đọc `node_modules/next/dist/docs/` trước khi code |
| State | Zustand + `persist` (chỉ persist `currentUser`) |
| Styling | Tailwind CSS + CSS variables (`var(--primary)`, `var(--surface)`, v.v.) |
| Icons | Lucide React |
| Font/UI | Inline styles với CSS vars — không dùng component library ngoài |
| Data | Mock only — không có backend thật |

## Cấu trúc file quan trọng

```
types/index.ts          — Tất cả types (ToTrinh, User, ChiPhiDong, v.v.)
lib/mockData.ts         — MOCK_USERS, MOCK_TO_TRINH
lib/utils.ts            — genMaToTrinh, getPhanQuyenDuyet, getStatusLabel, formatDate
store/useStore.ts       — Zustand store, tất cả actions
components/layout/      — AppLayout (sidebar + toast)
components/to-trinh/    — ToTrinhForm và các component tờ trình
components/ui/          — Toast, Badge, v.v.
app/to-trinh/           — Danh sách, chi tiết, tạo, sửa
app/bao-cao/            — Báo cáo hoạt động
app/login/              — Login page
app/introduce/          — Giới thiệu hệ thống
```

## Luồng nghiệp vụ (để hiểu data flow)

```
nhap → cho_duyet (guiToTrinh) → tham_dinh (thamDinh) → phe_duyet / tu_choi
```

- `cho_duyet` = Chờ thẩm định
- `tham_dinh` = Chờ phê duyệt
- `phe_duyet` = Đã phê duyệt
- `tu_choi` = Từ chối

## Khi thêm tính năng mới

1. Cập nhật type trong `types/index.ts` nếu cần
2. Cập nhật mock data trong `lib/mockData.ts` để dữ liệu có sẵn
3. Cập nhật store action nếu cần
4. Viết UI — dùng CSS vars hiện có, không tự ý thêm màu mới
5. Push ngay: `git push origin dev`
