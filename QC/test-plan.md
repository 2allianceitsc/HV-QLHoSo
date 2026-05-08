# Test Plan — HV-QLHoSo (Playwright Automation)

> **Phiên bản:** 1.0.0  
> **Ngày tạo:** 2026-05-01  
> **Công cụ:** Playwright (TypeScript)  
> **Base URL:** `http://localhost:5418` (dev) | `http://localhost:3028` (prod preview)  
> **Dựa trên:** BA/requirements.md v2.1.0

---

## 1. MỤC LỤC

- [2. Thiết Lập Môi Trường](#2-thiết-lập-môi-trường)
- [3. Tài Khoản Test](#3-tài-khoản-test)
- [4. Cấu Trúc Test Suite](#4-cấu-trúc-test-suite)
- [5. AUTH — Xác Thực](#5-auth--xác-thực)
- [6. SUBMISSION — Tờ Trình](#6-submission--tờ-trình)
- [7. WORKFLOW — Luồng Duyệt](#7-workflow--luồng-duyệt)
- [8. REPORTS — Báo Cáo](#8-reports--báo-cáo)
- [9. ADMIN — Quản Trị](#9-admin--quản-trị)
- [10. PERMISSION — Phân Quyền](#10-permission--phân-quyền)
- [11. ERROR HANDLING](#11-error-handling)
- [12. Upload File](#12-upload-file)
- [13. Tiêu Chí Hoàn Thành](#13-tiêu-chí-hoàn-thành)

---

## 2. THIẾT LẬP MÔI TRƯỜNG

### 2.1 Cài đặt

```bash
cd DEV
pnpm add -D @playwright/test
npx playwright install chromium firefox
```

### 2.2 Cấu hình `playwright.config.ts`

```ts
// DEV/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../QC/tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5418',
    storageState: 'QC/.auth/staff.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox',  use: { browserName: 'firefox' } },
  ],
});
```

### 2.3 Cấu trúc thư mục

```
QC/
├── test-plan.md            ← file này
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── first-login.spec.ts
│   │   ├── forgot-password.spec.ts
│   │   └── change-password.spec.ts
│   ├── submission/
│   │   ├── list.spec.ts
│   │   ├── create-ms.spec.ts
│   │   ├── create-nt.spec.ts
│   │   ├── edit.spec.ts
│   │   └── detail.spec.ts
│   ├── workflow/
│   │   ├── submit.spec.ts
│   │   ├── review.spec.ts
│   │   ├── approve.spec.ts
│   │   └── reject.spec.ts
│   ├── reports/
│   │   ├── summary.spec.ts
│   │   └── expenses.spec.ts
│   ├── admin/
│   │   ├── users.spec.ts
│   │   ├── departments.spec.ts
│   │   ├── cost-codes.spec.ts
│   │   └── approval-config.spec.ts
│   ├── permission/
│   │   └── access-control.spec.ts
│   └── upload/
│       └── file-upload.spec.ts
├── fixtures/
│   ├── auth.fixture.ts     ← login helpers, storageState per role
│   └── data.fixture.ts     ← seed data helpers
└── .auth/                  ← generated auth states (gitignored)
    ├── staff.json
    ├── reviewer.json
    ├── approver.json
    └── admin.json
```

### 2.4 Global Setup — Lưu Auth State

Tạo `QC/fixtures/auth.fixture.ts`:

```ts
// Chạy global setup để lưu session state cho từng role
// playwright.config.ts → globalSetup: './QC/fixtures/global-setup.ts'
// Login với từng tài khoản → lưu storageState vào QC/.auth/{role}.json
```

---

## 3. TÀI KHOẢN TEST

Dựa theo Phụ Lục A của requirements.md. Tất cả có `isFirstLogin = true` sau seed, cần được set `false` trong test DB.

| Username   | Họ Tên              | Role       | Bộ Phận      | Dùng Trong Test |
|------------|---------------------|------------|--------------|-----------------|
| `hungnt`   | Nguyễn Thế Hùng     | `staff`    | IT           | Test role staff |
| `lienhm`   | Hoàng Minh Liên     | `staff`    | Kế toán      | Test scope staff |
| `tanvt`    | Trương Văn Tân      | `reviewer` | IT           | Test review IT  |
| `myadh`    | Dương Hà My         | `reviewer` | Kế toán      | Test review KT  |
| `hongdv`   | Dương Văn Hồng      | `approver` | Ban lãnh đạo | Test approve IT |
| `nhunght`  | Trần Hồng Nhung     | `approver` | Marketing    | Test approve MKT|
| `admin`    | *(admin seed)*      | `admin`    | *(any)*      | Test admin full |

> **Mật khẩu test:** `Test@1234` (đặt trong `.env.test`, không hardcode trong spec)

---

## 4. CẤU TRÚC TEST SUITE

### Ưu tiên thực thi

| Độ Ưu Tiên | Nhóm Test              | Lý Do                                      |
|------------|------------------------|--------------------------------------------|
| P0 — Smoke | Auth login + Workflow cơ bản | Toàn bộ app phụ thuộc |
| P1 — Core  | Tạo, sửa, duyệt tờ trình | Nghiệp vụ chính |
| P2 — High  | Admin CRUD, Reports, Permission | Tính năng quan trọng |
| P3 — Medium| Upload, Error scenarios | Edge case |

---

## 5. AUTH — XÁC THỰC

### 5.1 Login (S01 `/login`)

#### TC-AUTH-001: Đăng nhập thành công

- **Precondition:** User `hungnt` tồn tại, `isActive = true`, `isFirstLogin = false`
- **Steps:**
  1. Mở `/login`
  2. Nhập `username = hungnt`, `password = Test@1234`
  3. Bấm "Đăng nhập"
- **Expected:**
  - Redirect sang `/submissions`
  - Sidebar hiển thị tên "Nguyễn Thế Hùng"
  - Không thấy menu Báo cáo / Admin

#### TC-AUTH-002: Sai thông tin đăng nhập

- **Steps:** Nhập `username = hungnt`, `password = wrongpass` → Đăng nhập
- **Expected:**
  - Ở lại trang `/login`
  - Hiển thị thông báo lỗi: `"Thông tin đăng nhập không đúng"` (E001)
  - Không tiết lộ field nào sai

#### TC-AUTH-003: Tài khoản bị khóa (`isActive = false`)

- **Precondition:** Set `isActive = false` cho user `lienhm`
- **Steps:** Đăng nhập với `lienhm`
- **Expected:** Thông báo `"Tài khoản đã bị khóa. Liên hệ quản trị viên."` (E002)

#### TC-AUTH-004: Bỏ trống username hoặc password

- **Steps:** Bấm "Đăng nhập" khi để trống một hoặc cả hai field
- **Expected:** Hiển thị validation inline, không gọi API

#### TC-AUTH-005: Redirect sau login

- **Steps:** Truy cập `/submissions` khi chưa login
- **Expected:** Redirect về `/login`; sau login thành công, redirect về `/submissions`

---

### 5.2 Đổi Mật Khẩu Lần Đầu (S02 `/change-password`)

#### TC-AUTH-010: Bắt buộc đổi mật khẩu khi `isFirstLogin = true`

- **Precondition:** User `thanhpv` có `isFirstLogin = true`
- **Steps:**
  1. Đăng nhập với `thanhpv`
  2. Hệ thống tự redirect sang `/change-password`
- **Expected:**
  - Không thể điều hướng đến `/submissions` khi chưa đổi mật khẩu
  - Gọi bất kỳ API nào khác ngoài `/api/auth/change-password` → server trả E014

#### TC-AUTH-011: Đổi mật khẩu lần đầu thành công

- **Steps:**
  1. Tại `/change-password`, nhập `currentPassword`, `newPassword = NewPass@123`, `confirmPassword`
  2. Submit
- **Expected:**
  - `isFirstLogin` → `false`
  - Redirect sang `/submissions`

#### TC-AUTH-012: Mật khẩu mới không đủ mạnh

- **Steps:** Nhập `newPassword = 12345678` (thiếu chữ hoa + ký tự đặc biệt)
- **Expected:** Validation lỗi inline, không submit

#### TC-AUTH-013: Confirm password không khớp

- **Steps:** `newPassword = NewPass@123`, `confirmPassword = NewPass@456`
- **Expected:** Lỗi inline "Mật khẩu xác nhận không khớp"

---

### 5.3 Quên Mật Khẩu (S03, S04)

#### TC-AUTH-020: Gửi email reset mật khẩu

- **Steps:**
  1. Mở `/forgot-password`
  2. Nhập email hợp lệ của user tồn tại
  3. Submit
- **Expected:** Luôn trả về thông báo thành công (không tiết lộ email có tồn tại không)

#### TC-AUTH-021: Email không tồn tại — vẫn thành công (user enumeration protection)

- **Steps:** Nhập email không tồn tại trong hệ thống
- **Expected:** Cùng thông báo thành công như TC-AUTH-020

#### TC-AUTH-022: Reset mật khẩu với token hợp lệ

- **Precondition:** Có token reset hợp lệ (lấy qua API test hoặc DB)
- **Steps:** Mở `/reset-password?token={valid_token}`, nhập mật khẩu mới
- **Expected:** Đặt lại mật khẩu thành công, redirect `/login`

#### TC-AUTH-023: Token reset hết hạn (> 15 phút)

- **Steps:** Dùng expired token
- **Expected:** Thông báo lỗi, không cho phép reset

#### TC-AUTH-024: Token đã sử dụng (one-time use)

- **Steps:** Dùng lại token đã dùng một lần
- **Expected:** Thông báo lỗi

---

### 5.4 Đăng Xuất

#### TC-AUTH-030: Đăng xuất thành công

- **Steps:** Bấm "Đăng xuất" trong sidebar footer
- **Expected:**
  - Gọi `POST /api/auth/logout`
  - Redirect về `/login`
  - Cookie `refreshToken` bị xóa
  - Truy cập lại `/submissions` → redirect về `/login`

---

## 6. SUBMISSION — TỜ TRÌNH

### 6.1 Danh Sách Tờ Trình (S05 `/submissions`)

#### TC-SUB-001: Hiển thị danh sách (role staff — scope bộ phận)

- **Auth:** `hungnt` (staff, IT)
- **Steps:** Mở `/submissions`, chọn tab MS
- **Expected:**
  - Chỉ thấy tờ trình của bộ phận IT
  - Không thấy tờ trình của bộ phận khác
  - Hiển thị các cột: Code, Bộ phận, Ngày trình, Tiêu đề, Số tiền, Trạng thái

#### TC-SUB-002: Hiển thị danh sách (role reviewer/approver — tất cả)

- **Auth:** `tanvt` (reviewer)
- **Expected:** Thấy tờ trình của tất cả bộ phận

#### TC-SUB-003: Chuyển tab MS / NT

- **Steps:** Bấm tab "MS Mua sắm" → bấm "NT Nguyên tắc"
- **Expected:** Danh sách cập nhật theo loại tương ứng

#### TC-SUB-004: Tìm kiếm full-text

- **Steps:** Nhập từ khóa vào ô tìm kiếm (code, title, supplier)
- **Expected:** Danh sách lọc theo từ khóa, phân trang reset về trang 1

#### TC-SUB-005: Lọc nâng cao (M05 Filter Panel)

- **Steps:**
  1. Bấm "Lọc ▼"
  2. Chọn bộ phận, trạng thái, khoảng ngày
  3. Apply
- **Expected:** Danh sách cập nhật theo bộ lọc; có thể clear filter

#### TC-SUB-006: Phân trang

- **Steps:** Điều hướng sang trang 2, thay đổi `limit` (10/20/50)
- **Expected:** Dữ liệu đúng trang, hiển thị `page / totalPages`

#### TC-SUB-007: Thống kê nhanh

- **Expected:** Hiển thị đúng: Tổng, Chờ thẩm định, Đã phê duyệt

---

### 6.2 Tạo Tờ Trình Mua Sắm — MS (S06 `/submissions/new`)

#### TC-SUB-010: Tạo tờ trình MS thành công — lưu nháp

- **Auth:** `hungnt` (staff)
- **Steps:**
  1. Bấm "Tạo tờ trình"
  2. Chọn loại: **MS (Mua sắm)**
  3. Chọn bộ phận: IT → kiểm tra tên thẩm định/phê duyệt được auto-fill
  4. Điền `submittedDate` (mặc định hôm nay), `title`, `content`
  5. Thêm ≥ 1 dòng chi phí: chọn `costCode`, điền `amountExVat`, `supplier`
  6. Bấm "Lưu nháp"
- **Expected:**
  - POST `/api/submissions` → `status = 'draft'`
  - Redirect sang `/submissions/{id}`
  - Code được auto-gen dạng `MS00XX`
  - Toast: `"Tờ trình {code} đã được lưu nháp thành công."`

#### TC-SUB-011: Auto-tính VAT (amountExVat → amountIncVat)

- **Steps:** Nhập `amountExVat = 45,500,000`
- **Expected:** `amountIncVat` tự động = `50,050,000` (× 1.1)

#### TC-SUB-012: Nhập amountIncVat trực tiếp

- **Steps:** Nhập `amountIncVat = 50,000,000`
- **Expected:** Giữ nguyên giá trị, không tự tính lại ExVAT

#### TC-SUB-013: Lỗi — thiếu field bắt buộc (title, content)

- **Steps:** Để trống `title` hoặc `content` → submit
- **Expected:** Validation lỗi inline (E005), không gọi API

#### TC-SUB-014: Lỗi — tờ trình MS không có dòng chi phí

- **Steps:** Tạo tờ trình MS, không thêm dòng chi phí, bấm gửi
- **Expected:** Server từ chối với E013: `"Phải có ít nhất một dòng chi phí."`

#### TC-SUB-015: Thêm / xóa dòng chi phí

- **Steps:** Thêm 3 dòng chi phí, xóa dòng thứ 2
- **Expected:** Danh sách cập nhật đúng, `sortOrder` reindex

#### TC-SUB-016: Thêm vật tư có sẵn (ExistingInventory)

- **Steps:** Thêm vật tư: tên, số lượng, đơn vị
- **Expected:** Vật tư lưu vào submission, hiển thị đúng ở S07

#### TC-SUB-017: Chọn bộ phận — auto-fill reviewer/approver

- **Steps:** Chọn bộ phận "IT"
- **Expected:** Tên người thẩm định = "Trương Văn Tân", người phê duyệt = "Dương Văn Hồng"

---

### 6.3 Tạo Tờ Trình Nguyên Tắc — NT

#### TC-SUB-020: Tạo tờ trình NT thành công

- **Steps:**
  1. Chọn loại: **NT (Nguyên tắc)**
  2. Điền `supplier`, `contractStartDate`, `contractEndDate`
  3. Upload `signedContract` (tùy chọn)
  4. Lưu nháp
- **Expected:** Lưu thành công, `type = 'NT'`, code dạng `NT00XX`

#### TC-SUB-021: Lỗi — ngày kết thúc trước ngày bắt đầu

- **Steps:** `contractStartDate = 2026-04-01`, `contractEndDate = 2026-03-01`
- **Expected:** Validation lỗi: "Ngày kết thúc phải sau ngày bắt đầu"

#### TC-SUB-022: Thiếu field bắt buộc NT (supplier, contractStartDate, contractEndDate)

- **Expected:** Validation lỗi inline, không tạo

---

### 6.4 Chi Tiết Tờ Trình (S07 `/submissions/{id}`)

#### TC-SUB-030: Xem chi tiết tờ trình (owner)

- **Expected:**
  - Hiển thị đầy đủ: Thông tin chung, Nội dung, Danh sách chi phí (MS), Quy trình duyệt, File đính kèm
  - Badge trạng thái đúng màu
  - Nút hành động đúng theo role + trạng thái

#### TC-SUB-031: Lịch sử thay đổi (SubmissionLog timeline)

- **Expected:** Hiển thị timeline: Tạo → Gửi → Thẩm định → Phê duyệt (hoặc Từ chối), kèm người thực hiện + timestamp

#### TC-SUB-032: Staff không xem được tờ trình bộ phận khác

- **Auth:** `lienhm` (staff, Kế toán)
- **Steps:** Truy cập `/submissions/{id_of_IT_submission}`
- **Expected:** Redirect hoặc hiển thị lỗi 403/404 (E003/E004)

---

### 6.5 Sửa Tờ Trình (S08 `/submissions/{id}/edit`)

#### TC-SUB-040: Sửa tờ trình `draft` — thành công

- **Auth:** Owner (staff) hoặc admin
- **Steps:** Mở form edit, thay đổi title + thêm dòng chi phí mới → Lưu
- **Expected:** Cập nhật thành công, log action `'update'`

#### TC-SUB-041: Sửa tờ trình `rejected` — thành công

- **Precondition:** Tờ trình ở trạng thái `rejected`
- **Expected:** Có thể sửa, không thể gửi bằng nút Lưu (chỉ gửi qua nút "Gửi lại")

#### TC-SUB-042: Không thể sửa tờ trình `pending_review` / `in_review` / `approved`

- **Steps:** Truy cập `/submissions/{id}/edit` khi status không phải `draft`/`rejected`
- **Expected:** Redirect hoặc form disabled; server trả 422 nếu cố PUT

#### TC-SUB-043: Reviewer / Approver không thể sửa tờ trình người khác

- **Auth:** `tanvt` (reviewer)
- **Steps:** Cố sửa tờ trình của `hungnt`
- **Expected:** Server trả E003

---

### 6.6 Xóa Tờ Trình

#### TC-SUB-050: Xóa tờ trình `draft` — thành công

- **Steps:** Bấm "Xoá" → Dialog M02 xác nhận → Confirm
- **Expected:** Soft delete, redirect về `/submissions`, tờ trình không hiện trong danh sách

#### TC-SUB-051: Không thể xóa tờ trình không phải `draft`

- **Steps:** Cố xóa tờ trình `pending_review`
- **Expected:** Nút Xoá ẩn hoặc server trả lỗi 422

---

## 7. WORKFLOW — LUỒNG DUYỆT

### 7.1 Gửi Tờ Trình (`draft` → `pending_review`)

#### TC-WF-001: Gửi tờ trình thành công (M07 Confirm)

- **Auth:** `hungnt` (staff, owner)
- **Precondition:** Tờ trình ở `draft`, có ≥ 1 ExpenseLine (MS)
- **Steps:**
  1. Vào S07, bấm "Gửi tờ trình"
  2. Dialog M07 hiện — xác nhận
- **Expected:**
  - Status → `pending_review`
  - Log: `action = 'submit'`
  - Toast N001: Email gửi đến reviewer
  - Nút "Gửi tờ trình" biến mất

#### TC-WF-002: Cancel dialog gửi — không thay đổi trạng thái

- **Steps:** Bấm "Gửi tờ trình" → Dialog M07 → Bấm "Hủy"
- **Expected:** Status vẫn `draft`

#### TC-WF-003: Không thể gửi tờ trình của người khác (không phải owner)

- **Auth:** `tanvt` (reviewer) cố gửi tờ trình của `hungnt`
- **Expected:** Server trả E003

---

### 7.2 Thẩm Định (`pending_review` → `in_review`)

#### TC-WF-010: Thẩm định thành công

- **Auth:** `tanvt` (reviewer IT — được phân công)
- **Precondition:** Tờ trình IT ở `pending_review`
- **Steps:** Bấm "Thẩm định"
- **Expected:**
  - Status → `in_review`
  - `reviewedAt` được set
  - Log: `action = 'review'`
  - Toast N002: Email gửi đến approver

#### TC-WF-011: Reviewer không thuộc bộ phận không thể thẩm định

- **Auth:** `myadh` (reviewer Kế toán) cố thẩm định tờ trình IT
- **Expected:** Server trả E007: `"Bạn không được phân công xử lý tờ trình này."`

#### TC-WF-012: Không thể thẩm định tờ trình không phải `pending_review`

- **Steps:** Cố gọi `/review` trên tờ trình `draft` hoặc `in_review`
- **Expected:** Server trả E006

---

### 7.3 Phê Duyệt (`in_review` → `approved`)

#### TC-WF-020: Phê duyệt thành công

- **Auth:** `hongdv` (approver IT — Giám đốc)
- **Precondition:** Tờ trình IT ở `in_review`
- **Steps:** Bấm "Phê duyệt"
- **Expected:**
  - Status → `approved`
  - `approvedAt` được set
  - Log: `action = 'approve'`
  - Toast N003: Email gửi đến submitter

#### TC-WF-021: Approver không thuộc bộ phận không thể phê duyệt

- **Auth:** `nhunght` (approver Marketing) cố phê duyệt tờ trình IT
- **Expected:** Server trả E007

#### TC-WF-022: Không thể phê duyệt tờ trình không phải `in_review`

- **Steps:** Cố gọi `/approve` trên `pending_review`
- **Expected:** Server trả E006

---

### 7.4 Từ Chối (M01 Dialog)

#### TC-WF-030: Reviewer từ chối ở bước thẩm định (`pending_review` → `rejected`)

- **Auth:** `tanvt` (reviewer IT)
- **Steps:**
  1. Bấm "Từ chối"
  2. Dialog M01 hiện — nhập lý do
  3. Xác nhận
- **Expected:**
  - Status → `rejected`
  - `rejectionReason` được lưu
  - Log: `action = 'reject'`, `note = reason`
  - Toast N004: Email gửi đến submitter kèm lý do

#### TC-WF-031: Từ chối bắt buộc phải có lý do (E012)

- **Steps:** Bấm xác nhận khi để trống lý do
- **Expected:** Lỗi E012: `"Vui lòng nhập lý do từ chối."` — không submit

#### TC-WF-032: Approver từ chối ở bước phê duyệt (`in_review` → `rejected`)

- **Auth:** `hongdv` (approver)
- **Expected:** Tương tự TC-WF-030

---

### 7.5 Sửa Và Gửi Lại Sau Từ Chối (`rejected` → `pending_review`)

#### TC-WF-040: Gửi lại sau từ chối — thành công

- **Auth:** `hungnt` (owner)
- **Precondition:** Tờ trình ở `rejected`
- **Steps:**
  1. Sửa tờ trình (có thể sửa tất cả field)
  2. Bấm "Gửi lại"
- **Expected:**
  - Status → `pending_review`
  - Log: `action = 'resubmit'`
  - Reviewer nhận email thông báo lại

#### TC-WF-041: Có thể sửa nhiều lần trước khi gửi lại

- **Steps:** Lưu nháp nhiều lần, mỗi lần log `action = 'update'`
- **Expected:** Không lỗi, dữ liệu cập nhật đúng

---

## 8. REPORTS — BÁO CÁO

### 8.1 Báo Cáo Tổng Hợp (S09 `/reports`)

#### TC-RPT-001: Reviewer xem báo cáo tổng hợp

- **Auth:** `tanvt` (reviewer)
- **Steps:** Mở `/reports`, chọn năm 2026, tháng 4
- **Expected:**
  - Hiển thị: Tổng, Chờ thẩm định, Chờ phê duyệt, Đã phê duyệt, Từ chối
  - Biểu đồ theo bộ phận
  - Biểu đồ theo tháng

#### TC-RPT-002: Staff không có quyền xem báo cáo

- **Auth:** `hungnt` (staff)
- **Steps:** Truy cập `/reports`
- **Expected:** Redirect về `/submissions` hoặc 403

#### TC-RPT-003: Lọc theo năm và tháng

- **Steps:** Thay đổi year và month dropdown
- **Expected:** Dữ liệu cập nhật tương ứng

#### TC-RPT-004: Tỉ lệ approved/rejected hiển thị đúng

- **Expected:** `approvalRate = approved / (approved + rejected) × 100`

---

### 8.2 Báo Cáo Chi Tiết Chi Phí (S10 `/reports/expenses`)

#### TC-RPT-010: Approver xem báo cáo chi tiết

- **Auth:** `hongdv` (approver)
- **Steps:** Mở `/reports/expenses`, chọn khoảng ngày
- **Expected:** Tổng ExVAT, IncVAT; phân tích theo bộ phận, costCode, supplier

#### TC-RPT-011: Reviewer không xem được báo cáo chi phí

- **Auth:** `tanvt` (reviewer)
- **Steps:** Truy cập `/reports/expenses`
- **Expected:** 403 hoặc redirect

#### TC-RPT-012: Lọc theo bộ phận / mã phí / nhà cung cấp

- **Steps:** Áp dụng các filter, xem kết quả
- **Expected:** Tổng và danh sách chi tiết đúng với bộ lọc

#### TC-RPT-013: Export báo cáo Excel (nếu F012 đã implement)

- **Auth:** `hongdv` (approver) hoặc admin
- **Steps:** Bấm "Export Excel"
- **Expected:** File .xlsx tải về, dữ liệu khớp với bảng

---

## 9. ADMIN — QUẢN TRỊ

### 9.1 Quản Lý Người Dùng (S11 `/admin/users`)

#### TC-ADM-001: Admin xem danh sách người dùng

- **Auth:** admin
- **Expected:** Danh sách user, phân trang, có thể tìm kiếm theo tên/username

#### TC-ADM-002: Tạo người dùng mới

- **Steps:**
  1. Bấm "Tạo user"
  2. Nhập username, fullName, email, departmentId, position, role
  3. Submit
- **Expected:**
  - User tạo thành công
  - `isFirstLogin = true`, `isActive = true`
  - Email N005 gửi đến user mới

#### TC-ADM-003: Cập nhật thông tin user

- **Steps:** Sửa fullName, role, departmentId → Lưu
- **Expected:** Cập nhật đúng trong DB và UI

#### TC-ADM-004: Vô hiệu hóa tài khoản (`isActive = false`)

- **Steps:** Toggle inactive cho user
- **Expected:** User không đăng nhập được (E002)

#### TC-ADM-005: Soft delete user

- **Steps:** Xóa user
- **Expected:** `isDeleted = true`, không xuất hiện trong danh sách

#### TC-ADM-006: Reset mật khẩu tạm thời

- **Steps:** Bấm "Reset mật khẩu" cho user
- **Expected:** `isFirstLogin = true`, user nhận email N007

#### TC-ADM-007: Username / email phải unique

- **Steps:** Tạo user với username hoặc email đã tồn tại
- **Expected:** Lỗi validation (E005)

---

### 9.2 Quản Lý Bộ Phận (S12 `/admin/departments`)

#### TC-ADM-010: CRUD bộ phận

- **TC-ADM-010a:** Tạo bộ phận mới (tên unique)
- **TC-ADM-010b:** Cập nhật tên, mô tả
- **TC-ADM-010c:** Soft delete (không hard delete)
- **Expected:** Thành công, tên bộ phận phải unique

---

### 9.3 Quản Lý Mã Phí (S13 `/admin/cost-codes`)

#### TC-ADM-020: CRUD mã phí

- **TC-ADM-020a:** Tạo mã phí mới — code unique (`IT0099`), gán cho bộ phận
- **TC-ADM-020b:** Cập nhật tên mô tả
- **TC-ADM-020c:** Soft delete mã phí
- **Expected:** Mã phí sau khi xóa không xuất hiện trong dropdown tạo tờ trình mới

#### TC-ADM-021: Snapshot costCodeName trong ExpenseLine

- **Steps:** Tạo tờ trình với costCode `IT0001`, sau đó admin đổi tên IT0001
- **Expected:** ExpenseLine cũ vẫn hiển thị tên gốc (denormalized snapshot)

---

### 9.4 Cấu Hình Phân Quyền Duyệt (S14 `/admin/approval-config`)

#### TC-ADM-030: Xem cấu hình theo bộ phận

- **Expected:** Danh sách bộ phận kèm reviewer + approver đang được gán

#### TC-ADM-031: Cập nhật reviewer / approver cho bộ phận

- **Steps:** Đổi reviewer của bộ phận IT sang user khác có role `reviewer`
- **Expected:**
  - Cấu hình lưu thành công
  - Tờ trình IT mới tạo sau đó dùng reviewer mới

#### TC-ADM-032: Chỉ gán đúng role

- **Steps:** Thử gán user `staff` làm reviewer
- **Expected:** Validation lỗi, không cho phép

---

### 9.5 Hồ Sơ Cá Nhân (S15 `/profile`)

#### TC-ADM-040: Xem và cập nhật hồ sơ

- **Auth:** Bất kỳ role
- **Steps:** Mở `/profile`, sửa fullName, position → Lưu
- **Expected:** Cập nhật thành công, tên hiển thị trong sidebar cập nhật

#### TC-ADM-041: Đổi mật khẩu từ profile

- **Steps:** Nhập currentPassword, newPassword, confirmPassword
- **Expected:** Đổi thành công, revoke tất cả refresh token khác

---

## 10. PERMISSION — PHÂN QUYỀN

### 10.1 Kiểm Tra Theo Ma Trận

Kiểm tra negative cases — user không có quyền cố truy cập:

| ID             | Auth            | Action                                   | Expected       |
|----------------|-----------------|------------------------------------------|----------------|
| TC-PERM-001    | `staff`         | Truy cập `/reports`                      | 403/Redirect   |
| TC-PERM-002    | `staff`         | Truy cập `/reports/expenses`             | 403/Redirect   |
| TC-PERM-003    | `staff`         | Truy cập `/admin/users`                  | 403/Redirect   |
| TC-PERM-004    | `reviewer`      | Truy cập `/reports/expenses`             | 403/Redirect   |
| TC-PERM-005    | `reviewer`      | Truy cập `/admin/users`                  | 403/Redirect   |
| TC-PERM-006    | `approver`      | Truy cập `/admin/users`                  | 403/Redirect   |
| TC-PERM-007    | `reviewer`      | Sửa tờ trình người khác                  | E003           |
| TC-PERM-008    | `approver`      | Sửa tờ trình người khác                  | E003           |
| TC-PERM-009    | `staff`         | Gọi API thẩm định (`/review`)            | E003           |
| TC-PERM-010    | `reviewer`      | Gọi API phê duyệt (`/approve`)           | E003           |
| TC-PERM-011    | `reviewer`/`approver` | Xóa tờ trình người khác           | E003           |

### 10.2 Kiểm Tra Server-Side Enforcement

Quan trọng: UI ẩn nút không có nghĩa là backend an toàn. Test trực tiếp API:

#### TC-PERM-020: Staff gọi API reviewer trực tiếp

- **Steps:** Dùng auth token của `hungnt` (staff), gọi `POST /api/submissions/{id}/review`
- **Expected:** HTTP 403, body E003

#### TC-PERM-021: Reviewer gọi API admin trực tiếp

- **Steps:** Dùng auth token của `tanvt`, gọi `POST /api/admin/users`
- **Expected:** HTTP 403

### 10.3 Data Scope — Staff Chỉ Thấy Bộ Phận Mình

#### TC-PERM-030: GET /api/submissions với staff

- **Auth:** `lienhm` (staff, Kế toán)
- **Expected:** Response chỉ chứa tờ trình của bộ phận Kế toán

#### TC-PERM-031: Staff truy cập tờ trình bộ phận khác

- **Auth:** `lienhm`, truy cập tờ trình của IT
- **Expected:** 404 (không tiết lộ tồn tại) hoặc 403

---

## 11. ERROR HANDLING

### 11.1 Bảng Mã Lỗi

| Test ID        | Mã Lỗi | Tình Huống                              | Expected UI                                     |
|----------------|--------|-----------------------------------------|-------------------------------------------------|
| TC-ERR-001     | E001   | Sai login                               | Toast/inline: "Thông tin đăng nhập không đúng"  |
| TC-ERR-002     | E002   | Tài khoản bị khóa                       | "Tài khoản đã bị khóa. Liên hệ quản trị viên." |
| TC-ERR-003     | E003   | Không có quyền                          | "Bạn không có quyền thực hiện thao tác này."   |
| TC-ERR-004     | E004   | Tờ trình không tồn tại                  | "Không tìm thấy tờ trình."                      |
| TC-ERR-005     | E005   | Validation field lỗi                    | Inline error trên từng field                    |
| TC-ERR-006     | E006   | Chuyển trạng thái không hợp lệ          | "Trạng thái tờ trình không cho phép..."         |
| TC-ERR-007     | E007   | Không đúng người được phân công         | "Bạn không được phân công xử lý tờ trình này." |
| TC-ERR-008     | E008   | Token hết hạn (silent refresh)          | Không hiển thị — tự refresh rồi retry          |
| TC-ERR-009     | E009   | Refresh token hết hạn                   | "Phiên đăng nhập đã hết hạn..." → redirect login |
| TC-ERR-010     | E012   | Từ chối không có lý do                  | "Vui lòng nhập lý do từ chối."                  |
| TC-ERR-011     | E013   | MS không có dòng chi phí               | "Phải có ít nhất một dòng chi phí."             |
| TC-ERR-012     | E014   | isFirstLogin + gọi API khác            | "Bạn cần đổi mật khẩu trước khi tiếp tục."     |

### 11.2 Silent Token Refresh (TC-ERR-020)

- **Steps:**
  1. Đăng nhập, để access token hết hạn (mock hoặc chờ)
  2. Thực hiện action bất kỳ
- **Expected:**
  - Frontend tự gọi `POST /api/auth/refresh`
  - Nhận accessToken mới
  - Retry request gốc thành công
  - User không thấy màn hình lỗi

### 11.3 Stack Trace Không Lộ Ra UI (TC-ERR-030)

- **Steps:** Trigger lỗi 500 (nếu có mock hoặc test env)
- **Expected:** UI chỉ hiển thị `"Đã xảy ra lỗi. Vui lòng thử lại sau."`, không có stack trace hay tên file nội bộ

---

## 12. UPLOAD FILE

### TC-UP-001: Upload file đính kèm hợp lệ

- **File:** PDF ≤ 20MB
- **Steps:** Bấm "Đính kèm" trong S06/S08 → chọn file → upload
- **Expected:**
  - POST `/api/upload`
  - File xuất hiện trong danh sách đính kèm với tên
  - Toast N006: `"File "{name}" đã được đính kèm."`

### TC-UP-002: Upload file vượt quá 20MB (E010)

- **Steps:** Chọn file > 20MB
- **Expected:** Lỗi E010: `"File quá lớn. Kích thước tối đa cho phép là 20MB."`

### TC-UP-003: Upload file sai định dạng (E011)

- **File:** `.exe`, `.zip`, `.mp4`
- **Expected:** Lỗi E011: `"Định dạng file không được hỗ trợ."`

### TC-UP-004: Các định dạng được hỗ trợ

- **Files:** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.jpg`, `.jpeg`, `.png`
- **Expected:** Upload thành công

### TC-UP-005: Upload hợp đồng đã ký (NT — signedContract)

- **Auth:** Owner của tờ trình NT
- **Steps:** Upload file vào field `signedContract`
- **Expected:** File lưu với `fileType = 'signed_contract'`

### TC-UP-006: Nhiều file đính kèm

- **Steps:** Upload 5 file liên tiếp
- **Expected:** Tất cả file hiển thị trong danh sách, lưu vào `attachments[]` khi submit

### TC-UP-007: Xem trước ảnh (M04 Lightbox)

- **Steps:** Bấm ảnh nhúng trong nội dung tờ trình
- **Expected:** Lightbox hiển thị ảnh full-screen, có nút đóng

---

## 13. TIÊU CHÍ HOÀN THÀNH

### Định Nghĩa "Pass"

| Mức | Điều Kiện |
|-----|-----------|
| **Pass** | Test case thực thi đúng như expected, không có lỗi unexpected |
| **Fail** | Kết quả không đúng expected, hoặc có lỗi JS uncaught |
| **Skip** | Tính năng chưa implement (ghi chú feature ID tương ứng) |

### Ngưỡng Release

| Nhóm      | Pass Rate Yêu Cầu |
|-----------|-------------------|
| P0 Smoke  | 100%              |
| P1 Core   | ≥ 95%             |
| P2 High   | ≥ 85%             |
| P3 Medium | ≥ 70%             |

### Checklist Trước Release

- [ ] Tất cả P0 test pass trên Chromium
- [ ] Tất cả P1 test pass trên Chromium và Firefox
- [ ] Không có lỗi E003 / E007 unexpectedly xuất hiện với đúng role
- [ ] Silent refresh hoạt động (TC-ERR-020)
- [ ] Upload file hợp lệ / từ chối sai định dạng (TC-UP-001, TC-UP-003)
- [ ] Permission matrix: staff không xem được dữ liệu bộ phận khác
- [ ] Stack trace không lộ ra UI (TC-ERR-030)

---

## Phụ Lục: Mapping Test Case → Feature Backlog

| Test Group | Feature ID (requirements.md §8) |
|------------|----------------------------------|
| TC-AUTH-*  | F001, F002, F003                 |
| TC-SUB-*   | F007, F008, F009, F013, F014     |
| TC-WF-*    | F007, F008                       |
| TC-RPT-*   | F005, F012                       |
| TC-ADM-*   | F006                             |
| TC-PERM-*  | F001, F006                       |
| TC-UP-*    | F004                             |
