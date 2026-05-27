# HV-QLHoSo — Yêu Cầu Hệ Thống

> **Cập nhật:** 2026-05-08
> **Phiên bản:** 2.2.1
> **Ngôn ngữ:** Tiếng Việt (field/link dùng tiếng Anh)
> **Phạm vi:** Tài liệu đầy đủ để xây dựng hệ thống frontend + backend thực tế từ bản mockup

---

## 1. MỤC LỤC

- **2.** [Danh Sách Màn Hình](#2-screen-list)
- **3.** [Ma Trận Phân Quyền](#3-permission-matrix)
- **4.** [Luồng Người Dùng / Nghiệp Vụ](#4-user-flow--business-flow)
- **5.** [Danh Sách Field / Data Dictionary](#5-field-list--data-dictionary)
- **6.** [Luồng Dữ Liệu / API Spec](#6-data-flow--api-spec)
- **7.** [Mockup / Wireframe](#7-mockup--wireframe)
- **8.** [Requirement Backlog](#8-requirement-backlog)
- **9.** [Error Handling](#9-error-handling)
- **10.** [Notification Catalog](#10-notification-catalog)
- **11.** [UI Grouping — System Menu](#11-ui-grouping--system-menu)

---

## 2. SCREEN LIST

### 2.1 Xác Thực

| ID  | Tên Màn Hình       | Route              | Auth          | Mô Tả                                                           |
|-----|--------------------|--------------------|---------------|-----------------------------------------------------------------|
| S01 | Đăng nhập          | `/login`           | Public        | Form nhập username + password; nút đăng nhập bằng Google; nhận JWT access token |
| S02 | Đổi mật khẩu lần đầu | `/change-password` | Bắt buộc sau login đầu | Hiện nếu `isFirstLogin = true` **và đăng nhập bằng username/password**; bỏ qua nếu đăng nhập bằng Google |
| S03 | Quên mật khẩu      | `/forgot-password` | Public        | Nhập email → nhận link reset qua email                         |
| S04 | Reset mật khẩu     | `/reset-password?token=...` | Public | Nhập mật khẩu mới sau khi click link email                    |

### 2.2 Tờ Trình

| ID  | Tên Màn Hình          | Route                        | Auth        | Mô Tả                                                                          |
|-----|-----------------------|------------------------------|-------------|--------------------------------------------------------------------------------|
| S05 | Danh sách tờ trình    | `/submissions`               | Tất cả role | Bảng tổng hợp tờ trình, phân tab MS / NT, thống kê nhanh, tìm kiếm, lọc, phân trang |
| S06 | Tạo tờ trình          | `/submissions/new`           | Tất cả role | Form tạo mới, chọn loại MS hoặc NT                                             |
| S07 | Chi tiết tờ trình     | `/submissions/[id]`          | Tất cả role | Xem toàn bộ nội dung, thao tác duyệt/từ chối, lịch sử thay đổi trạng thái    |
| S08 | Sửa tờ trình          | `/submissions/[id]/edit`     | Theo rule   | Sửa khi `draft` hoặc `rejected` (chủ sở hữu); sau từ chối cần gửi lại        |

### 2.3 Báo Cáo

| ID  | Tên Màn Hình             | Route               | Auth                          | Mô Tả                                                              |
|-----|--------------------------|---------------------|-------------------------------|--------------------------------------------------------------------|
| S09 | Báo cáo tổng hợp         | `/reports`               | `reviewer`, `approver`, `admin` | Dashboard thống kê: số lượng theo trạng thái, theo bộ phận, theo tháng |
| S10 | Báo cáo chi tiết chi phí | `/reports/expenses`      | `approver`, `admin`           | Tổng chi phí mua sắm theo bộ phận / mã phí / nhà cung cấp / kỳ   |
| S19 | Báo cáo Hợp đồng         | `/reports/contracts`     | `reviewer`, `approver`, `admin` | Danh sách tờ trình NT, theo dõi tình trạng hết hạn hợp đồng       |

### 2.4 Quản Trị (Admin)

| ID  | Tên Màn Hình           | Route                       | Auth    | Mô Tả                                           |
|-----|------------------------|-----------------------------|---------|---------------------------------------------|
| S11 | Quản lý người dùng        | `/admin/users`                | `admin` | CRUD user, gán role, reset mật khẩu, ngưng/kích hoạt tài khoản         |
| S12 | Quản lý bộ phận           | `/admin/departments`          | `admin` | CRUD bộ phận                                                            |
| S13 | Quản lý mã phí            | `/admin/cost-codes`           | `admin` | CRUD danh mục mã phí theo bộ phận                                      |
| S14 | Cấu hình phân quyền duyệt | `/admin/approval-config`      | `admin` | Thiết lập người thẩm định / phê duyệt cho từng bộ phận                 |
| S15 | Hồ sơ cá nhân             | `/profile`                    | Tất cả  | Xem và cập nhật thông tin cá nhân, đổi mật khẩu                        |
| S18 | Danh mục trạng thái       | `/admin/submission-statuses`  | `admin` | Xem và cập nhật tên hiển thị và màu sắc cho từng trạng thái tờ trình   |

### 2.5 Hệ Thống

| ID  | Tên Màn Hình            | Route                      | Auth    | Mô Tả                                                                               |
|-----|-------------------------|----------------------------|---------|-------------------------------------------------------------------------------------|
| S16 | Cấu hình email template | `/system/email-templates`  | `admin` | Xem và chỉnh sửa nội dung các email template theo từng sự kiện workflow (E001–E007) |
| S17 | Email Log               | `/system/logs`             | `admin` | Xem lịch sử email đã gửi: người nhận, tiêu đề, loại, trạng thái, thời gian, ghi chú lỗi; xem nội dung chi tiết từng email |
| S20 | Cấu hình kênh thông báo | `/system/notification-channels` | `admin` | Bật/tắt và cấu hình các kênh nhận thông báo cần duyệt (Email, Google Chat, Custom Webhook) |

### 2.6 Modals / Dialogs

| ID  | Tên Dialog              | Trigger                                       | Mô Tả                                                           |
|-----|-------------------------|-----------------------------------------------|-----------------------------------------------------------------|
| M01 | Xác nhận từ chối        | Bấm "Từ chối" tại S07                         | Nhập lý do từ chối bắt buộc; xác nhận trước khi submit         |
| M02 | Xác nhận xoá tờ trình   | Bấm "Xoá" tại S07 / S05                       | Cảnh báo không thể hoàn tác; yêu cầu confirm                   |
| M03 | Upload file             | Bấm "Đính kèm" trong S06/S08                  | Chọn file từ máy, hiển thị tiến trình upload, preview tên file |
| M04 | Xem trước hình ảnh      | Bấm ảnh nhúng trong nội dung tờ trình         | Lightbox xem ảnh full-screen                                    |
| M05 | Filter panel            | Bấm "Lọc" tại S05                             | Panel lọc trượt xuống dưới toolbar; các trường lọc theo bảng §4.7 |
| M06 | Toast notification      | Sau mỗi action thay đổi trạng thái           | Thông báo in-app tự đóng sau 4 giây, góc dưới phải             |
| M07 | Confirm gửi tờ trình    | Bấm "Gửi tờ trình" tại S07                    | Xác nhận trước khi gửi — sau khi gửi không sửa được            |

---

## 3. PERMISSION MATRIX

### 3.1 Định Nghĩa Vai Trò

| Vai Trò        | Mã         | Mô Tả                                                                                   |
|----------------|------------|-----------------------------------------------------------------------------------------|
| Nhân viên      | `staff`    | Tạo và quản lý tờ trình; xem tờ trình cùng bộ phận mình **hoặc** do chính mình tạo    |
| Thẩm định      | `reviewer` | Thẩm định tờ trình `pending_review` của tất cả bộ phận được phân công; xem tất cả tờ trình  |
| Phê duyệt      | `approver` | Phê duyệt / từ chối tờ trình `in_review` được phân công; xem tất cả tờ trình           |
| Quản trị       | `admin`    | Toàn quyền: CRUD users, cấu hình hệ thống, xem tất cả báo cáo, không bị giới hạn scope |

> **Đa vai trò:** Một người dùng có thể được gán **nhiều vai trò** cùng lúc (ví dụ: vừa `reviewer` vừa `approver`). Quyền truy cập là **hợp (union)** của tất cả vai trò được gán — vai trò nào cho phép thì được phép. Ma trận quyền §3.2 và scope §3.3 áp dụng theo nguyên tắc này.

### 3.2 Ma Trận Quyền

#### Module Xác Thực

| Chức năng                   | staff | reviewer | approver | admin |
|-----------------------------|-------|----------|----------|-------|
| Đăng nhập (username/password) | ✅  | ✅       | ✅       | ✅    |
| Đăng nhập bằng Google       | ✅    | ✅       | ✅       | ✅    |
| Đổi mật khẩu của mình       | ✅    | ✅       | ✅       | ✅    |
| Reset mật khẩu người khác   | ❌    | ❌       | ❌       | ✅    |
| Quên mật khẩu (qua email)   | ✅    | ✅       | ✅       | ✅    |

#### Module Tờ Trình

| Chức năng                                         | staff               | reviewer    | approver    | admin |
|---------------------------------------------------|---------------------|-------------|-------------|-------|
| Xem danh sách tờ trình                            | ✅ (bộ phận mình)   | ✅ (tất cả) | ✅ (tất cả) | ✅    |
| Tạo tờ trình mới                                  | ✅                  | ✅          | ✅          | ✅    |
| Xem chi tiết tờ trình                             | ✅ (bộ phận mình)   | ✅          | ✅          | ✅    |
| Sửa tờ trình (đang `draft`)                       | ✅ (của mình)       | ❌          | ❌          | ✅    |
| Sửa tờ trình (đang `rejected`)                    | ✅ (của mình)       | ❌          | ❌          | ✅    |
| Gửi tờ trình (`draft` → `pending_review`)         | ✅ (của mình)       | ❌          | ❌          | ✅    |
| Gửi lại tờ trình (`rejected` → `pending_review`)  | ✅ (của mình)       | ❌          | ❌          | ✅    |
| Thẩm định (`pending_review` → `in_review`)        | ❌                  | ✅ (được phân công) | ❌   | ✅    |
| Phê duyệt (`in_review` → `approved`)             | ❌                  | ❌          | ✅ (được phân công) | ✅ |
| Từ chối ở bước thẩm định (`pending_review` → `rejected`) | ❌           | ✅ (được phân công) | ❌   | ✅    |
| Từ chối ở bước phê duyệt (`in_review` → `rejected`) | ❌               | ❌          | ✅ (được phân công) | ✅ |
| Xoá tờ trình (chỉ `draft`)                        | ✅ (của mình)       | ❌          | ❌          | ✅    |
| Tạo lại tờ trình (clone)                          | ✅ (bộ phận mình)   | ✅          | ✅          | ✅    |
| Upload file đính kèm                              | ✅                  | ✅          | ✅          | ✅    |
| Upload hợp đồng đã ký (NT)                        | ✅ (của mình)       | ✅          | ✅          | ✅    |

#### Module Báo Cáo

| Chức năng                   | staff | reviewer | approver | admin |
|-----------------------------|-------|----------|----------|-------|
| Xem báo cáo tổng hợp        | ❌    | ✅       | ✅       | ✅    |
| Xem báo cáo chi tiết chi phí| ❌    | ❌       | ✅       | ✅    |
| Xem báo cáo hợp đồng (S19)  | ❌    | ✅       | ✅       | ✅    |
| Export báo cáo (PDF/Excel)  | ❌    | ❌       | ✅       | ✅    |

#### Module Quản Trị

| Chức năng                   | staff | reviewer | approver | admin |
|-----------------------------|-------|----------|----------|-------|
| CRUD người dùng             | ❌    | ❌       | ❌       | ✅    |
| Ngưng / kích hoạt tài khoản | ❌    | ❌       | ❌       | ✅    |
| Gán / thay đổi role         | ❌    | ❌       | ❌       | ✅    |
| CRUD bộ phận                | ❌    | ❌       | ❌       | ✅    |
| CRUD mã phí                 | ❌    | ❌       | ❌       | ✅    |
| Cấu hình phân quyền duyệt  | ❌    | ❌       | ❌       | ✅    |
| Cấu hình danh mục trạng thái | ❌  | ❌       | ❌       | ✅    |
| Cấu hình email template     | ❌    | ❌       | ❌       | ✅    |
| Cấu hình kênh thông báo (S20) | ❌  | ❌       | ❌       | ✅    |
| Xem email log               | ❌    | ❌       | ❌       | ✅    |

### 3.3 Data Access Rules

| Tập hợp vai trò của user | Scope tờ trình | Điều kiện lọc phía server |
|--------------------------|----------------|---------------------------|
| Chỉ có `staff` | Bộ phận mình + tờ trình do mình tạo | `WHERE departmentId = currentUser.departmentId OR submitterId = currentUser.id` |
| Có `reviewer` hoặc `approver` (dù có thêm `staff` hay không) | Tất cả | Không filter |
| Có `admin` | Tất cả | Không filter |

> **Quy tắc scope đa vai trò:** Lấy scope **rộng nhất** trong tất cả vai trò được gán. Nếu user có bất kỳ vai trò nào trong `{reviewer, approver, admin}`, họ thấy tất cả tờ trình.

> ⚠️ **QUAN TRỌNG — Server luôn enforce:** UI chỉ ẩn/hiện nút theo role, nhưng server phải kiểm tra quyền ở mọi API call. Không được chỉ dựa vào UI để bảo vệ dữ liệu.

### 3.4 Business Rules Phân Quyền Duyệt

- Mỗi bộ phận được cấu hình **một** người thẩm định và **một** người phê duyệt.
- Khi tờ trình được tạo, hệ thống **tự động gán** `reviewerId` và `approverId` dựa vào `departmentId`.
- Người thẩm định chỉ có thể thẩm định tờ trình của bộ phận **mà mình được phân công**.
- Người phê duyệt chỉ có thể phê duyệt tờ trình của bộ phận **mà mình được phân công**.
- Admin bypass toàn bộ kiểm tra này.

Cấu hình mặc định:

| Bộ Phận    | Người Thẩm Định             | Người Phê Duyệt                     |
|------------|-----------------------------|-------------------------------------|
| IT         | Trưởng phòng IT             | Giám đốc                            |
| Kế toán    | Kế toán trưởng              | Giám đốc                            |
| Marketing  | Kế toán trưởng              | Quản lý Marketing                   |
| Mua hàng   | Trưởng phòng Mua hàng       | Phó giám đốc                        |
| Hành chính | Kế toán trưởng              | Giám đốc                            |

---

## 4. USER FLOW / BUSINESS FLOW

### 4.1 Luồng Đăng Nhập

#### 4.1.1 Đăng nhập bằng Username / Password

```
[S01 Đăng nhập]
    │
    ├─ Nhập username + password → POST /api/auth/login
    │
    ├─ Nếu sai thông tin → Hiển thị lỗi E001 (không tiết lộ field nào sai)
    │
    ├─ Nếu tài khoản bị khóa (isActive = false) → Hiển thị lỗi E002
    │
    ├─ Nếu isFirstLogin = true
    │   └─ Redirect bắt buộc → [S02 Đổi mật khẩu lần đầu]
    │       ├─ Nhập mật khẩu mới + xác nhận
    │       ├─ POST /api/auth/change-password
    │       └─ Cập nhật isFirstLogin = false → Redirect → /submissions
    │
    └─ Đăng nhập thành công
        ├─ Server trả về: { accessToken, refreshToken, user }
        ├─ Frontend lưu: accessToken vào memory, refreshToken vào httpOnly cookie
        └─ Redirect → /submissions
```

> ⚠️ **KHÔNG THỂ BỎ QUA:** Nếu `isFirstLogin = true` → server từ chối mọi API call khác (trừ `/api/auth/change-password`) cho đến khi hoàn thành đổi mật khẩu.

#### 4.1.2 Đăng nhập bằng Google (Firebase)

```
[S01 Đăng nhập — Bấm "Đăng nhập bằng Google"]
    │
    ├─ Frontend: Gọi Firebase Google Sign-In popup
    │   └─ Nhận Google ID Token (JWT) từ Firebase
    │
    ├─ Frontend: POST /api/auth/google  { idToken }
    │
    ├─ Server: Verify ID Token với Firebase Admin SDK
    │   ├─ Nếu token không hợp lệ / hết hạn → E001
    │   └─ Trích xuất email từ token đã verify
    │
    ├─ Server: READ User WHERE email = googleEmail AND isDeleted = false
    │   ├─ Nếu không tìm thấy → E015 ("Email chưa được đăng ký trong hệ thống")
    │   └─ Nếu isActive = false → E002
    │
    ├─ Đăng nhập thành công (KHÔNG kiểm tra isFirstLogin)
    │   ├─ WRITE: User.lastLoginAt = now()
    │   ├─ Generate: accessToken (JWT, 15 phút), refreshToken (opaque, 7 ngày)
    │   ├─ WRITE: INSERT RefreshToken
    │   └─ Response: { accessToken, user }
    │       + Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict
    │
    └─ Redirect → /submissions
```

> **Quy tắc:** Chỉ tài khoản **đã tồn tại** và **đang hoạt động** (`isActive = true`) mới được phép đăng nhập bằng Google. Hệ thống không tự tạo tài khoản mới từ Google.
> `isFirstLogin = true` **không** block người dùng đăng nhập bằng Google — bỏ qua bước đổi mật khẩu lần đầu.

### 4.2 Luồng Refresh Token / Silent Auth

```
[Mọi API request]
    │
    ├─ Gắn Authorization: Bearer {accessToken}
    │
    ├─ Nếu server trả 401 (token hết hạn)
    │   ├─ Frontend tự động gọi POST /api/auth/refresh (dùng refreshToken trong cookie)
    │   ├─ Nhận accessToken mới → thử lại request gốc
    │   └─ Nếu refresh cũng thất bại → Logout, redirect /login
    │
    └─ Nếu 403 (không có quyền) → Hiển thị lỗi E003, không redirect
```

### 4.3 Luồng Tạo Tờ Trình

```
[S06 Tạo tờ trình]
    │
    ├─ Chọn loại: MS (Mua sắm) hoặc NT (Nguyên tắc)
    │   └─ Form thay đổi section tương ứng
    │
    ├─ Điền thông tin chung
    │   ├─ department: mặc định là bộ phận của user đang đăng nhập; vẫn cho phép đổi sang bộ phận khác qua dropdown → hệ thống auto-fill tên người thẩm định + phê duyệt
    │   ├─ submittedDate: mặc định là ngày hôm nay
    │   ├─ title: tiêu đề (bắt buộc)
    │   └─ content: nội dung chi tiết (tuỳ chọn, hỗ trợ nhúng ảnh)
    │
    ├─ [Nếu type = MS] Điền danh sách chi phí (≥ 1 dòng bắt buộc)
    │   ├─ Chọn costCode (dropdown theo bộ phận)
    │   ├─ Điền amountExVat (bắt buộc)
    │   ├─ Điền vatRate: % VAT (bắt buộc, số nguyên 1–100, mặc định 10)
    │   │   └─ amountIncVat tự động tính = amountExVat × (1 + vatRate/100), readonly
    │   ├─ Điền supplier (tuỳ chọn)
    │   ├─ Tuỳ chọn: purchasedFor, purpose, usedBy
    │   └─ Thêm vật tư có sẵn (không mua thêm, ghi nhận để đối chiếu)
    │
    ├─ [Nếu type = NT] Điền thông tin hợp đồng
    │   ├─ supplier (bắt buộc)
    │   ├─ contractStartDate / contractEndDate (bắt buộc)
    │   └─ Section "Hợp đồng đã ký kết" (tuỳ chọn) — nằm riêng dưới vùng thông tin hợp đồng
    │       ├─ Nút [Tải lên]: chọn 1 file bất kỳ từ máy, tối đa 20MB
    │       ├─ Upload lại ghi đè file cũ (1 tờ trình NT chỉ có 1 signedContract tại 1 thời điểm)
    │       └─ Sau khi upload: hiển thị tên file dạng link; click → mở file ở tab mới
    │
    ├─ Đính kèm file hỗ trợ (tuỳ chọn, nhiều file)
    │   └─ POST /api/upload → nhận url → lưu vào attachments[]
    │
    ├─ Bấm "Gửi tờ trình" → [M07 Xác nhận]
    │   ├─ POST /api/submissions  { ..., action: 'submit' }
    │   ├─ Server: auto-gen code, gán reviewerId + approverId, status = 'pending_review'
    │   ├─ WRITE: SubmissionLog (action = 'submit')
    │   ├─ EMAIL: Gửi thông báo đến người thẩm định
    │   └─ Redirect → /submissions/{id}
    │
    └─ Bấm "Lưu nháp"
        ├─ POST /api/submissions  { ..., action: 'draft' }
        ├─ Server: auto-gen code, gán reviewerId + approverId, status = 'draft'
        ├─ WRITE: SubmissionLog (action = 'create')
        └─ Redirect → /submissions/{id}
```

### 4.4 Luồng Duyệt Tờ Trình (Workflow Chính)

```
┌─────────────────────────────────────────────────────────┐
│                   STATUS: draft                         │
└─────────────────────────────────────────────────────────┘
    │
    │  Người trình bấm "Gửi tờ trình" → [M07 Confirm]
    │
    ├─ POST /api/submissions/{id}/submit
    │   ├─ Server check: currentUser là submitterId hoặc admin
    │   ├─ Server check: status === 'draft'
    │   ├─ WRITE: status → 'pending_review'
    │   ├─ WRITE: SubmissionLog (INSERT: action='submit', userId, timestamp)
    │   └─ EMAIL: Gửi thông báo đến người thẩm định
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              STATUS: pending_review                     │
│              (Chờ thẩm định)                            │
└─────────────────────────────────────────────────────────┘
    │
    ├─── Người thẩm định bấm "Thẩm định"
    │    ├─ POST /api/submissions/{id}/review
    │    ├─ Server check: currentUser.id === reviewerId hoặc admin
    │    ├─ Server check: status === 'pending_review'
    │    ├─ WRITE: status → 'in_review', reviewedAt = now()
    │    ├─ WRITE: SubmissionLog (INSERT)
    │    └─ EMAIL: Gửi thông báo đến người phê duyệt
    │
    └─── Người thẩm định bấm "Từ chối" → [M01 Nhập lý do]
         ├─ POST /api/submissions/{id}/reject  { reason: "..." }
         ├─ Server check: currentUser.id === reviewerId hoặc admin
         ├─ Server check: status === 'pending_review'
         ├─ WRITE: status → 'rejected', rejectionReason = reason
         ├─ WRITE: SubmissionLog (INSERT)
         └─ EMAIL: Thông báo từ chối kèm lý do → người trình
         │
         ▼
       ┌─────────────────────────────────┐
       │   STATUS: rejected ❌          │
       │   → Người trình có thể sửa     │
       │     và gửi lại (→ pending_review) │
       └─────────────────────────────────┘

    ▼
┌─────────────────────────────────────────────────────────┐
│              STATUS: in_review                          │
│              (Chờ phê duyệt)                            │
└─────────────────────────────────────────────────────────┘
    │
    ├─── Người phê duyệt bấm "Phê duyệt"
    │    ├─ POST /api/submissions/{id}/approve
    │    ├─ Server check: currentUser.id === approverId hoặc admin
    │    ├─ Server check: status === 'in_review'
    │    ├─ WRITE: status → 'approved', approvedAt = now()
    │    ├─ WRITE: SubmissionLog (INSERT)
    │    └─ EMAIL: Thông báo đã phê duyệt → người trình
    │    │
    │    ▼
    │  ┌─────────────────────────────────┐
    │  │   STATUS: approved ✅          │
    │  │   (Kết thúc — Thành công)       │
    │  └─────────────────────────────────┘
    │
    └─── Người phê duyệt bấm "Từ chối" → [M01 Nhập lý do]
         ├─ POST /api/submissions/{id}/reject  { reason: "..." }
         ├─ Server check: currentUser.id === approverId hoặc admin
         ├─ Server check: status === 'in_review'
         ├─ WRITE: status → 'rejected', rejectionReason = reason
         ├─ WRITE: SubmissionLog (INSERT)
         └─ EMAIL: Thông báo từ chối kèm lý do → người trình
         │
         ▼
       ┌─────────────────────────────────┐
       │   STATUS: rejected ❌          │
       │   → Người trình có thể sửa     │
       │     và gửi lại (→ pending_review) │
       └─────────────────────────────────┘
```

> ⚠️ **Quy tắc bất biến:** Server từ chối mọi chuyển trạng thái không đúng thứ tự. Không thể bỏ qua thẩm định, không thể quay về trạng thái trước (ngoại trừ rejected → sửa → pending_review).

### 4.5 Luồng Sửa Và Gửi Lại Sau Từ Chối

```
[Tờ trình đang rejected]
    │
    ├─ Người trình bấm "Sửa" → [S08 Sửa tờ trình]
    │   ├─ GET /api/submissions/{id} (load dữ liệu hiện tại)
    │   ├─ Cho phép sửa tất cả field như khi tạo mới
    │   └─ PUT /api/submissions/{id}
    │       ├─ Server check: currentUser là submitterId hoặc admin
    │       └─ Server check: status ∈ ['draft', 'rejected']
    │
    └─ Bấm "Gửi lại" → chuyển rejected → pending_review
        ├─ POST /api/submissions/{id}/submit
        └─ Giống hệt luồng gửi lần đầu
```

### 4.6 Luồng Upload File

> **Storage:** Cloudflare R2, bucket `hvdocspro`. DB lưu `storageKey` (R2 object key), không lưu full URL.
> URL công khai = `R2_PUBLIC_URL + "/" + storageKey`.
> Prefix môi trường: `dev/` (dev) | `prod/` (production).

#### Đính kèm file hỗ trợ (attachments — cả MS và NT)

```
[Người dùng chọn file trong S06/S08]
    │
    ├─ POST /api/upload  (multipart/form-data)
    │   ├─ Server validate: size ≤ 20MB, extension ∈ [pdf, doc, docx, xls, xlsx, jpg, jpeg, png, gif]
    │   ├─ Tạo key: {env}/submissions/{submissionId}/attachments/{uuid}.{ext}
    │   ├─ Upload lên Cloudflare R2
    │   ├─ WRITE: INSERT Attachment { storageKey, name, mimeType, sizeBytes, ... }
    │   └─ Trả về: { id, name, storageKey, publicUrl, mimeType, sizeBytes }
    │
    ├─ Frontend hiển thị file trong danh sách đính kèm
    │
    └─ Khi lưu tờ trình: gửi mảng attachmentIds[]
```

#### Hợp đồng đã ký kết (signedContract — chỉ NT)

```
[Người dùng bấm "Tải lên" trong section "Hợp đồng đã ký kết" tại S06/S07/S08]
    │
    ├─ POST /api/upload  (multipart/form-data)
    │   ├─ Server validate: size ≤ 20MB (không giới hạn extension)
    │   ├─ Tạo key: {env}/submissions/{submissionId}/contracts/{uuid}.{ext}
    │   ├─ Upload lên Cloudflare R2
    │   └─ Trả về: { id, name, storageKey, publicUrl }
    │
    ├─ Frontend thay thế file hiển thị (chỉ giữ 1 file — ghi đè file cũ nếu có)
    │   └─ File R2 cũ bị xoá bất đồng bộ (DELETE /api/upload/:id)
    │
    └─ Khi lưu tờ trình: gửi signedContractId (UUID của Attachment vừa upload)

[Người dùng click tên file đã upload]
    └─ Mở publicUrl trong tab mới
```

#### Ảnh đại diện (avatar — S15 Hồ sơ cá nhân)

```
[Người dùng bấm đổi ảnh đại diện tại S15]
    │
    ├─ POST /api/upload/avatar  (multipart/form-data)
    │   ├─ Server validate: size ≤ 5MB, extension ∈ [jpg, jpeg, png, webp]
    │   ├─ Tạo key: {env}/user/{userId}/profile-picture/{uuid}.{ext}
    │   ├─ Upload lên Cloudflare R2
    │   ├─ Xoá file R2 cũ (nếu có avatarKey cũ)
    │   ├─ WRITE: UPDATE User.avatarKey = newKey
    │   └─ Trả về: { avatarKey, publicUrl }
    │
    └─ Frontend cập nhật avatar hiển thị ở sidebar footer + profile page
```

### 4.7 Luồng Tìm Kiếm & Lọc (S05)

```
[S05 Danh sách — GET /api/submissions?params]
    │
    ├─ Tab: type=MS hoặc type=NT (bắt buộc)
    │
    ├─ Search (q): full-text trên code, title, content, supplier
    │
    ├─ Filter (hiển thị trong M05 — Filter panel):
    │   ├─ department        → Dropdown chọn bộ phận; cả 2 tab
    │   ├─ status            → Dropdown chọn trạng thái; cả 2 tab
    │   ├─ supplier          → Text partial match; CHỈ hiển thị khi tab = NT
    │   ├─ reviewerId        → Dropdown chọn người thẩm định; cả 2 tab
    │   ├─ approverId        → Dropdown chọn người phê duyệt; cả 2 tab
    │   └─ submittedDate     → Bộ chọn ngày From – To; cả 2 tab
    │
    └─ Phân trang: page, limit (default 20)
        └─ Trả về: { data: Submission[], total, page, totalPages }
```

#### Quy tắc filter panel (M05)

| Trường | Loại control | Tab hiển thị | Tham số API |
|--------|-------------|--------------|-------------|
| Bộ phận | Dropdown (danh sách department) | MS + NT | `department` |
| Trạng thái | Dropdown (danh sách status) | MS + NT | `status` |
| Nhà cung cấp | Text input (partial match) | **NT only** | `supplier` |
| Người thẩm định | Dropdown (danh sách reviewer) | MS + NT | `reviewerId` |
| Người phê duyệt | Dropdown (danh sách approver) | MS + NT | `approverId` |
| Ngày trình từ | Date picker | MS + NT | `submittedDateFrom` |
| Ngày trình đến | Date picker | MS + NT | `submittedDateTo` |

> Khi người dùng chuyển tab MS ↔ NT, filter "Nhà cung cấp" ẩn/hiện tương ứng; các giá trị filter khác được giữ nguyên.

### 4.8 Luồng Báo Cáo (S09, S10)

```
[S09 Báo cáo tổng hợp — GET /api/reports/summary]
    │
    ├─ Tham số: month, year (hoặc fromQuarter, toQuarter)
    │
    └─ Server trả về:
        ├─ Tổng số tờ trình theo status
        ├─ Tổng số tờ trình theo type (MS/NT)
        ├─ Tổng số tờ trình theo department
        ├─ Biểu đồ theo tháng (12 tháng gần nhất)
        └─ Tỉ lệ approved / rejected

[S10 Báo cáo chi tiết chi phí — GET /api/reports/expenses]
    │
    ├─ Tham số: fromDate, toDate, department, costCode, supplier
    │
    └─ Server trả về:
        ├─ Tổng chi phí (totalExVat + totalIncVat) theo department
        ├─ Tổng chi phí theo costCode
        ├─ Tổng chi phí theo supplier
        └─ Danh sách chi tiết tờ trình có chi phí
```

### 4.9 Luồng Báo Cáo Hợp Đồng (S19)

```
[S19 Báo cáo hợp đồng — GET /api/reports/contracts]
    │
    ├─ Tham số: q?, contractStatus?, contractEndDateFrom?, contractEndDateTo?, page, limit
    │
    ├─ Server apply data scope §3.3 (reviewer/approver/admin thấy tất cả)
    │
    └─ Server trả về:
        ├─ summary: { total, expiringSoon, expired }
        │   ├─ expiringSoon: contractEndDate ∈ [today, today+30]
        │   └─ expired:      contractEndDate < today
        └─ data: Submission[] (type=NT, chỉ status ≠ draft), total, page, totalPages
```

### 4.10 Luồng Tạo Lại Tờ Trình (Clone)

```
[Người dùng bấm "Tạo lại tờ trình" tại S07 hoặc row action S05]
    │
    ├─ Frontend đọc dữ liệu tờ trình hiện tại (đã có trong state/cache)
    │
    ├─ Điền sẵn vào S06 (form tạo mới) theo quy tắc:
    │   ├─ type              → giữ nguyên (MS hoặc NT)
    │   ├─ submittedDate     → ngày hôm nay (KHÔNG copy ngày cũ)
    │   ├─ title             → copy nguyên
    │   ├─ content           → copy nguyên
    │   ├─ department        → copy nếu còn tồn tại; nếu không → bộ phận mặc định của user
    │   ├─ [MS] expenseLines → copy từng dòng; với mỗi dòng:
    │   │   └─ costCode      → giữ nếu còn tồn tại; nếu không → để trống / placeholder
    │   ├─ [NT] supplier, contractStartDate, contractEndDate → copy nguyên
    │   ├─ attachments       → KHÔNG copy (file đính kèm không clone)
    │   └─ signedContract    → KHÔNG copy
    │
    ├─ code, status, reviewerId, approverId → KHÔNG copy (server tự gen khi lưu)
    │
    └─ Người dùng chỉnh sửa tuỳ ý rồi Lưu nháp / Gửi tờ trình như luồng tạo mới (§4.3)
```

> **Quy tắc dropdown không còn giá trị cũ:** Nếu giá trị cũ (department, costCode) đã bị xoá hoặc vô hiệu hóa, điền về giá trị mặc định (department của user hiện tại; costCode để trống). Frontend hiển thị cảnh báo inline nhỏ trên trường bị reset.

---

## 5. FIELD LIST / DATA DICTIONARY

> **Quy ước chung cho production DB:**
> - Tất cả PK: **UUID v7** (time-ordered, sortable)
> - Tất cả timestamp: **TIMESTAMPTZ UTC** (hiển thị theo timezone user)
> - Tất cả delete: **soft delete** (`isDeleted = true`), không hard delete
> - Mọi bảng có **Standard Audit Fields**: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isDeleted`

### 5.1 Entity: User

| Field           | Type          | Required | Constraints                                                         | Description                          |
|-----------------|---------------|----------|---------------------------------------------------------------------|--------------------------------------|
| `id`            | UUID v7       | ✅       | PK                                                                  | ID người dùng                        |
| `username`      | VARCHAR(100)  | ✅       | Unique, lowercase, không dấu                                        | Tên đăng nhập                        |
| `passwordHash`  | VARCHAR(255)  | ✅       | bcrypt, cost factor ≥ 12                                            | Mật khẩu đã hash (không trả về API) |
| `fullName`      | NVARCHAR(200) | ✅       |                                                                     | Họ tên đầy đủ                        |
| `email`         | VARCHAR(255)  | ✅       | Unique, RFC 5322                                                    | Email liên lạc và nhận thông báo     |
| `departmentId`  | UUID v7       | ✅       | FK → Department.id                                                  | Bộ phận công tác                     |
| `position`      | NVARCHAR(200) | ✅       |                                                                     | Chức vụ hiển thị                     |
| `roles`         | VARCHAR[]     | ✅       | Mảng, mỗi phần tử ∈ `{"staff", "reviewer", "approver", "admin"}`; ít nhất 1 phần tử | Danh sách vai trò (đa vai trò) |
| `avatarColor`   | VARCHAR(7)    | ✅       | HEX `#RRGGBB`, Default: `#6366f1`                                   | Màu avatar (dùng khi chưa có ảnh)    |
| `avatarKey`     | VARCHAR(500)  | ❌       | R2 object key, vd: `dev/user/{id}/profile-picture/{uuid}.jpg`       | Ảnh đại diện (null = dùng avatarColor) |
| `isActive`      | BOOLEAN       | ✅       | Default: true                                                       | Tài khoản còn hoạt động              |
| `isFirstLogin`  | BOOLEAN       | ✅       | Default: true                                                       | Bắt buộc đổi mật khẩu lần đầu (chỉ áp dụng với login username/password) |
| `lastLoginAt`   | TIMESTAMPTZ   | ❌       |                                                                     | Lần đăng nhập gần nhất               |
| `createdAt`     | TIMESTAMPTZ   | ✅       | Auto, UTC                                                           | Thời điểm tạo tài khoản              |
| `updatedAt`     | TIMESTAMPTZ   | ✅       | Auto-update, UTC                                                    | Lần cập nhật gần nhất                |
| `isDeleted`     | BOOLEAN       | ✅       | Default: false                                                      | Soft delete                          |

### 5.2 Entity: Department

| Field        | Type          | Required | Constraints    | Description       |
|--------------|---------------|----------|----------------|-------------------|
| `id`         | UUID v7       | ✅       | PK             | ID bộ phận        |
| `name`       | NVARCHAR(100) | ✅       | Unique         | Tên bộ phận       |
| `description`| NVARCHAR(500) | ❌       |                | Mô tả             |
| `isActive`   | BOOLEAN       | ✅       | Default: true  |                   |
| `createdAt`  | TIMESTAMPTZ   | ✅       | Auto           |                   |
| `isDeleted`  | BOOLEAN       | ✅       | Default: false |                   |

Danh sách mặc định: `IT`, `Kế toán`, `Marketing`, `Mua hàng`, `Hành chính`, `Ban lãnh đạo`

### 5.3 Entity: ApprovalConfig

| Field          | Type        | Required | Constraints                            | Description                     |
|----------------|-------------|----------|----------------------------------------|---------------------------------|
| `id`           | UUID v7     | ✅       | PK                                     |                                 |
| `departmentId` | UUID v7     | ✅       | FK → Department.id, Unique             | Bộ phận được cấu hình           |
| `reviewerId`   | UUID v7     | ✅       | FK → User.id (role = reviewer)         | Người thẩm định mặc định        |
| `approverId`   | UUID v7     | ✅       | FK → User.id (role = approver)         | Người phê duyệt mặc định        |
| `updatedAt`    | TIMESTAMPTZ | ✅       | Auto-update                            |                                 |
| `updatedBy`    | UUID v7     | ✅       | FK → User.id                           | Người cấu hình lần cuối         |

### 5.4 Entity: CostCode

| Field          | Type          | Required | Constraints                       | Description                      |
|----------------|---------------|----------|-----------------------------------|----------------------------------|
| `id`           | UUID v7       | ✅       | PK                                |                                  |
| `code`         | VARCHAR(20)   | ✅       | Unique (vd: `IT0001`, `KT0002`)   | Mã phí                           |
| `name`         | NVARCHAR(200) | ✅       |                                   | Tên mô tả                        |
| `departmentId` | UUID v7       | ✅       | FK → Department.id                | Bộ phận sử dụng mã phí này       |
| `isActive`     | BOOLEAN       | ✅       | Default: true                     |                                  |
| `createdAt`    | TIMESTAMPTZ   | ✅       | Auto                              |                                  |
| `isDeleted`    | BOOLEAN       | ✅       | Default: false                    |                                  |

### 5.5 Entity: Submission

#### Standard Fields (cả MS và NT)

| Field          | Type          | Required | Constraints                                                                                      | Description                                   |
|----------------|---------------|----------|--------------------------------------------------------------------------------------------------|-----------------------------------------------|
| `id`           | UUID v7       | ✅       | PK                                                                                               |                                               |
| `type`         | VARCHAR(2)    | ✅       | `"MS" \| "NT"`                                                                                   | Loại tờ trình                                 |
| `code`         | VARCHAR(20)   | ✅       | Unique, Auto-gen: `MS0001`… / `NT0001`…                                                          | Mã tờ trình (seq per type)                    |
| `submitterId`  | UUID v7       | ✅       | FK → User.id                                                                                     | Người tạo tờ trình                            |
| `departmentId` | UUID v7       | ✅       | FK → Department.id                                                                               | Bộ phận của tờ trình                          |
| `submittedDate`| DATE          | ✅       |                                                                                                  | Ngày trình (do người dùng chọn)               |
| `title`        | NVARCHAR(500) | ✅       |                                                                                                  | Tiêu đề / tóm tắt                             |
| `content`      | NTEXT         | ❌       | HTML hoặc Markdown                                                                               | Nội dung chi tiết (tuỳ chọn)                  |
| `status`       | VARCHAR(20)   | ✅       | `"draft" \| "pending_review" \| "in_review" \| "approved" \| "rejected"`, Default: `draft`      | Trạng thái hiện tại                           |
| `reviewerId`   | UUID v7       | ✅       | FK → User.id                                                                                     | Người thẩm định được gán (từ ApprovalConfig)  |
| `approverId`   | UUID v7       | ✅       | FK → User.id                                                                                     | Người phê duyệt được gán                      |
| `reviewedAt`   | TIMESTAMPTZ   | ❌       | Set khi review()                                                                                 | Thời điểm thẩm định xong                      |
| `approvedAt`   | TIMESTAMPTZ   | ❌       | Set khi approve()                                                                                | Thời điểm phê duyệt xong                      |
| `rejectionReason` | NTEXT      | ❌       | Required khi status = rejected                                                                   | Lý do từ chối                                 |
| `signedContractId` | UUID v7  | ❌       | FK → Attachment.id                                                                               | Hợp đồng đã ký (NT)                           |
| `createdAt`    | TIMESTAMPTZ   | ✅       | Auto                                                                                             |                                               |
| `updatedAt`    | TIMESTAMPTZ   | ✅       | Auto-update                                                                                      |                                               |
| `createdBy`    | UUID v7       | ✅       | FK → User.id                                                                                     |                                               |
| `isDeleted`    | BOOLEAN       | ✅       | Default: false                                                                                   | Soft delete (chỉ khi draft)                   |

#### Fields riêng Tờ Trình Mua Sắm (type = MS)

Lưu trong bảng `ExpenseLine` (1-n với Submission) và `ExistingInventory` (1-n):

| Entity              | Mô Tả                                                          |
|---------------------|----------------------------------------------------------------|
| `ExpenseLine`       | Mỗi dòng chi phí; bắt buộc ≥ 1 dòng khi type = MS            |
| `ExistingInventory` | Vật tư hiện có sẵn (không mua thêm); tuỳ chọn                 |

#### Fields riêng Tờ Trình Nguyên Tắc (type = NT)

| Field               | Type          | Required | Constraints                   | Description              |
|---------------------|---------------|----------|-------------------------------|--------------------------|
| `contractStartDate` | DATE          | ✅       |                               | Ngày bắt đầu hợp đồng   |
| `contractEndDate`   | DATE          | ✅       | ≥ contractStartDate           | Ngày hết hạn hợp đồng   |
| `supplier`          | NVARCHAR(300) | ✅       |                               | Nhà cung cấp             |

> **Lưu ý lưu trữ NT fields:** Có thể lưu thêm vào bảng `SubmissionNT` (1-1 với Submission) hoặc cột JSON trong `Submission` tuỳ thiết kế DB.

### 5.6 Entity: ExpenseLine

| Field          | Type          | Required | Constraints                                 | Description                                              |
|----------------|---------------|----------|---------------------------------------------|----------------------------------------------------------|
| `id`           | UUID v7       | ✅       | PK                                          |                                                          |
| `submissionId` | UUID v7       | ✅       | FK → Submission.id, CASCADE DELETE          | Tờ trình chứa dòng chi phí này                          |
| `costCodeId`   | UUID v7       | ✅       | FK → CostCode.id                            | Mã phí                                                   |
| `costCodeName` | NVARCHAR(200) | ✅       | Denormalized snapshot lúc tạo               | Tên mã phí (lưu snapshot để không bị đổi khi admin sửa) |
| `amountExVat`  | BIGINT        | ✅       | ≥ 0, đơn vị VND (không dùng decimal)       | Số tiền chưa VAT                                         |
| `vatRate`      | SMALLINT      | ✅       | 1–100, Default: 10                          | % VAT do user nhập; dùng để tính amountIncVat            |
| `amountIncVat` | BIGINT        | ✅       | = amountExVat × (1 + vatRate/100), readonly | Số tiền đã có VAT (tự tính, dùng để hiển thị tổng)      |
| `supplier`     | NVARCHAR(300) | ❌       | Chỉ áp dụng type = MS                      | Nhà cung cấp dòng chi phí (tuỳ chọn)                    |
| `purchasedFor` | NVARCHAR(200) | ❌       |                                             | Mua cho ai / đơn vị hưởng                               |
| `purpose`      | NVARCHAR(500) | ❌       |                                             | Mục đích sử dụng                                         |
| `usedBy`       | NVARCHAR(200) | ❌       |                                             | Người / bộ phận dùng trực tiếp                          |
| `sortOrder`    | INT           | ✅       | ≥ 1, Default: 1                             | Thứ tự dòng trong danh sách                              |

> **Lưu ý `supplier`:** `ExpenseLine` chỉ tồn tại cho type = MS — `supplier` ở đây là tuỳ chọn. Với type = NT, `supplier` là field riêng bắt buộc (✅) ở phần "Fields riêng Tờ Trình Nguyên Tắc" trong §5.5.

> **Lý do dùng BIGINT thay DECIMAL cho tiền VND:** VND không có số lẻ thập phân. BIGINT tránh lỗi floating-point và đủ cho mọi giá trị thực tế (max ~9.2 × 10¹⁸ đồng).

### 5.7 Entity: ExistingInventory

| Field          | Type          | Required | Description                   |
|----------------|---------------|----------|-------------------------------|
| `id`           | UUID v7       | ✅       | PK                            |
| `submissionId` | UUID v7       | ✅       | FK → Submission.id, CASCADE   |
| `itemName`     | NVARCHAR(300) | ✅       | Tên vật tư / thiết bị         |
| `quantity`     | INT           | ✅       | ≥ 1                           |
| `unit`         | NVARCHAR(50)  | ✅       | Cái, Ram, Hộp, Cuộn...        |
| `sortOrder`    | INT           | ✅       | Thứ tự hiển thị               |

### 5.8 Entity: Attachment

| Field          | Type          | Required | Constraints                                          | Description               |
|----------------|---------------|----------|------------------------------------------------------|---------------------------|
| `id`           | UUID v7       | ✅       | PK                                                   |                           |
| `submissionId` | UUID v7       | ✅       | FK → Submission.id                                   |                           |
| `fileType`     | VARCHAR(20)   | ✅       | `"attachment" \| "signed_contract"`                  | Phân loại file            |
| `name`         | NVARCHAR(300) | ✅       | Tên gốc của file                                     |                           |
| `storageKey`   | VARCHAR(500)  | ✅       | R2 object key — `dev/submissions/{id}/attachments/{uuid}.{ext}` hoặc `.../contracts/{uuid}.{ext}` | Không lưu full URL; URL công khai = `R2_PUBLIC_URL + "/" + storageKey` |
| `mimeType`     | VARCHAR(100)  | ✅       | vd: `application/pdf`, `image/jpeg`                  |                           |
| `sizeBytes`    | BIGINT        | ✅       | ≤ 20 × 1024 × 1024 (20MB)                           | Kích thước file bytes     |
| `uploadedBy`   | UUID v7       | ✅       | FK → User.id                                         |                           |
| `uploadedAt`   | TIMESTAMPTZ   | ✅       | Auto                                                 |                           |

### 5.9 Entity: SubmissionLog (Audit Trail)

| Field          | Type          | Required | Description                                                                                                       |
|----------------|---------------|----------|-------------------------------------------------------------------------------------------------------------------|
| `id`           | UUID v7       | ✅       | PK                                                                                                                |
| `submissionId` | UUID v7       | ✅       | FK → Submission.id                                                                                                |
| `userId`       | UUID v7       | ✅       | FK → User.id — người thực hiện hành động                                                                         |
| `action`       | VARCHAR(50)   | ✅       | `"create" \| "update" \| "submit" \| "review" \| "approve" \| "reject" \| "resubmit" \| "delete"` |
| `fromStatus`   | VARCHAR(20)   | ❌       | Trạng thái trước hành động                                                                                        |
| `toStatus`     | VARCHAR(20)   | ❌       | Trạng thái sau hành động                                                                                          |
| `note`         | NTEXT         | ❌       | Lý do từ chối hoặc ghi chú thêm                                                                                  |
| `createdAt`    | TIMESTAMPTZ   | ✅       | Auto, UTC                                                                                                         |

### 5.10 Entity: RefreshToken

| Field        | Type         | Required | Constraints              | Description                           |
|--------------|--------------|----------|--------------------------|---------------------------------------|
| `id`         | UUID v7      | ✅       | PK                       |                                       |
| `userId`     | UUID v7      | ✅       | FK → User.id             |                                       |
| `tokenHash`  | VARCHAR(255) | ✅       | SHA-256 của token gốc    | Lưu hash, không lưu token thật        |
| `expiresAt`  | TIMESTAMPTZ  | ✅       |                          | Hết hạn sau 7 ngày                    |
| `isRevoked`  | BOOLEAN      | ✅       | Default: false           |                                       |
| `createdAt`  | TIMESTAMPTZ  | ✅       | Auto                     |                                       |
| `userAgent`  | VARCHAR(500) | ❌       |                          | Device info để hiển thị phiên đăng nhập |

### 5.11 Entity: PasswordResetToken

| Field        | Type         | Required | Constraints          | Description               |
|--------------|--------------|----------|----------------------|---------------------------|
| `id`         | UUID v7      | ✅       | PK                   |                           |
| `userId`     | UUID v7      | ✅       | FK → User.id         |                           |
| `tokenHash`  | VARCHAR(255) | ✅       | SHA-256              | Lưu hash                  |
| `expiresAt`  | TIMESTAMPTZ  | ✅       | Hết hạn sau 15 phút  |                           |
| `usedAt`     | TIMESTAMPTZ  | ❌       |                      | Đã dùng — vô hiệu hoá ngay|
| `createdAt`  | TIMESTAMPTZ  | ✅       | Auto                 |                           |

### 5.12 Entity: ItemCatalog (danh mục gợi ý)

| Field        | Type          | Required | Description                          |
|--------------|---------------|----------|--------------------------------------|
| `id`         | UUID v7       | ✅       | PK                                   |
| `name`       | NVARCHAR(300) | ✅       | Tên vật tư / thiết bị                |
| `unit`       | NVARCHAR(50)  | ✅       | Đơn vị tính mặc định                 |
| `isActive`   | BOOLEAN       | ✅       | Default: true                        |

### 5.13 Entity: SubmissionStatus (danh mục trạng thái)

| Field         | Type         | Required | Constraints                                                                  | Description                                   |
|---------------|--------------|----------|------------------------------------------------------------------------------|-----------------------------------------------|
| `code`        | VARCHAR(20)  | ✅       | PK, immutable — `draft` / `pending_review` / `in_review` / `approved` / `rejected` | Mã kỹ thuật, không đổi                |
| `label`       | NVARCHAR(100)| ✅       |                                                                              | Tên hiển thị (admin có thể chỉnh sửa)         |
| `color`       | VARCHAR(7)   | ✅       | HEX `#RRGGBB`                                                                | Màu badge hiển thị trên UI                    |
| `updatedAt`   | TIMESTAMPTZ  | ✅       | Auto-update                                                                  |                                               |
| `updatedBy`   | UUID v7      | ✅       | FK → User.id                                                                 | Admin chỉnh sửa lần cuối                      |

> **Dữ liệu mặc định:**

| code             | label          | color     |
|------------------|----------------|-----------|
| `draft`          | Nháp           | `#6B7280` |
| `pending_review` | Chờ thẩm định  | `#F59E0B` |
| `in_review`      | Chờ phê duyệt  | `#3B82F6` |
| `approved`       | Đã phê duyệt   | `#10B981` |
| `rejected`       | Từ chối        | `#EF4444` |

> **Quy tắc:** `code` là khoá kỹ thuật cố định, không thêm / xoá được. Admin chỉ được chỉnh sửa `label` và `color`.

---

## 6. DATA FLOW / API SPEC

> **Chuẩn Response chung:**
> ```json
> { "success": true, "data": {...} }
> { "success": false, "error": { "code": "E001", "message": "..." } }
> ```
> **Auth header:** `Authorization: Bearer {accessToken}` (trừ public endpoints)

### 6.1 Auth

```
POST /api/auth/login
    Body: { username, password }
    ├─ Validate input
    ├─ READ: User WHERE username = ? AND isDeleted = false
    ├─ Compare bcrypt hash
    ├─ Nếu sai → E001
    ├─ Nếu isActive = false → E002
    ├─ WRITE: User.lastLoginAt = now()
    ├─ Generate: accessToken (JWT, 15 phút), refreshToken (opaque, 7 ngày)
    ├─ WRITE: INSERT RefreshToken (tokenHash, userId, expiresAt)
    └─ Response: { accessToken, user: { id, username, fullName, departmentId, roles: string[], ... } }
       + Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh

POST /api/auth/refresh
    Cookie: refreshToken
    ├─ Hash token → lookup RefreshToken WHERE tokenHash=? AND isRevoked=false AND expiresAt>now
    ├─ Nếu không tìm thấy → 401
    ├─ READ: User.isActive — nếu false → 401 (E002); session tự hết hiệu lực tại đây
    ├─ Generate accessToken mới
    ├─ Rotate refreshToken (revoke cũ, insert mới)
    └─ Response: { accessToken }

POST /api/auth/logout
    ├─ READ: refreshToken từ cookie → hash → WRITE: isRevoked = true
    └─ Clear cookie

POST /api/auth/change-password
    Body: { currentPassword, newPassword, confirmPassword }
    ├─ Verify currentPassword
    ├─ Validate newPassword (≥ 8 ký tự, có chữ hoa, số, ký tự đặc biệt)
    ├─ WRITE: User.passwordHash = bcrypt(newPassword), isFirstLogin = false
    └─ Revoke tất cả refreshToken của user này (buộc login lại ở device khác)

POST /api/auth/google
    Body: { idToken }  (Google ID Token từ Firebase client-side sign-in)
    ├─ Verify idToken với Firebase Admin SDK (GOOGLE_CLIENT_ID trong .env)
    ├─ Trích xuất email từ token đã verify
    ├─ READ: User WHERE email = ? AND isDeleted = false
    ├─ Nếu không tìm thấy → E015
    ├─ Nếu isActive = false → E002
    ├─ WRITE: User.lastLoginAt = now()
    ├─ Generate: accessToken (JWT, 15 phút), refreshToken (opaque, 7 ngày)
    ├─ WRITE: INSERT RefreshToken (tokenHash, userId, expiresAt)
    └─ Response: { accessToken, user: { id, username, fullName, departmentId, roles: string[], ... } }
       + Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh

POST /api/auth/forgot-password
    Body: { email }
    ├─ READ: User WHERE email = ?
    ├─ Generate: resetToken (random 32 bytes), hash → lưu vào PasswordResetToken (TTL 15 phút)
    ├─ EMAIL: Gửi link reset đến email
    └─ Response: { success: true } (luôn trả về success để tránh user enumeration)

POST /api/auth/reset-password
    Body: { token, newPassword, confirmPassword }
    ├─ Hash token → lookup PasswordResetToken WHERE tokenHash=? AND usedAt IS NULL AND expiresAt>now
    ├─ Validate newPassword
    ├─ WRITE: User.passwordHash = bcrypt(newPassword), isFirstLogin = false
    ├─ WRITE: PasswordResetToken.usedAt = now()
    └─ Revoke tất cả refreshToken của user
```

### 6.2 Submission — CRUD

```
GET /api/submissions
    Query: type, q, department, status, supplier, reviewerId, approverId,
           submittedDateFrom, submittedDateTo, page(default:1), limit(default:20)
    ├─ Server apply data scope theo role (§3.3)
    ├─ Apply filters
    ├─ READ: Submission JOIN ExpenseLine JOIN User (submitter, reviewer, approver)
    └─ Response: { data: Submission[], total, page, totalPages }

GET /api/submissions/:id
    ├─ Server check scope: staff chỉ xem department mình
    └─ Response: Submission đầy đủ + expenseLines[] + existingInventory[] + attachments[] + logs[]

POST /api/submissions
    Body: { type, departmentId, submittedDate, title, content, expenseLines[]?,
            existingInventory[]?, contractStartDate?, contractEndDate?, supplier? }
    ├─ Validate bắt buộc theo loại
    ├─ READ: ApprovalConfig WHERE departmentId=? → lấy reviewerId, approverId
    ├─ Auto-gen code: SELECT COUNT(*)+1 WHERE type=? (cần lock để tránh race condition)
    ├─ WRITE: INSERT Submission (status='draft')
    ├─ WRITE: INSERT ExpenseLine[] (nếu MS)
    ├─ WRITE: INSERT ExistingInventory[] (nếu có)
    ├─ WRITE: INSERT SubmissionLog (action='create')
    └─ Response: { id, code }

PUT /api/submissions/:id
    Body: (giống POST, partial update)
    ├─ Server check: status ∈ ['draft', 'rejected']
    ├─ Server check: currentUser là submitterId hoặc admin
    ├─ WRITE: UPDATE Submission
    ├─ WRITE: DELETE + INSERT ExpenseLine[] (replace all)
    ├─ WRITE: DELETE + INSERT ExistingInventory[] (replace all)
    └─ WRITE: INSERT SubmissionLog (action='update')

DELETE /api/submissions/:id
    ├─ Server check: status = 'draft'
    ├─ Server check: currentUser là submitterId hoặc admin
    ├─ WRITE: Submission.isDeleted = true
    └─ WRITE: INSERT SubmissionLog (action='delete')
```

### 6.3 Submission — Workflow Actions

```
POST /api/submissions/:id/submit           (draft → pending_review)
    ├─ Check: status ∈ ['draft', 'rejected']
    ├─ Check: currentUser là submitterId hoặc admin
    ├─ Check (nếu MS): phải có ≥ 1 ExpenseLine
    ├─ WRITE: status='pending_review'
    ├─ WRITE: SubmissionLog (action='submit' hoặc 'resubmit')
    └─ EMAIL: Gửi thông báo → reviewer

POST /api/submissions/:id/review          (pending_review → in_review)
    ├─ Check: status = 'pending_review'
    ├─ Check: currentUser.id = reviewerId hoặc admin
    ├─ WRITE: status='in_review', reviewedAt=now()
    ├─ WRITE: SubmissionLog
    └─ EMAIL: Gửi thông báo → approver

POST /api/submissions/:id/approve         (in_review → approved)
    ├─ Check: status = 'in_review'
    ├─ Check: currentUser.id = approverId hoặc admin
    ├─ WRITE: status='approved', approvedAt=now()
    ├─ WRITE: SubmissionLog
    └─ EMAIL: Gửi thông báo → submitter

POST /api/submissions/:id/reject          (pending_review → rejected  HOẶC  in_review → rejected)
    Body: { reason: string (bắt buộc, không rỗng) }
    ├─ Check: status ∈ ['pending_review', 'in_review']
    ├─ Nếu status = 'pending_review' → Check: currentUser.id = reviewerId hoặc admin
    ├─ Nếu status = 'in_review'      → Check: currentUser.id = approverId hoặc admin
    ├─ WRITE: status='rejected', rejectionReason=reason
    ├─ WRITE: SubmissionLog (note=reason)
    └─ EMAIL: Gửi thông báo kèm lý do → submitter
```

### 6.4 Upload File

> **Storage backend:** Cloudflare R2, bucket `hvdocspro`.
> Object key prefix: `dev/` hoặc `prod/` tuỳ `R2_ENV_PREFIX` trong `.env`.

```
POST /api/upload
    Content-Type: multipart/form-data
    Fields: file (binary), context: "attachment" | "signed_contract" | "content_image", submissionId?
    ├─ Validate: size ≤ 20MB
    ├─ Validate: extension ∈ {pdf, doc, docx, xls, xlsx, jpg, jpeg, png, gif}
    ├─ Tạo storageKey theo context:
    │   ├─ "attachment"      → {env}/submissions/{submissionId}/attachments/{uuid}.{ext}
    │   ├─ "signed_contract" → {env}/submissions/{submissionId}/contracts/{uuid}.{ext}
    │   └─ "content_image"   → {env}/submissions/{submissionId}/content/{uuid}.{ext}
    ├─ Upload lên Cloudflare R2 (AWS S3-compatible SDK)
    ├─ WRITE: INSERT Attachment { storageKey, name, fileType, mimeType, sizeBytes, uploadedBy }
    └─ Response: { id, name, storageKey, publicUrl, mimeType, sizeBytes }
       publicUrl = R2_PUBLIC_URL + "/" + storageKey

POST /api/upload/avatar
    Content-Type: multipart/form-data
    Field: file (binary)
    Auth: tất cả role (chỉ đổi avatar của chính mình)
    ├─ Validate: size ≤ 5MB, extension ∈ {jpg, jpeg, png, webp}
    ├─ Tạo key: {env}/user/{currentUserId}/profile-picture/{uuid}.{ext}
    ├─ Upload lên R2
    ├─ Xoá key cũ trên R2 nếu User.avatarKey đã có
    ├─ WRITE: UPDATE User.avatarKey = newKey
    └─ Response: { avatarKey, publicUrl }

DELETE /api/upload/:id
    ├─ Check: Attachment.uploadedBy = currentUser hoặc admin
    ├─ Xoá object khỏi Cloudflare R2 (theo storageKey)
    └─ WRITE: DELETE Attachment
```

### 6.5 Báo Cáo

```
GET /api/reports/summary
    Query: year (required), month? (1-12, nếu thiếu → cả năm)
    Auth: reviewer, approver, admin
    └─ Response:
       {
         total: number,
         byStatus: { draft, pending_review, in_review, approved, rejected },
         byType: { MS, NT },
         byDepartment: [{ department, total, approved, rejected }],
         byMonth: [{ month, total }],   // 12 phần tử nếu query cả năm
         approvalRate: number           // phần trăm
       }

GET /api/reports/expenses
    Query: fromDate, toDate, department?, costCode?, supplier?, page, limit
    Auth: approver, admin
    └─ Response:
       {
         totalExVat: number,
         totalIncVat: number,
         byDepartment: [...],
         byCostCode: [...],
         bySupplier: [...],
         details: [Submission + ExpenseLine]
       }

GET /api/reports/contracts
    Query: q?, contractStatus? (expiring_soon | expired), contractEndDateFrom?, contractEndDateTo?,
           page(default:1), limit(default:20)
    Auth: reviewer, approver, admin
    Scope: data scope §3.3; chỉ trả về type=NT, status ≠ 'draft'
    └─ Response:
       {
         summary: { total, expiringSoon, expired },
         data: Submission[],   // gồm contractStartDate, contractEndDate, supplier, signedContract
         total, page, totalPages
       }
```

> **Tính "Còn lại":** Tính phía frontend — `DATEDIFF(contractEndDate, today)`. Âm = đã hết hạn.

### 6.6 Admin — User Management

#### S11 — Form chỉnh sửa người dùng (trường Trạng thái)

Form edit user (S11) bổ sung trường:

| Trường | Loại control | Giá trị |
|--------|-------------|---------|
| **Trạng thái** | Dropdown | `Hoạt động` (isActive=true) / `Ngưng hoạt động` (isActive=false) |

- Mặc định khi tạo mới: `Hoạt động`.
- Khi admin lưu với trạng thái `Ngưng hoạt động`: server revoke toàn bộ refresh token của user → user bị logout tại lần refresh tiếp theo và không thể đăng nhập lại cho đến khi được kích hoạt lại.
- Danh sách user (S11) hiển thị badge trạng thái (`Hoạt động` / `Ngưng hoạt động`) trên từng dòng.

```
GET    /api/admin/users          → Danh sách users (có filter, phân trang)
POST   /api/admin/users          → Tạo user mới (isFirstLogin=true, password tạm)
PUT    /api/admin/users/:id      → Cập nhật thông tin, roles (array, ≥ 1 phần tử), isActive
                                   Khi isActive đổi → false: WRITE revoke tất cả RefreshToken của user đó
                                   (session hiện tại tự hết hiệu lực tại lần refresh tiếp theo → E002)
DELETE /api/admin/users/:id      → Soft delete (isDeleted=true)
POST   /api/admin/users/:id/reset-password → Reset về mật khẩu tạm, isFirstLogin=true

GET    /api/admin/departments        → Danh sách bộ phận
POST   /api/admin/departments        → Tạo bộ phận mới
PUT    /api/admin/departments/:id    → Cập nhật
DELETE /api/admin/departments/:id    → Soft delete

GET    /api/admin/cost-codes         → Danh sách mã phí (filter theo department)
POST   /api/admin/cost-codes         → Tạo mã phí mới
PUT    /api/admin/cost-codes/:id     → Cập nhật
DELETE /api/admin/cost-codes/:id     → Soft delete

GET    /api/admin/approval-config              → Lấy cấu hình theo bộ phận
PUT    /api/admin/approval-config/:departmentId → Cập nhật người thẩm định / phê duyệt

GET    /api/admin/submission-statuses          → Danh sách 5 trạng thái (code, label, color)
PUT    /api/admin/submission-statuses/:code    → Cập nhật label và color; không cho đổi code
```

### 6.7 Hệ Thống — Email Templates

```
GET /api/system/email-templates
    Auth: admin
    └─ Response: danh sách tất cả template [{ id, eventId, subject, body, variables[] }]

GET /api/system/email-templates/:eventId
    Auth: admin
    └─ Response: nội dung template theo sự kiện (vd: E001, E002...)

PUT /api/system/email-templates/:eventId
    Auth: admin
    Body: { subject: string, body: string }
    ├─ Validate: subject không rỗng, body không rỗng
    ├─ Giữ nguyên các biến động {code}, {title}, {reviewer.fullName}... không được xoá
    └─ Response: template đã cập nhật
```

> **Biến động trong template:** Mỗi template có danh sách biến cố định (vd: `{code}`, `{title}`, `{submitter.fullName}`, `{reason}`...). Server validate các biến bắt buộc vẫn còn trong body trước khi lưu.

```
GET /api/system/logs/emails
    Auth: admin
    Query: eventId?, recipientEmail?, status?, fromDate?, toDate?, page, limit
    └─ Response: { data: EmailLog[], total, page, totalPages }
       EmailLog: { id, eventId, recipient, subject, status, sentAt, errorMessage? }
```

> **Trường `status`:** `sent` (gửi thành công) | `failed` (gửi thất bại, có `errorMessage`). Log chỉ đọc — không cho sửa hay xoá.

### 6.8 Hệ Thống — Notification Channels

Cấu hình áp dụng **toàn hệ thống**, chỉ cho sự kiện cần duyệt (E001, E002). Các kênh có thể bật đồng thời — khi trigger, server gửi song song tất cả kênh đang `enabled`.

```
GET /api/system/notification-channels
    Auth: admin
    └─ Response: NotificationChannel[] (1 phần tử mỗi loại)

PUT /api/system/notification-channels/:type
    Auth: admin
    Param type: "email" | "google_chat" | "custom_webhook"
    Body: { isEnabled: boolean, webhookUrl?: string }
    ├─ webhookUrl: bắt buộc khi type ∈ ["google_chat", "custom_webhook"] và isEnabled=true
    ├─ Validate: webhookUrl là URL hợp lệ nếu có
    └─ Response: NotificationChannel đã cập nhật

POST /api/system/notification-channels/:type/test
    Auth: admin
    └─ Gửi tin thử đến kênh; Response: { success, error? }

GET /api/system/notification-channels/webhook-templates
    Auth: admin
    └─ Response: WebhookMessageTemplate[] (1 phần tử mỗi eventId)

PUT /api/system/notification-channels/webhook-templates/:eventId
    Auth: admin
    Param eventId: "E001" | "E002"
    Body: { messageTemplate: string }
    ├─ Validate: không rỗng; các biến dùng phải nằm trong danh sách biến hợp lệ
    └─ Response: WebhookMessageTemplate đã cập nhật
```

#### Entity: NotificationChannel

| Field        | Type         | Mô tả |
|--------------|--------------|-------|
| `type`       | VARCHAR(20)  | `"email"` \| `"google_chat"` \| `"custom_webhook"` — PK |
| `isEnabled`  | BOOLEAN      | Mặc định: `email=true`, còn lại `false` |
| `webhookUrl` | VARCHAR(500) | Nullable; bắt buộc khi type ≠ `email` và `isEnabled=true` |
| `updatedAt`  | TIMESTAMPTZ  | Auto-update |

#### Entity: WebhookMessageTemplate

| Field             | Type          | Mô tả |
|-------------------|---------------|-------|
| `eventId`         | VARCHAR(10)   | `"E001"` \| `"E002"` — PK |
| `messageTemplate` | NVARCHAR(500) | Chuỗi text có biến động; dùng chung cho tất cả webhook channel |
| `updatedAt`       | TIMESTAMPTZ   | Auto-update |

**Biến động hợp lệ trong template:**

| Biến | Giá trị |
|------|---------|
| `{code}` | Mã tờ trình (vd: MS0012) |
| `{title}` | Tiêu đề tờ trình |
| `{submitter}` | Họ tên người trình |
| `{recipient}` | Họ tên người nhận thông báo |
| `{link}` | URL trực tiếp đến tờ trình |

**Giá trị mặc định:**
- E001: `Tờ trình {code} "{title}" đang chờ thẩm định. Người trình: {submitter}. Xem tại: {link}`
- E002: `Tờ trình {code} "{title}" đang chờ phê duyệt. Người trình: {submitter}. Xem tại: {link}`

#### Payload gửi đến webhook (Google Chat & Custom)

Server điền biến vào `messageTemplate` rồi đưa vào payload:

```json
{
  "event": "E001",
  "message": "Tờ trình MS0012 \"Mua laptop bổ sung\" đang chờ thẩm định. Người trình: Nguyễn Thế Hùng. Xem tại: https://...",
  "submissionCode": "MS0012",
  "submissionUrl": "https://app.hv.vn/submissions/abc123",
  "triggeredAt": "2026-05-13T08:00:00Z"
}
```

> Google Chat: server map `message` → `{ "text": "<message>" }` trước khi POST đến webhook URL.

---

## 7. MOCKUP / WIREFRAME

### S01 — Trang Đăng Nhập

```
┌──────────────────────────────────┐
│            [Logo HV]             │
│         "Xin chào!"              │
│   "Đăng nhập vào hệ thống HV"   │
│                                  │
│  Username                        │
│  ┌────────────────────────────┐  │
│  │ Nhập username...           │  │
│  └────────────────────────────┘  │
│  Password                        │
│  ┌────────────────────────────┐  │
│  │ Nhập mật khẩu...    [👁]   │  │
│  └────────────────────────────┘  │
│                                  │
│  [         Đăng nhập           ] │
│  Quên mật khẩu?                  │
│                                  │
│  ─────────── hoặc ───────────    │
│                                  │
│  [ G  Đăng nhập bằng Google   ] │
└──────────────────────────────────┘
```

### S05 — Danh Sách Tờ Trình

```
┌───────────────────────────────────────────────────────────────────┐
│ Sidebar │  Tờ trình                             [+ Tạo tờ trình]  │
│         │  ┌──────────┬─────────────┬────────────────────────┐    │
│         │  │ Tổng: 10 │ Chờ thẩm: 3 │ Đã phê duyệt: 4       │    │
│         │  └──────────┴─────────────┴────────────────────────┘    │
│         │                                                          │
│         │  [MS Mua sắm] [NT Nguyên tắc]   [🔍 Tìm...] [Lọc ▼]   │
│         │  ┌──────────────────────────────────────────────────┐   │
│         │  │ # │ Code   │ BP  │ Ngày  │ Tiêu đề │ Số tiền │...│   │
│         │  ├──────────────────────────────────────────────────┤   │
│         │  │ 1 │ MS0001 │ IT  │ 01/04 │ Mua...  │ 50tr    │...│   │
│         │  │ 2 │ MS0002 │ KT  │ 01/04 │ Mua...  │ 25tr    │...│   │
│         │  └──────────────────────────────────────────────────┘   │
│         │  [← 1 2 3 ... →]                         20 / trang    │
└───────────────────────────────────────────────────────────────────┘
```

#### Thẻ thống kê (Summary Cards)

Hiển thị 4 thẻ nằm ngang ngay dưới tiêu đề trang, phía trên tab MS / NT:

| Thẻ | Nhãn | Giá trị | Điều kiện đếm |
|-----|------|---------|---------------|
| 1 | **Tổng số** | Tổng tờ trình theo scope role hiện tại | Tất cả trạng thái (trừ đã xoá) |
| 2 | **Chờ thẩm định** | Số tờ trình đang chờ người thẩm định | `status = 'pending_review'` |
| 3 | **Chờ phê duyệt** | Số tờ trình đang chờ người phê duyệt | `status = 'in_review'` |
| 4 | **Đã phê duyệt** | Số tờ trình đã được phê duyệt | `status = 'approved'` |

> Số đếm áp dụng cùng data scope theo role (§3.3): staff thấy bộ phận mình + tờ trình do mình tạo, reviewer/approver/admin thấy tất cả.
> Số đếm **không** bị lọc theo tab MS / NT đang chọn — luôn tính trên toàn bộ loại tờ trình.

#### Bảng danh sách — Cột hiển thị

| STT | Tên cột (tiêu đề in hoa) | Dữ liệu nguồn | Ghi chú hiển thị |
|-----|--------------------------|---------------|------------------|
| 1 | **#** | Số thứ tự hàng trong trang hiện tại | — |
| 2 | **MÃ TỜ TRÌNH** | `submission.code` | Link → `/submissions/{id}` |
| 3 | **BỘ PHẬN** | `submission.department.name` | — |
| 4 | **NGÀY TRÌNH** | `submission.submittedDate` | Định dạng `DD/MM/YYYY` |
| 5 | **VỀ VIỆC** | `submission.title` | Cắt ngắn nếu quá dài, tooltip full text |
| 6 | **NHÀ CUNG CẤP** | `submission.supplier` | Trống nếu không có, cắt ngắn nếu quá dài |
| 7 | **SỐ TIỀN** | Tổng `amountIncVat` của các `ExpenseLine` | Định dạng số tiền VNĐ (`0 ₫` nếu chưa có) |
| 8 | **HĐ ĐÃ KÝ** | `submission.signedContract` | Hiện `—` nếu chưa có; hiện 📎 + tên file nếu đã upload; click → mở tab mới. Chỉ có giá trị ở tab NT |
| 9 | **THẨM ĐỊNH** | `submission.reviewer.fullName` | **Màu xanh** (= màu trạng thái `approved`) khi tờ trình đã được thẩm định (`status ∈ ['in_review', 'approved']`); màu mặc định khi chưa |
| 10 | **PHÊ DUYỆT** | `submission.approver.fullName` | **Màu xanh** (= màu trạng thái `approved`) khi tờ trình đã được phê duyệt (`status = 'approved'`); màu mặc định khi chưa |
| 11 | **TRẠNG THÁI** | `submission.status` | Badge tô màu theo danh mục trạng thái (xem §3.2). Kèm badge phụ **"Cần thẩm định"** hoặc **"Cần phê duyệt"** (xem quy tắc bên dưới) |

> **Quy tắc màu cột THẨM ĐỊNH / PHÊ DUYỆT:** dùng cùng mã màu với badge trạng thái `approved` — không phải màu badge của trạng thái tờ trình hiện tại.

#### Badge "Cần thẩm định / Cần phê duyệt" (action-required indicator)

Hiển thị badge phụ nhỏ ngay bên cạnh badge TRẠNG THÁI để báo cho người dùng biết tờ trình đang **chờ hành động của chính họ**:

| Điều kiện | Badge hiển thị |
|-----------|----------------|
| `currentUser.id === submission.reviewerId` **AND** `status = 'pending_review'` | `Cần thẩm định` (màu vàng / warning) |
| `currentUser.id === submission.approverId` **AND** `status = 'in_review'` | `Cần phê duyệt` (màu cam / accent) |

- Badge chỉ hiển thị với đúng người được gán — người khác xem cùng dòng đó không thấy badge.
- `admin` không nhận badge này (admin không phải người duyệt trực tiếp).
- Logic tính toán phía **frontend** dựa vào `currentUser.id` từ auth store và dữ liệu `reviewerId` / `approverId` trả về trong API danh sách.

#### Hành động trên từng dòng (row actions)

Mỗi dòng tờ trình có menu hành động (nút `⋮` hoặc context menu cuối dòng), bao gồm:

| Hành động | Điều kiện hiển thị |
|-----------|-------------------|
| Xem chi tiết | Luôn hiển thị |
| **Tạo lại tờ trình** | Luôn hiển thị (mọi trạng thái, mọi role có quyền xem dòng đó) |
| **Xóa** | `status = 'draft'` AND `currentUser.id === submission.submitterId` |

> Nút **Xóa** (cả S05 lẫn S07) chỉ hiện với chính người tạo tờ trình, chỉ khi còn ở trạng thái `draft`. Bấm → [M02 Xác nhận xoá]. API vẫn enforce thêm quyền `admin` phía server.

### S07 — Chi Tiết Tờ Trình

Màn hình hiển thị **đầy đủ tất cả thông tin** như khi tạo mới, tương ứng theo loại tờ trình (MS / NT).

#### S07-MS — Tờ Trình Mua Sắm

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Quay lại]  MS0001  [Badge: Đã phê duyệt]   [Sửa] [Xóa] [Tạo lại tờ trình] [In PDF]   │
│ ([Xóa] chỉ hiện khi status='draft' AND currentUser = submitter)                  │
│ IT - Mua máy tính bổ sung tháng 04/26                           │
│                                                                 │
│ ┌─ Thông tin chung ─────────────────────────────────────────┐   │
│ │ Ngày trình:    01/04/2026    │  Code: MS0001              │   │
│ │ Bộ phận:       IT            │  Loại: Mua sắm (MS)        │   │
│ │ Người trình:   Nguyễn Thế Hùng                            │   │
│ │ Người thẩm định: Trương Văn Tân                           │   │
│ │ Người phê duyệt: Dương Văn Hồng                          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Nội dung ────────────────────────────────────────────────┐   │
│ │ KG BLĐ xin phê duyệt, ...                                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Danh sách chi phí ───────────────────────────────────────┐   │
│ │ # │ Code   │ Tên  │ VAT% │ ExVAT  │ IncVAT │ NCC    │    │   │
│ │   │        │      │      │        │        │ Mục đích│    │   │
│ │   │        │      │      │        │        │ Người dùng│  │   │
│ │ 1 │ IT0001 │ TSCĐ │  10% │ 45.5tr │  50tr  │ Cty ABC│    │   │
│ │   │        │      │      │        │        │ Văn phòng│  │   │
│ │   │        │      │      │        │        │ NV Hùng │   │   │
│ │                             Tổng: 50,000,000 đ            │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Quy trình duyệt ─────────────────────────────────────────┐   │
│ │ ● Tạo         Nguyễn Thế Hùng    01/04/2026 08:00         │   │
│ │ ● Gửi         Nguyễn Thế Hùng    01/04/2026 08:30         │   │
│ │ ● Thẩm định   Trương Văn Tân  ✅ 01/04/2026 09:30         │   │
│ │ ● Phê duyệt   Dương Văn Hồng  ✅ 01/04/2026 14:00         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ File đính kèm ───────────────────────────────────────────┐   │
│ │ 📎 Báo giá máy tính ABC.pdf                [Tải xuống]    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Gửi tờ trình]  [Thẩm định]  [Phê duyệt]  [Từ chối]          │
│  (hiển thị tuỳ role + trạng thái)                               │
└─────────────────────────────────────────────────────────────────┘
```

**Cột bảng chi phí (MS):** `#` | `Code` | `Tên` | `VAT%` | `ExVAT` | `IncVAT` | `NCC (Nhà cung cấp)` | `Mua cho` (`purchasedFor`) | `Mục đích` (`purpose`) | `Người dùng` (`usedBy`). Các cột tuỳ chọn chỉ hiển thị nếu có giá trị.

#### S07-NT — Tờ Trình Nguyên Tắc

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Quay lại]  NT0003  [Badge: Chờ thẩm định]   [Sửa] [Xóa] [Tạo lại tờ trình] [In PDF]  │
│ ([Xóa] chỉ hiện khi status='draft' AND currentUser = submitter)                   │
│ Marketing - Hợp đồng dịch vụ thiết kế 2026                      │
│                                                                 │
│ ┌─ Thông tin chung ─────────────────────────────────────────┐   │
│ │ Ngày trình:    05/04/2026    │  Code: NT0003              │   │
│ │ Bộ phận:       Marketing     │  Loại: Nguyên tắc (NT)     │   │
│ │ Người trình:   Lê Thị Mai                                  │   │
│ │ Người thẩm định: Trương Văn Tân                           │   │
│ │ Người phê duyệt: Dương Văn Hồng                          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Nội dung ────────────────────────────────────────────────┐   │
│ │ KG BLĐ xin phê duyệt hợp đồng thiết kế, ...              │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Thông tin hợp đồng ──────────────────────────────────────┐   │
│ │ Nhà cung cấp:  Công ty Thiết Kế XYZ                       │   │
│ │ Từ ngày:       01/05/2026   │  Đến ngày: 31/12/2026       │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Hợp đồng đã ký kết ──────────────────────────── [Tải lên] ┐ │
│ │ 📎 HopDong_XYZ.pdf   (click → mở tab mới)                  │ │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Quy trình duyệt ─────────────────────────────────────────┐   │
│ │ ● Tạo   Lê Thị Mai    05/04/2026 09:00                    │   │
│ │ ● Gửi   Lê Thị Mai    05/04/2026 09:15                    │   │
│ │ ○ Thẩm định  (chờ)                                        │   │
│ │ ○ Phê duyệt  (chờ)                                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ File đính kèm ───────────────────────────────────────────┐   │
│ │ 📎 Bảng mô tả dịch vụ.docx                [Tải xuống]    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Gửi tờ trình]  [Thẩm định]  [Phê duyệt]  [Từ chối]          │
│  (hiển thị tuỳ role + trạng thái)                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Lý do từ chối (trạng thái `rejected`)

Khi `status = rejected`, hiển thị thêm section ngay dưới "Thông tin chung":

```
│ ┌─ Lý do từ chối ───────────────────────────────────────────┐   │
│ │ ⚠ Ngân sách Q2 đã vượt hạn mức, đề nghị trình lại Q3.    │   │
│ └───────────────────────────────────────────────────────────┘   │
```

### S09 — Báo Cáo Tổng Hợp

```
┌─────────────────────────────────────────────────────────────────┐
│ Báo cáo hoạt động                  [Year: 2026 ▼] [Month: 4 ▼]  │
│                                                                 │
│ ┌──────────┬───────────┬────────────┬────────────┬───────────┐  │
│ │ Tổng: 10 │ Chờ TD: 3 │ Chờ PD: 2  │ Approved:4 │ Rejected:1│  │
│ └──────────┴───────────┴────────────┴────────────┴───────────┘  │
│                                                                 │
│ ┌─ Theo bộ phận ──────────────┐  ┌─ Theo tháng ─────────────┐  │
│ │ IT        ████████ 4        │  │ T1 ██ 2                  │  │
│ │ Kế toán   █████    3        │  │ T2 █  1                  │  │
│ │ Marketing ███      2        │  │ T3 ████ 4                │  │
│ │ Mua hàng  █        1        │  │ T4 ████████ 8            │  │
│ └────────────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### S17 — Email Log

```
┌─────────────────────────────────────────────────────────────────────┐
│ Email Log                                                           │
│                                                                     │
│ [🔍 Tìm người nhận / tiêu đề...]  [Loại ▼]  [Trạng thái ▼]  [Lọc]│
│                                                                     │
│ ┌──────────────────────────────────────────────────────────────┐    │
│ │ Người nhận      │ Tiêu đề          │ Loại  │ TT    │ Thời gian   │ Ghi chú lỗi │ │
│ ├──────────────────────────────────────────────────────────────┤    │
│ │ tanvt@hv.vn     │ Tờ trình MS0012… │ E001  │ ✅    │ 05/05 08:31 │             │ [Xem] │
│ │ hongdv@hv.vn    │ Tờ trình MS0011… │ E002  │ ✅    │ 05/05 09:10 │             │ [Xem] │
│ │ hungnt@hv.vn    │ Từ chối MS0010… │ E004  │ ❌    │ 04/05 14:22 │ SMTP timeout│ [Xem] │
│ └──────────────────────────────────────────────────────────────┘    │
│ [← 1 2 3 ... →]                                      20 / trang    │
└─────────────────────────────────────────────────────────────────────┘
```

**Nút "Xem":** Mở dialog hiển thị toàn bộ nội dung email đã gửi (subject + body đã render), chỉ đọc.

**Cột Loại:** Mã sự kiện (E001–E007) — hiển thị kèm tooltip tên sự kiện.

**Cột Trạng thái:** ✅ `sent` (xanh) | ❌ `failed` (đỏ).

**Cột Ghi chú lỗi:** Chỉ hiển thị khi `status = failed`; chứa message lỗi SMTP / provider.

### S19 — Báo Cáo Hợp Đồng

```
┌──────────────────────────────────────────────────────────────────────┐
│ Báo cáo Hợp đồng                                      [🖨 In / PDF]  │
│                                                                      │
│ ┌────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│ │ Tổng: 24       │  │ Sắp hết hạn (≤30ngày)│  │ Đã hết hạn: 5    │  │
│ │ hợp đồng       │  │ 6 hợp đồng           │  │ hợp đồng         │  │
│ └────────────────┘  └─────────────────────┘  └───────────────────┘  │
│                                                                      │
│ [🔍 Mã TT / NCC / nội dung...]  [Tình trạng ▼]  [Ngày HH: Từ→Đến]  │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐  │
│ │ # │ Mã TT  │ BP  │ Về việc    │ NCC        │ Bắt đầu │ Hết hạn │ Còn lại  │ HĐ ký │ TT   │
│ ├─────────────────────────────────────────────────────────────────┤  │
│ │ 1 │ NT0001 │ IT  │ Dịch vụ…  │ Cty ABC    │ 01/01   │ 15/05   │ 8 ngày   │  📎   │ [badge] │
│ │ 2 │ NT0002 │ MKT │ Hợp đồng… │ Cty XYZ    │ 01/03   │ 31/03   │ Đã hết hạn│ —    │ [badge] │
│ └─────────────────────────────────────────────────────────────────┘  │
│ [← 1 2 3 ... →]                                        20 / trang   │
└──────────────────────────────────────────────────────────────────────┘
```

#### Cột danh sách (S19)

| Cột | Dữ liệu | Ghi chú |
|-----|---------|---------|
| **#** | Số thứ tự | — |
| **MÃ TT** | `submission.code` | Link → `/submissions/{id}` |
| **BỘ PHẬN** | `submission.department.name` | — |
| **VỀ VIỆC** | `submission.title` | Cắt ngắn, tooltip full text |
| **NHÀ CUNG CẤP** | `submission.supplier` | — |
| **NGÀY BẮT ĐẦU** | `submission.contractStartDate` | `DD/MM/YYYY` |
| **NGÀY HẾT HẠN** | `submission.contractEndDate` | `DD/MM/YYYY` |
| **CÒN LẠI** | Tính frontend: `DATEDIFF(contractEndDate, today)` | Dương = "X ngày"; 0 hoặc âm = badge đỏ "Đã hết hạn X ngày" |
| **HĐ ĐÃ KÝ** | `submission.signedContract` | `—` nếu chưa; 📎 + tên file nếu có; click → mở tab mới |
| **TRẠNG THÁI** | `submission.status` | Badge màu theo §3.2 |

#### Filter (S19)

| Trường | Control | Tham số API |
|--------|---------|-------------|
| Tìm kiếm | Text (full-text: code, supplier, title) | `q` |
| Tình trạng hợp đồng | Dropdown: Tất cả / Sắp hết hạn / Đã hết hạn | `contractStatus` |
| Ngày hết hạn | Date range (Từ – Đến) | `contractEndDateFrom`, `contractEndDateTo` |

#### Nút "In / Xuất PDF"

- Kích hoạt `window.print()` — in toàn bộ bảng đang hiển thị trên màn hình.
- Trang in ẩn sidebar, header, filter; chỉ giữ summary cards + bảng danh sách.

### S20 — Cấu Hình Kênh Thông Báo

```
┌──────────────────────────────────────────────────────────────────┐
│ Kênh thông báo cần duyệt                                         │
│ (Áp dụng cho: E001 — Cần thẩm định, E002 — Cần phê duyệt)       │
│                                                                  │
│ ┌─ Email ──────────────────────────────────────── [Bật ●] ─────┐ │
│ │ Dùng cấu hình SMTP hiện có. Không cần cấu hình thêm.        │ │
│ │                                              [Gửi thử]      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ Google Chat Webhook ─────────────────────── [Bật ○] ────────┐ │
│ │ Webhook URL                                                  │ │
│ │ [https://chat.googleapis.com/v1/spaces/...         ]        │ │
│ │                                              [Gửi thử]      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ Custom Webhook ──────────────────────────── [Bật ○] ────────┐ │
│ │ Webhook URL                                                  │ │
│ │ [https://hooks.example.com/notify              ]             │ │
│ │                                              [Gửi thử]      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ Nội dung tin nhắn (dùng chung cho tất cả webhook) ──────────┐ │
│ │ Biến hợp lệ: {code} {title} {submitter} {recipient} {link}  │ │
│ │                                                              │ │
│ │ E001 — Cần thẩm định                                         │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ Tờ trình {code} "{title}" đang chờ thẩm định.           │ │ │
│ │ │ Người trình: {submitter}. Xem tại: {link}               │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ │                                                              │ │
│ │ E002 — Cần phê duyệt                                         │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ Tờ trình {code} "{title}" đang chờ phê duyệt.           │ │ │
│ │ │ Người trình: {submitter}. Xem tại: {link}               │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                                           [Lưu cấu hình]        │
└──────────────────────────────────────────────────────────────────┘
```

- **Bật/Tắt** toggle mỗi kênh độc lập; có thể bật nhiều kênh cùng lúc.
- **Webhook URL**: bắt buộc nhập trước khi bật kênh Google Chat / Custom Webhook.
- **Gửi thử**: POST payload mẫu đến kênh đó, hiển thị kết quả `✅ Thành công` hoặc `❌ Lỗi: <message>` inline.
- Kênh `email` không có ô nhập URL (dùng SMTP config sẵn có) và không dùng webhook template — nội dung email cấu hình riêng tại S16.
- **Nội dung tin nhắn**: dùng chung cho tất cả webhook channel (Google Chat + Custom). Mỗi sự kiện (E001/E002) có 1 textarea riêng; hỗ trợ biến động; server validate biến trước khi lưu.

---

## 8. REQUIREMENT BACKLOG

| ID   | Tên Tính Năng                          | Mức Độ   | Trạng Thái  | Ghi Chú                                                        |
|------|----------------------------------------|----------|-------------|----------------------------------------------------------------|
| F020 | Đăng nhập bằng Google (Firebase)      | High     | Planned     | Chỉ tài khoản đã tồn tại + `isActive=true`; bỏ qua isFirstLogin; dùng Firebase ID Token verify phía server |
| F001 | Xác thực JWT + Refresh Token           | Critical | Planned     | Thay thế "chọn user" mock; bắt buộc cho production            |
| F002 | Đổi mật khẩu lần đầu (isFirstLogin)   | Critical | Planned     | Chặn truy cập đến khi hoàn thành                              |
| F003 | Quên mật khẩu qua email               | High     | Planned     | Reset link TTL 15 phút, 1 lần dùng                            |
| F004 | Upload file thật (Cloudflare R2)      | High     | In Progress | Bucket `hvdocspro`; path convention `{env}/submissions/{id}/...`; validate size + type |
| F019 | Đổi ảnh đại diện (avatar upload)     | Medium   | Planned     | `POST /api/upload/avatar`; path `{env}/user/{id}/profile-picture/{uuid}.{ext}`; xoá ảnh cũ trên R2 |
| F005 | Trang báo cáo đầy đủ (S09, S10)       | High     | Planned     | Hiện là stub; cần API + biểu đồ                               |
| F006 | Quản trị admin (S11–S14)              | High     | Planned     | CRUD user, bộ phận, mã phí, cấu hình phân quyền              |
| F007 | Lịch sử thay đổi tờ trình (timeline) | High     | Planned     | Bảng SubmissionLog; hiển thị ở S07                            |
| F008 | Sửa và gửi lại sau từ chối           | High     | Planned     | Cho phép edit rejected → submit lại → pending_review          |
| F009 | Phân trang danh sách (S05)            | High     | Planned     | Hiện render tất cả; cần khi data thật                         |
| F010 | Email thật (SMTP / SendGrid)          | High     | Planned     | Thay thế toast mô phỏng; gửi email tới người liên quan        |
| F011 | Export PDF tờ trình                   | Medium   | Planned     | In tờ trình theo template; đã có print stylesheet cơ bản      |
| F012 | Export báo cáo Excel                  | Medium   | Planned     | Chi phí theo bộ phận / mã phí                                 |
| F013 | Nhúng ảnh vào nội dung tờ trình      | Medium   | In Progress | Field content đã có; cần editor hỗ trợ upload + preview       |
| F014 | Tự động tính VAT (amountExVat → amountIncVat) | Medium | Planned | Tỷ lệ VAT 10% mặc định; có thể cấu hình               |
| F015 | Hồ sơ cá nhân (S15)                  | Medium   | Planned     | Xem và sửa thông tin, đổi mật khẩu                            |
| F016 | Dark mode                             | Low      | Done        | Đã tích hợp next-themes trong mockup                          |
| F017 | Trang giới thiệu hệ thống (S07)      | Low      | Done        | Đã có trong mockup                                            |
| F018 | Thông báo in-app real-time (WebSocket) | Low    | Planned     | Thay thế toast sau mỗi action; push khi có tờ trình mới cần duyệt |

---

## 9. ERROR HANDLING

### Format lỗi chuẩn (production)

```json
{
  "success": false,
  "error": {
    "code": "E001",
    "message": "Thông tin đăng nhập không đúng",
    "details": null
  }
}
```

### Bảng mã lỗi

| Mã Lỗi | HTTP | Tình Huống                                           | Thông Báo Hiển Thị (user-facing)                      |
|--------|------|------------------------------------------------------|-------------------------------------------------------|
| E001   | 401  | Sai username hoặc password                           | "Thông tin đăng nhập không đúng"                      |
| E002   | 403  | Tài khoản bị vô hiệu hóa (isActive=false)           | "Tài khoản đã bị khóa. Liên hệ quản trị viên."       |
| E003   | 403  | Không có quyền thực hiện thao tác                   | "Bạn không có quyền thực hiện thao tác này."          |
| E004   | 404  | Tờ trình không tồn tại hoặc đã bị xoá              | "Không tìm thấy tờ trình."                            |
| E005   | 422  | Dữ liệu không hợp lệ (thiếu field, sai format)     | Hiển thị lỗi inline trên từng field                   |
| E006   | 409  | Chuyển trạng thái không hợp lệ                      | "Trạng thái tờ trình không cho phép thao tác này."    |
| E007   | 409  | Không đúng người được phân công duyệt               | "Bạn không được phân công xử lý tờ trình này."        |
| E008   | 401  | Access token hết hạn                                 | (Silent refresh — không hiển thị cho user)            |
| E009   | 401  | Refresh token hết hạn hoặc bị thu hồi              | "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." |
| E010   | 413  | File upload vượt quá 20MB                           | "File quá lớn. Kích thước tối đa cho phép là 20MB."   |
| E011   | 415  | File upload sai định dạng                           | "Định dạng file không được hỗ trợ."                   |
| E012   | 422  | Lý do từ chối bị bỏ trống                          | "Vui lòng nhập lý do từ chối."                        |
| E013   | 422  | Tờ trình MS không có dòng chi phí nào              | "Phải có ít nhất một dòng chi phí."                   |
| E014   | 403  | isFirstLogin = true, truy cập API khác (chỉ login username/password) | "Bạn cần đổi mật khẩu trước khi tiếp tục." |
| E015   | 404  | Email Google chưa được đăng ký trong hệ thống       | "Email này chưa được đăng ký trong hệ thống."         |
| E500   | 500  | Lỗi server không xác định                           | "Đã xảy ra lỗi. Vui lòng thử lại sau."               |

### Quy tắc bảo mật error handling

- **Không** trả về stack trace, SQL error, hoặc tên file nội bộ trong response production.
- **Không** phân biệt "sai username" vs "sai password" (tránh user enumeration).
- **Không** reveal thông tin user tồn tại trong endpoint quên mật khẩu.
- Log chi tiết lỗi phía server, hiển thị thông báo chung cho user.

---

## 10. NOTIFICATION CATALOG

### 10.1 In-App Toast (phiên bản hiện tại)

Toast tự đóng sau 4 giây, góc dưới phải màn hình.

| ID   | Trigger                              | Nội Dung                                                                           | Loại      |
|------|--------------------------------------|------------------------------------------------------------------------------------|-----------|
| N001 | Gửi tờ trình thành công             | `📧 Email gửi đến {reviewer.fullName} để thẩm định tờ trình {code}`               | `info`    |
| N002 | Thẩm định xong                       | `📧 Email gửi đến {approver.fullName} để phê duyệt tờ trình {code}`               | `info`    |
| N003 | Phê duyệt thành công                 | `📧 Email thông báo tờ trình {code} đã phê duyệt gửi đến {submitter.fullName}`    | `success` |
| N004 | Từ chối tờ trình                     | `📧 Email thông báo từ chối tờ trình {code} gửi đến {submitter.fullName}`         | `warning` |
| N005 | Tạo tờ trình thành công             | `Tờ trình {code} đã được lưu nháp thành công.`                                     | `success` |
| N006 | Upload file thành công              | `File "{name}" đã được đính kèm.`                                                  | `success` |

### 10.2 Email Thật (production)

| ID   | Kênh  | Trigger                                 | Người Nhận    | Template / Nội Dung                                               |
|------|-------|-----------------------------------------|---------------|--------------------------------------------------------------------|
| E001 | Kênh được cấu hình (§6.8) | Submit (→ pending_review)  | Reviewer      | Thông báo có tờ trình mới cần thẩm định + link trực tiếp          |
| E002 | Kênh được cấu hình (§6.8) | Review xong (→ in_review)  | Approver      | Thông báo có tờ trình cần phê duyệt + link trực tiếp              |
| E003 | Email | Approve thành công                      | Submitter     | Chúc mừng tờ trình {code} "{title}" đã được phê duyệt             |
| E004 | Email | Reject                                  | Submitter     | Thông báo từ chối + lý do + link để sửa và gửi lại               |
| E005 | Email | Tạo tài khoản mới                       | User mới      | Thông tin đăng nhập tạm, link đổi mật khẩu lần đầu               |
| E006 | Email | Quên mật khẩu                           | User yêu cầu  | Link reset mật khẩu (TTL 15 phút)                                 |
| E007 | Email | Admin reset mật khẩu                   | User được reset | Thông báo mật khẩu đã được reset, link đổi mật khẩu            |

---

## 11. UI GROUPING — SYSTEM MENU

> Menu thay đổi theo role. Tất cả role đều thấy sidebar với các mục phù hợp quyền.

### Menu — staff

- Tờ trình (`/submissions`)

### Menu — reviewer

- Tờ trình (`/submissions`)
- **BÁO CÁO**
  - Báo cáo (`/reports`)
  - Báo cáo HĐ (`/reports/contracts`)

### Menu — approver

- Tờ trình (`/submissions`)
- **BÁO CÁO**
  - Báo cáo (`/reports`)
  - Báo cáo chi phí (`/reports/expenses`)
  - Báo cáo HĐ (`/reports/contracts`)

### Menu — admin

- Tờ trình (`/submissions`)
- **BÁO CÁO**
  - Báo cáo (`/reports`)
  - Báo cáo chi phí (`/reports/expenses`)
  - Báo cáo HĐ (`/reports/contracts`)
- **QUẢN TRỊ**
  - Quản lý người dùng (`/admin/users`)
  - Quản lý bộ phận (`/admin/departments`)
  - Quản lý mã phí (`/admin/cost-codes`)
  - Cấu hình phân quyền duyệt (`/admin/approval-config`)
  - Danh mục trạng thái (`/admin/submission-statuses`)
- **HỆ THỐNG**
  - Cấu hình email template (`/system/email-templates`)
  - Kênh thông báo (`/system/notification-channels`)
  - Email Log (`/system/logs`)

### Sidebar Footer (tất cả role)

- Avatar + Họ tên + Bộ phận + Chức vụ
- Link đến Hồ sơ cá nhân (`/profile`)
- Nút đăng xuất → `POST /api/auth/logout` → redirect `/login`

---

## Phụ Lục A: Danh Sách Người Dùng Mặc Định

| Username   | Full Name           | Department   | Position           | Role       |
|------------|---------------------|--------------|--------------------|------------|
| quynhdt267 | Dương Thuý Quỳnh    | Mua hàng     | Trưởng phòng        | reviewer   |
| tanvt      | Trương Văn Tân      | IT           | Trưởng phòng IT     | reviewer   |
| myadh      | Dương Hà My         | Kế toán      | Kế toán trưởng      | reviewer   |
| nhunght    | Trần Hồng Nhung     | Marketing    | Quản lý MKT         | approver   |
| hongdv     | Dương Văn Hồng      | Ban lãnh đạo | Giám đốc            | approver   |
| vanlth     | Lê Thị Hồng Vân     | Ban lãnh đạo | Phó giám đốc        | approver   |
| hungnt     | Nguyễn Thế Hùng     | IT           | Nhân viên IT        | staff      |
| lienhm     | Hoàng Minh Liên     | Kế toán      | Kế toán viên        | staff      |
| thanhpv    | Phạm Văn Thành      | Marketing    | Nhân viên MKT       | staff      |

> Tất cả user trên cần được seed vào DB khi khởi tạo với `isFirstLogin = true`.

## Phụ Lục B: Danh Mục Mã Phí Mặc Định

| Code   | Name                 | Department |
|--------|----------------------|------------|
| IT0001 | Tài sản cố định      | IT         |
| IT0002 | CP Phần mềm          | IT         |
| IT0003 | CP Sửa chữa thiết bị | IT         |
| KT0001 | Tài sản cố định      | Kế toán    |
| KT0002 | CP Văn phòng phẩm    | Kế toán    |
| CB0005 | CP Marketing         | Marketing  |
| DV0005 | CP Dịch vụ MKT       | Marketing  |
| MH0001 | CP Hàng hoá          | Mua hàng   |
| CL0001 | CP Vận chuyển        | IT         |
| HC0001 | CP Hành chính        | Hành chính |

## Phụ Lục C: Danh Mục Vật Tư Gợi Ý

Giấy A4, Bút bi, Bút xoá, Mực in HP, Băng keo, Kẹp giấy, Phong bì, Hộp đựng tài liệu, Máy tính xách tay, Màn hình máy tính, Chuột máy tính, Bàn phím, USB, Ổ cứng ngoài, Máy in.

## Phụ Lục D: Quyết Định Thiết Kế

> **Lý do dùng BIGINT cho tiền VND:** VND không có số lẻ thập phân; BIGINT tránh lỗi floating-point và đủ cho mọi giá trị thực tế.

> **Lý do lưu costCodeName là snapshot:** Nếu admin đổi tên mã phí, tờ trình cũ phải giữ nguyên tên lúc tạo để đảm bảo tính chính xác kiểm toán.

> **Lý do dùng soft delete:** Yêu cầu audit trail — mọi dữ liệu phải khôi phục được. Không hard delete bất kỳ entity nào.

> **Lý do không để staff thẩm định/phê duyệt:** Nguyên tắc tách biệt nghĩa vụ (separation of duties) — người tạo tờ trình không được tự duyệt tờ trình của mình.

> **Lý do rejectionReason bắt buộc:** Người trình cần biết chính xác lý do để sửa đúng và gửi lại; từ chối không có lý do gây mất thông tin.
