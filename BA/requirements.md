# HV-QLHoSo — Yêu Cầu Hệ Thống

> **Cập nhật:** 2026-04-25
> **Phiên bản:** 2.0.0
> **Ngôn ngữ:** Tiếng Việt
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
| S01 | Đăng nhập          | `/login`           | Public        | Form nhập username + password; nhận JWT access token           |
| S02 | Đổi mật khẩu lần đầu | `/change-password` | Bắt buộc sau login đầu | Hiện nếu `isFirstLogin = true`; bắt buộc đổi trước khi vào hệ thống |
| S03 | Quên mật khẩu      | `/forgot-password` | Public        | Nhập email → nhận link reset qua email                         |
| S04 | Reset mật khẩu     | `/reset-password?token=...` | Public | Nhập mật khẩu mới sau khi click link email                    |

### 2.2 Tờ Trình

| ID  | Tên Màn Hình          | Route                 | Auth        | Mô Tả                                                                          |
|-----|-----------------------|-----------------------|-------------|--------------------------------------------------------------------------------|
| S05 | Danh sách tờ trình    | `/to-trinh`           | Tất cả role | Bảng tổng hợp tờ trình, phân tab MS / NT, thống kê nhanh, tìm kiếm, lọc, phân trang |
| S06 | Tạo tờ trình          | `/to-trinh/tao`       | Tất cả role | Form tạo mới, chọn loại MS hoặc NT                                             |
| S07 | Chi tiết tờ trình     | `/to-trinh/[id]`      | Tất cả role | Xem toàn bộ nội dung, thao tác duyệt/từ chối, lịch sử thay đổi trạng thái    |
| S08 | Sửa tờ trình          | `/to-trinh/[id]/sua`  | Theo rule   | Sửa khi `nhap` hoặc `tu_choi` (chủ sở hữu); sau từ chối cần gửi lại          |

### 2.3 Báo Cáo

| ID  | Tên Màn Hình             | Route             | Auth                   | Mô Tả                                                              |
|-----|--------------------------|-------------------|------------------------|--------------------------------------------------------------------|
| S09 | Báo cáo tổng hợp         | `/bao-cao`        | `tham_dinh`, `phe_duyet`, `admin` | Dashboard thống kê: số lượng theo trạng thái, theo bộ phận, theo tháng |
| S10 | Báo cáo chi tiết chi phí | `/bao-cao/chi-phi`| `phe_duyet`, `admin`   | Tổng chi phí mua sắm theo bộ phận / mã phí / nhà cung cấp / kỳ   |

### 2.4 Quản Trị (Admin)

| ID  | Tên Màn Hình           | Route              | Auth    | Mô Tả                                           |
|-----|------------------------|--------------------|---------|-------------------------------------------------|
| S11 | Quản lý người dùng     | `/admin/users`     | `admin` | CRUD user, gán role, reset mật khẩu             |
| S12 | Quản lý bộ phận        | `/admin/bo-phan`   | `admin` | CRUD bộ phận                                    |
| S13 | Quản lý mã phí         | `/admin/ma-phi`    | `admin` | CRUD danh mục mã phí theo bộ phận               |
| S14 | Cấu hình phân quyền duyệt | `/admin/phan-quyen` | `admin` | Thiết lập người thẩm định / phê duyệt cho từng bộ phận |
| S15 | Hồ sơ cá nhân          | `/profile`         | Tất cả  | Xem và cập nhật thông tin cá nhân, đổi mật khẩu |

### 2.5 Modals / Dialogs

| ID  | Tên Dialog              | Trigger                                       | Mô Tả                                                           |
|-----|-------------------------|-----------------------------------------------|-----------------------------------------------------------------|
| M01 | Xác nhận từ chối        | Bấm "Từ chối" tại S07                         | Nhập lý do từ chối bắt buộc; xác nhận trước khi submit         |
| M02 | Xác nhận xoá tờ trình   | Bấm "Xoá" tại S07 / S05                       | Cảnh báo không thể hoàn tác; yêu cầu confirm                   |
| M03 | Upload file             | Bấm "Đính kèm" trong S06/S08                  | Chọn file từ máy, hiển thị tiến trình upload, preview tên file |
| M04 | Xem trước hình ảnh      | Bấm ảnh nhúng trong nội dung tờ trình         | Lightbox xem ảnh full-screen                                    |
| M05 | Filter panel            | Bấm "Lọc" tại S05                             | Panel lọc nâng cao trượt xuống ngay dưới toolbar               |
| M06 | Toast notification      | Sau mỗi action thay đổi trạng thái           | Thông báo in-app tự đóng sau 4 giây, góc dưới phải             |
| M07 | Confirm gửi tờ trình    | Bấm "Gửi tờ trình" tại S07                    | Xác nhận trước khi gửi — sau khi gửi không sửa được            |

---

## 3. PERMISSION MATRIX

### 3.1 Định Nghĩa Vai Trò

| Vai Trò        | Mã           | Mô Tả                                                                                   |
|----------------|--------------|-----------------------------------------------------------------------------------------|
| Nhân viên      | `nhan_vien`  | Tạo và quản lý tờ trình bộ phận mình; chỉ xem tờ trình cùng bộ phận                   |
| Thẩm định      | `tham_dinh`  | Thẩm định tờ trình `cho_duyet` của tất cả bộ phận được phân công; xem tất cả tờ trình  |
| Phê duyệt      | `phe_duyet`  | Phê duyệt / từ chối tờ trình `tham_dinh` được phân công; xem tất cả tờ trình           |
| Quản trị       | `admin`      | Toàn quyền: CRUD users, cấu hình hệ thống, xem tất cả báo cáo, không bị giới hạn scope |

### 3.2 Ma Trận Quyền

#### Module Xác Thực

| Chức năng                   | nhan_vien | tham_dinh | phe_duyet | admin |
|-----------------------------|-----------|-----------|-----------|-------|
| Đăng nhập                   | ✅        | ✅        | ✅        | ✅    |
| Đổi mật khẩu của mình       | ✅        | ✅        | ✅        | ✅    |
| Reset mật khẩu người khác   | ❌        | ❌        | ❌        | ✅    |
| Quên mật khẩu (qua email)   | ✅        | ✅        | ✅        | ✅    |

#### Module Tờ Trình

| Chức năng                              | nhan_vien           | tham_dinh | phe_duyet | admin |
|----------------------------------------|---------------------|-----------|-----------|-------|
| Xem danh sách tờ trình                 | ✅ (bộ phận mình)   | ✅ (tất cả) | ✅ (tất cả) | ✅  |
| Tạo tờ trình mới                       | ✅                  | ✅        | ✅        | ✅    |
| Xem chi tiết tờ trình                  | ✅ (bộ phận mình)   | ✅        | ✅        | ✅    |
| Sửa tờ trình (đang `nhap`)            | ✅ (của mình)       | ❌        | ❌        | ✅    |
| Sửa tờ trình (đang `tu_choi`)         | ✅ (của mình)       | ❌        | ❌        | ✅    |
| Gửi tờ trình (`nhap` → `cho_duyet`)   | ✅ (của mình)       | ❌        | ❌        | ✅    |
| Gửi lại tờ trình (`tu_choi` → `cho_duyet`) | ✅ (của mình) | ❌        | ❌        | ✅    |
| Thẩm định (`cho_duyet` → `tham_dinh`) | ❌                  | ✅ (được phân công) | ❌ | ✅ |
| Phê duyệt (`tham_dinh` → `phe_duyet`) | ❌                  | ❌        | ✅ (được phân công) | ✅ |
| Từ chối ở bước thẩm định (`cho_duyet` → `tu_choi`) | ❌      | ✅ (được phân công) | ❌ | ✅ |
| Từ chối ở bước phê duyệt (`tham_dinh` → `tu_choi`) | ❌      | ❌        | ✅ (được phân công) | ✅ |
| Xoá tờ trình (chỉ `nhap`)             | ✅ (của mình)       | ❌        | ❌        | ✅    |
| Upload file đính kèm                   | ✅                  | ✅        | ✅        | ✅    |
| Upload hợp đồng đã ký (NT)            | ✅ (của mình)       | ✅        | ✅        | ✅    |

#### Module Báo Cáo

| Chức năng                  | nhan_vien | tham_dinh | phe_duyet | admin |
|----------------------------|-----------|-----------|-----------|-------|
| Xem báo cáo tổng hợp       | ❌        | ✅        | ✅        | ✅    |
| Xem báo cáo chi tiết chi phí| ❌       | ❌        | ✅        | ✅    |
| Export báo cáo (PDF/Excel) | ❌        | ❌        | ✅        | ✅    |

#### Module Quản Trị

| Chức năng                   | nhan_vien | tham_dinh | phe_duyet | admin |
|-----------------------------|-----------|-----------|-----------|-------|
| CRUD người dùng             | ❌        | ❌        | ❌        | ✅    |
| Gán / thay đổi role         | ❌        | ❌        | ❌        | ✅    |
| CRUD bộ phận                | ❌        | ❌        | ❌        | ✅    |
| CRUD mã phí                 | ❌        | ❌        | ❌        | ✅    |
| Cấu hình phân quyền duyệt  | ❌        | ❌        | ❌        | ✅    |

### 3.3 Data Access Rules

| Role        | Scope tờ trình      | Điều kiện lọc phía server                          |
|-------------|---------------------|----------------------------------------------------|
| `nhan_vien` | Bộ phận mình        | `WHERE boPhan = currentUser.boPhan`                |
| `tham_dinh` | Tất cả              | Không filter                                       |
| `phe_duyet` | Tất cả              | Không filter                                       |
| `admin`     | Tất cả              | Không filter                                       |

> ⚠️ **QUAN TRỌNG — Server luôn enforce:** UI chỉ ẩn/hiện nút theo role, nhưng server phải kiểm tra quyền ở mọi API call. Không được chỉ dựa vào UI để bảo vệ dữ liệu.

### 3.4 Business Rules Phân Quyền Duyệt

- Mỗi bộ phận được cấu hình **một** người thẩm định và **một** người phê duyệt.
- Khi tờ trình được tạo, hệ thống **tự động gán** `thamDinhId` và `pheDuyetId` dựa vào `boPhan`.
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
    │       └─ Cập nhật isFirstLogin = false → Redirect → /to-trinh
    │
    └─ Đăng nhập thành công
        ├─ Server trả về: { accessToken, refreshToken, user }
        ├─ Frontend lưu: accessToken vào memory, refreshToken vào httpOnly cookie
        └─ Redirect → /to-trinh
```

> ⚠️ **KHÔNG THỂ BỎ QUA:** Nếu `isFirstLogin = true` → server từ chối mọi API call khác (trừ `/api/auth/change-password`) cho đến khi hoàn thành đổi mật khẩu.

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
    │   ├─ boPhan: chọn từ dropdown → hệ thống auto-fill tên người thẩm định + phê duyệt
    │   ├─ ngayTrinh: mặc định là ngày hôm nay
    │   ├─ veViec: tiêu đề (bắt buộc)
    │   └─ noiDung: nội dung chi tiết (bắt buộc, hỗ trợ nhúng ảnh)
    │
    ├─ [Nếu loại = MS] Điền danh sách chi phí (≥ 1 dòng bắt buộc)
    │   ├─ Chọn mã phí (dropdown theo bộ phận)
    │   ├─ Điền soTienChuaVAT → hệ thống tự tính soTienCoVAT = soTienChuaVAT × 1.1
    │   │   └─ Hoặc điền soTienCoVAT trực tiếp
    │   ├─ Điền nhaCungCap
    │   ├─ Tuỳ chọn: muaCho, mucDich, nguoiSuDung
    │   └─ Thêm vật tư có sẵn (không mua thêm, ghi nhận để đối chiếu)
    │
    ├─ [Nếu loại = NT] Điền thông tin hợp đồng
    │   ├─ nhaCungCap (bắt buộc)
    │   ├─ ngayBatDauHD / ngayHetHanHD (bắt buộc)
    │   └─ Nếu hợp đồng đã ký: upload file hopDongDaKy
    │
    ├─ Đính kèm file hỗ trợ (tuỳ chọn, nhiều file)
    │   └─ POST /api/upload → nhận url → lưu vào fileDinhKem[]
    │
    └─ Lưu nháp
        ├─ POST /api/to-trinh
        ├─ Server: trangThai = 'nhap', auto-gen mã, gán thamDinhId + pheDuyetId
        └─ Redirect → /to-trinh/{id}
```

### 4.4 Luồng Duyệt Tờ Trình (Workflow Chính)

```
┌─────────────────────────────────────────────────────────┐
│                   TRẠNG THÁI: nhap                      │
└─────────────────────────────────────────────────────────┘
    │
    │  Người trình bấm "Gửi tờ trình" → [M07 Confirm]
    │
    ├─ POST /api/to-trinh/{id}/gui
    │   ├─ Server check: currentUser là nguoiTrinhId hoặc admin
    │   ├─ Server check: trangThai === 'nhap'
    │   ├─ WRITE: trangThai → 'cho_duyet'
    │   ├─ WRITE: LichSuToTrinh (INSERT: action='gui', userId, timestamp)
    │   └─ EMAIL: Gửi thông báo đến người thẩm định
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              TRẠNG THÁI: cho_duyet                      │
│              (Chờ thẩm định)                            │
└─────────────────────────────────────────────────────────┘
    │
    ├─── Người thẩm định bấm "Thẩm định"
    │    ├─ POST /api/to-trinh/{id}/tham-dinh
    │    ├─ Server check: currentUser.id === thamDinhId hoặc admin
    │    ├─ Server check: trangThai === 'cho_duyet'
    │    ├─ WRITE: trangThai → 'tham_dinh', thamDinhLuc = now()
    │    ├─ WRITE: LichSuToTrinh (INSERT)
    │    └─ EMAIL: Gửi thông báo đến người phê duyệt
    │
    └─── Người thẩm định bấm "Từ chối" → [M01 Nhập lý do]
         ├─ POST /api/to-trinh/{id}/tu-choi  { lyDo: "..." }
         ├─ Server check: currentUser.id === thamDinhId hoặc admin
         ├─ Server check: trangThai === 'cho_duyet'
         ├─ WRITE: trangThai → 'tu_choi', lyDoTuChoi = lyDo
         ├─ WRITE: LichSuToTrinh (INSERT)
         └─ EMAIL: Thông báo từ chối kèm lý do → người trình
         │
         ▼
       ┌─────────────────────────────────┐
       │   TRẠNG THÁI: tu_choi ❌       │
       │   → Người trình có thể sửa     │
       │     và gửi lại (→ cho_duyet)   │
       └─────────────────────────────────┘

    ▼
┌─────────────────────────────────────────────────────────┐
│              TRẠNG THÁI: tham_dinh                      │
│              (Chờ phê duyệt)                            │
└─────────────────────────────────────────────────────────┘
    │
    ├─── Người phê duyệt bấm "Phê duyệt"
    │    ├─ POST /api/to-trinh/{id}/phe-duyet
    │    ├─ Server check: currentUser.id === pheDuyetId hoặc admin
    │    ├─ Server check: trangThai === 'tham_dinh'
    │    ├─ WRITE: trangThai → 'phe_duyet', pheDuyetLuc = now()
    │    ├─ WRITE: LichSuToTrinh (INSERT)
    │    └─ EMAIL: Thông báo đã phê duyệt → người trình
    │    │
    │    ▼
    │  ┌─────────────────────────────────┐
    │  │   TRẠNG THÁI: phe_duyet ✅     │
    │  │   (Kết thúc — Thành công)       │
    │  └─────────────────────────────────┘
    │
    └─── Người phê duyệt bấm "Từ chối" → [M01 Nhập lý do]
         ├─ POST /api/to-trinh/{id}/tu-choi  { lyDo: "..." }
         ├─ Server check: currentUser.id === pheDuyetId hoặc admin
         ├─ Server check: trangThai === 'tham_dinh'
         ├─ WRITE: trangThai → 'tu_choi', lyDoTuChoi = lyDo
         ├─ WRITE: LichSuToTrinh (INSERT)
         └─ EMAIL: Thông báo từ chối kèm lý do → người trình
         │
         ▼
       ┌─────────────────────────────────┐
       │   TRẠNG THÁI: tu_choi ❌       │
       │   → Người trình có thể sửa     │
       │     và gửi lại (→ cho_duyet)   │
       └─────────────────────────────────┘
```

> ⚠️ **Quy tắc bất biến:** Server từ chối mọi chuyển trạng thái không đúng thứ tự. Không thể bỏ qua thẩm định, không thể quay về trạng thái trước (ngoại trừ tu_choi → sửa → cho_duyet).

### 4.5 Luồng Sửa Và Gửi Lại Sau Từ Chối

```
[Tờ trình đang tu_choi]
    │
    ├─ Người trình bấm "Sửa" → [S08 Sửa tờ trình]
    │   ├─ GET /api/to-trinh/{id} (load dữ liệu hiện tại)
    │   ├─ Cho phép sửa tất cả field như khi tạo mới
    │   └─ PUT /api/to-trinh/{id}
    │       ├─ Server check: currentUser là nguoiTrinhId hoặc admin
    │       └─ Server check: trangThai ∈ ['nhap', 'tu_choi']
    │
    └─ Bấm "Gửi lại" → chuyển tu_choi → cho_duyet
        ├─ POST /api/to-trinh/{id}/gui
        └─ Giống hệt luồng gửi lần đầu
```

### 4.6 Luồng Upload File

```
[Người dùng chọn file trong S06/S08]
    │
    ├─ POST /api/upload  (multipart/form-data)
    │   ├─ Server validate: size ≤ 20MB, extension ∈ [pdf, doc, docx, xls, xlsx, jpg, png]
    │   ├─ Lưu file vào object storage (S3 / MinIO / local)
    │   └─ Trả về: { id, ten, url, size, mimeType }
    │
    ├─ Frontend hiển thị file trong danh sách đính kèm
    │
    └─ Khi lưu tờ trình: gửi mảng fileDinhKem gồm các { id, ten, url }
```

### 4.7 Luồng Tìm Kiếm & Lọc (S05)

```
[S05 Danh sách — GET /api/to-trinh?params]
    │
    ├─ Tab: loai=MS hoặc loai=NT (bắt buộc)
    │
    ├─ Search (q): full-text trên ma, veViec, noiDung, nhaCungCap
    │
    ├─ Filter:
    │   ├─ boPhan (enum)
    │   ├─ trangThai (enum)
    │   ├─ nhaCungCap (partial match)
    │   ├─ thamDinhId (exact)
    │   ├─ pheDuyetId (exact)
    │   ├─ ngayTrinhFrom / ngayTrinhTo (date range)
    │   └─ thang / nam (tháng/năm — cho báo cáo)
    │
    └─ Phân trang: page, limit (default 20)
        └─ Trả về: { data: ToTrinh[], total, page, totalPages }
```

### 4.8 Luồng Báo Cáo (S09, S10)

```
[S09 Báo cáo tổng hợp — GET /api/bao-cao/tong-hop]
    │
    ├─ Tham số: thang, nam (hoặc tuQuy, denQuý)
    │
    └─ Server trả về:
        ├─ Tổng số tờ trình theo trạng thái
        ├─ Tổng số tờ trình theo loại (MS/NT)
        ├─ Tổng số tờ trình theo bộ phận
        ├─ Biểu đồ theo tháng (12 tháng gần nhất)
        └─ Tỉ lệ phê duyệt / từ chối

[S10 Báo cáo chi tiết chi phí — GET /api/bao-cao/chi-phi]
    │
    ├─ Tham số: tuNgay, denNgay, boPhan, maPhi, nhaCungCap
    │
    └─ Server trả về:
        ├─ Tổng chi phí (chuaVAT + coVAT) theo bộ phận
        ├─ Tổng chi phí theo mã phí
        ├─ Tổng chi phí theo nhà cung cấp
        └─ Danh sách chi tiết tờ trình có chi phí
```

---

## 5. FIELD LIST / DATA DICTIONARY

> **Quy ước chung cho production DB:**
> - Tất cả PK: **UUID v7** (time-ordered, sortable)
> - Tất cả timestamp: **TIMESTAMPTZ UTC** (hiển thị theo timezone user)
> - Tất cả delete: **soft delete** (`isDeleted = true`), không hard delete
> - Mọi bảng có **Standard Audit Fields**: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isDeleted`

### 5.1 Entity: User

| Field           | Type          | Required | Constraints                                                  | Description                          |
|-----------------|---------------|----------|--------------------------------------------------------------|--------------------------------------|
| `id`            | UUID v7       | ✅       | PK                                                           | ID người dùng                        |
| `username`      | VARCHAR(100)  | ✅       | Unique, lowercase, không dấu                                 | Tên đăng nhập                        |
| `passwordHash`  | VARCHAR(255)  | ✅       | bcrypt, cost factor ≥ 12                                     | Mật khẩu đã hash (không trả về API) |
| `hoTen`         | NVARCHAR(200) | ✅       |                                                              | Họ tên đầy đủ                        |
| `email`         | VARCHAR(255)  | ✅       | Unique, RFC 5322                                             | Email liên lạc và nhận thông báo     |
| `boPhan`        | VARCHAR(100)  | ✅       | FK → BoPhan.ten                                              | Bộ phận công tác                     |
| `chucVu`        | NVARCHAR(200) | ✅       |                                                              | Chức vụ hiển thị                     |
| `role`          | VARCHAR(20)   | ✅       | `"nhan_vien" \| "tham_dinh" \| "phe_duyet" \| "admin"`      | Vai trò trong hệ thống               |
| `avatarColor`   | VARCHAR(7)    | ✅       | HEX `#RRGGBB`, Default: `#6366f1`                            | Màu avatar                           |
| `isActive`      | BOOLEAN       | ✅       | Default: true                                                | Tài khoản còn hoạt động              |
| `isFirstLogin`  | BOOLEAN       | ✅       | Default: true                                                | Bắt buộc đổi mật khẩu lần đầu       |
| `lastLoginAt`   | TIMESTAMPTZ   | ❌       |                                                              | Lần đăng nhập gần nhất               |
| `createdAt`     | TIMESTAMPTZ   | ✅       | Auto, UTC                                                    | Thời điểm tạo tài khoản              |
| `updatedAt`     | TIMESTAMPTZ   | ✅       | Auto-update, UTC                                             | Lần cập nhật gần nhất                |
| `isDeleted`     | BOOLEAN       | ✅       | Default: false                                               | Soft delete                          |

### 5.2 Entity: BoPhan

| Field       | Type          | Required | Constraints | Description       |
|-------------|---------------|----------|-------------|-------------------|
| `id`        | UUID v7       | ✅       | PK          | ID bộ phận        |
| `ten`       | NVARCHAR(100) | ✅       | Unique      | Tên bộ phận       |
| `moTa`      | NVARCHAR(500) | ❌       |             | Mô tả             |
| `isActive`  | BOOLEAN       | ✅       | Default: true |                 |
| `createdAt` | TIMESTAMPTZ   | ✅       | Auto        |                   |
| `isDeleted` | BOOLEAN       | ✅       | Default: false |              |

Danh sách mặc định: `IT`, `Kế toán`, `Marketing`, `Mua hàng`, `Hành chính`, `Ban lãnh đạo`

### 5.3 Entity: PhanQuyenDuyet

| Field        | Type    | Required | Constraints                        | Description                     |
|--------------|---------|----------|------------------------------------|---------------------------------|
| `id`         | UUID v7 | ✅       | PK                                 |                                 |
| `boPhanId`   | UUID v7 | ✅       | FK → BoPhan.id, Unique             | Bộ phận được cấu hình           |
| `thamDinhId` | UUID v7 | ✅       | FK → User.id (role = tham_dinh)    | Người thẩm định mặc định        |
| `pheDuyetId` | UUID v7 | ✅       | FK → User.id (role = phe_duyet)    | Người phê duyệt mặc định        |
| `updatedAt`  | TIMESTAMPTZ | ✅   | Auto-update                        |                                 |
| `updatedBy`  | UUID v7 | ✅       | FK → User.id                       | Người cấu hình lần cuối         |

### 5.4 Entity: MaPhi

| Field       | Type          | Required | Constraints                     | Description                      |
|-------------|---------------|----------|---------------------------------|----------------------------------|
| `id`        | UUID v7       | ✅       | PK                              |                                  |
| `ma`        | VARCHAR(20)   | ✅       | Unique (vd: `IT0001`, `KT0002`) | Mã phí                           |
| `ten`       | NVARCHAR(200) | ✅       |                                 | Tên mô tả                        |
| `boPhanId`  | UUID v7       | ✅       | FK → BoPhan.id                  | Bộ phận sử dụng mã phí này       |
| `isActive`  | BOOLEAN       | ✅       | Default: true                   |                                  |
| `createdAt` | TIMESTAMPTZ   | ✅       | Auto                            |                                  |
| `isDeleted` | BOOLEAN       | ✅       | Default: false                  |                                  |

### 5.5 Entity: ToTrinh

#### Standard Fields (cả MS và NT)

| Field          | Type          | Required | Constraints                                                                        | Description                                 |
|----------------|---------------|----------|------------------------------------------------------------------------------------|---------------------------------------------|
| `id`           | UUID v7       | ✅       | PK                                                                                 |                                             |
| `loai`         | VARCHAR(2)    | ✅       | `"MS" \| "NT"`                                                                     | Loại tờ trình                               |
| `ma`           | VARCHAR(20)   | ✅       | Unique, Auto-gen: `MS0001`… / `NT0001`…                                            | Mã tờ trình (seq per loai)                  |
| `nguoiTrinhId` | UUID v7       | ✅       | FK → User.id                                                                       | Người tạo tờ trình                          |
| `boPhanId`     | UUID v7       | ✅       | FK → BoPhan.id                                                                     | Bộ phận của tờ trình                        |
| `ngayTrinh`    | DATE          | ✅       |                                                                                    | Ngày trình (do người dùng chọn)             |
| `veViec`       | NVARCHAR(500) | ✅       |                                                                                    | Tiêu đề / tóm tắt                           |
| `noiDung`      | NTEXT         | ✅       | HTML hoặc Markdown                                                                 | Nội dung chi tiết                           |
| `trangThai`    | VARCHAR(20)   | ✅       | `"nhap" \| "cho_duyet" \| "tham_dinh" \| "phe_duyet" \| "tu_choi"`, Default: nhap | Trạng thái hiện tại                         |
| `thamDinhId`   | UUID v7       | ✅       | FK → User.id                                                                       | Người thẩm định được gán (từ PhanQuyenDuyet)|
| `pheDuyetId`   | UUID v7       | ✅       | FK → User.id                                                                       | Người phê duyệt được gán                    |
| `thamDinhLuc`  | TIMESTAMPTZ   | ❌       | Set khi thamDinh()                                                                 | Thời điểm thẩm định xong                    |
| `pheDuyetLuc`  | TIMESTAMPTZ   | ❌       | Set khi pheDuyet()                                                                 | Thời điểm phê duyệt xong                    |
| `lyDoTuChoi`   | NTEXT         | ❌       | Required khi trangThai = tu_choi                                                   | Lý do từ chối                               |
| `hopDongDaKy`  | UUID v7       | ❌       | FK → FileDinhKem.id                                                                | Hợp đồng đã ký (NT)                         |
| `createdAt`    | TIMESTAMPTZ   | ✅       | Auto                                                                               |                                             |
| `updatedAt`    | TIMESTAMPTZ   | ✅       | Auto-update                                                                        |                                             |
| `createdBy`    | UUID v7       | ✅       | FK → User.id                                                                       |                                             |
| `isDeleted`    | BOOLEAN       | ✅       | Default: false                                                                     | Soft delete (chỉ khi nhap)                  |

#### Fields riêng Tờ Trình Mua Sắm (loai = MS)

Lưu trong bảng `ChiPhiDong` (1-n với ToTrinh) và `VatTuCoSan` (1-n):

| Entity        | Mô Tả                                                          |
|---------------|----------------------------------------------------------------|
| `ChiPhiDong`  | Mỗi dòng chi phí; bắt buộc ≥ 1 dòng khi loai = MS            |
| `VatTuCoSan`  | Vật tư hiện có sẵn (không mua thêm); tuỳ chọn                 |

#### Fields riêng Tờ Trình Nguyên Tắc (loai = NT)

| Field          | Type   | Required | Constraints               | Description              |
|----------------|--------|----------|---------------------------|--------------------------|
| `ngayBatDauHD` | DATE   | ✅       |                           | Ngày bắt đầu hợp đồng   |
| `ngayHetHanHD` | DATE   | ✅       | ≥ ngayBatDauHD            | Ngày hết hạn hợp đồng   |
| `nhaCungCap`   | NVARCHAR(300) | ✅ |                           | Nhà cung cấp             |

> **Lưu ý lưu trữ NT fields:** Có thể lưu thêm vào bảng `ToTrinhNT` (1-1 với ToTrinh) hoặc cột JSON trong `ToTrinh` tuỳ thiết kế DB.

### 5.6 Entity: ChiPhiDong

| Field            | Type          | Required | Constraints                           | Description                             |
|------------------|---------------|----------|---------------------------------------|-----------------------------------------|
| `id`             | UUID v7       | ✅       | PK                                    |                                         |
| `toTrinhId`      | UUID v7       | ✅       | FK → ToTrinh.id, CASCADE DELETE       | Tờ trình chứa dòng chi phí này         |
| `maPhiId`        | UUID v7       | ✅       | FK → MaPhi.id                         | Mã phí                                  |
| `tenMaPhi`       | NVARCHAR(200) | ✅       | Denormalized snapshot lúc tạo         | Tên mã phí (lưu snapshot để không bị đổi khi admin sửa) |
| `soTienChuaVAT`  | BIGINT        | ✅       | ≥ 0, đơn vị VND (không dùng decimal) | Số tiền chưa VAT                        |
| `soTienCoVAT`    | BIGINT        | ✅       | ≥ soTienChuaVAT                       | Số tiền đã có VAT (dùng để hiển thị tổng) |
| `nhaCungCap`     | NVARCHAR(300) | ✅       |                                       | Nhà cung cấp dòng này                   |
| `muaCho`         | NVARCHAR(200) | ❌       |                                       | Mua cho ai / đơn vị hưởng              |
| `mucDich`        | NVARCHAR(500) | ❌       |                                       | Mục đích sử dụng                        |
| `nguoiSuDung`    | NVARCHAR(200) | ❌       |                                       | Người / bộ phận dùng trực tiếp         |
| `thuTu`          | INT           | ✅       | ≥ 1, Default: 1                       | Thứ tự dòng trong danh sách             |

> **Lý do dùng BIGINT thay DECIMAL cho tiền VND:** VND không có số lẻ thập phân. BIGINT tránh lỗi floating-point và đủ cho mọi giá trị thực tế (max ~9.2 × 10¹⁸ đồng).

### 5.7 Entity: VatTuCoSan

| Field       | Type          | Required | Description                   |
|-------------|---------------|----------|-------------------------------|
| `id`        | UUID v7       | ✅       | PK                            |
| `toTrinhId` | UUID v7       | ✅       | FK → ToTrinh.id, CASCADE      |
| `tenVatTu`  | NVARCHAR(300) | ✅       | Tên vật tư / thiết bị         |
| `soLuong`   | INT           | ✅       | ≥ 1                           |
| `donViTinh` | NVARCHAR(50)  | ✅       | Cái, Ram, Hộp, Cuộn...        |
| `thuTu`     | INT           | ✅       | Thứ tự hiển thị               |

### 5.8 Entity: FileDinhKem

| Field       | Type          | Required | Constraints                                          | Description               |
|-------------|---------------|----------|------------------------------------------------------|---------------------------|
| `id`        | UUID v7       | ✅       | PK                                                   |                           |
| `toTrinhId` | UUID v7       | ✅       | FK → ToTrinh.id                                      |                           |
| `loaiFile`  | VARCHAR(20)   | ✅       | `"dinh_kem" \| "hop_dong_ky"`                        | Phân loại file            |
| `ten`       | NVARCHAR(300) | ✅       | Tên gốc của file                                     |                           |
| `url`       | VARCHAR(2000) | ✅       | Đường dẫn object storage                             |                           |
| `mimeType`  | VARCHAR(100)  | ✅       | vd: `application/pdf`, `image/jpeg`                  |                           |
| `sizeBytes` | BIGINT        | ✅       | ≤ 20 × 1024 × 1024 (20MB)                           | Kích thước file bytes     |
| `uploadedBy`| UUID v7       | ✅       | FK → User.id                                         |                           |
| `uploadedAt`| TIMESTAMPTZ   | ✅       | Auto                                                 |                           |

### 5.9 Entity: LichSuToTrinh (Audit Trail)

| Field        | Type          | Required | Description                                               |
|--------------|---------------|----------|-----------------------------------------------------------|
| `id`         | UUID v7       | ✅       | PK                                                        |
| `toTrinhId`  | UUID v7       | ✅       | FK → ToTrinh.id                                           |
| `userId`     | UUID v7       | ✅       | FK → User.id — người thực hiện hành động                 |
| `hanhDong`   | VARCHAR(50)   | ✅       | `"tao" \| "sua" \| "gui" \| "tham_dinh" \| "phe_duyet" \| "tu_choi" \| "gui_lai"` |
| `tuTrangThai`| VARCHAR(20)   | ❌       | Trạng thái trước hành động                                |
| `denTrangThai`| VARCHAR(20)  | ❌       | Trạng thái sau hành động                                  |
| `ghiChu`     | NTEXT         | ❌       | Lý do từ chối hoặc ghi chú thêm                          |
| `taoLuc`     | TIMESTAMPTZ   | ✅       | Auto, UTC                                                 |

### 5.10 Entity: RefreshToken

| Field       | Type         | Required | Constraints              | Description                           |
|-------------|--------------|----------|--------------------------|---------------------------------------|
| `id`        | UUID v7      | ✅       | PK                       |                                       |
| `userId`    | UUID v7      | ✅       | FK → User.id             |                                       |
| `tokenHash` | VARCHAR(255) | ✅       | SHA-256 của token gốc    | Lưu hash, không lưu token thật        |
| `expiresAt` | TIMESTAMPTZ  | ✅       |                          | Hết hạn sau 7 ngày                    |
| `isRevoked` | BOOLEAN      | ✅       | Default: false           |                                       |
| `createdAt` | TIMESTAMPTZ  | ✅       | Auto                     |                                       |
| `userAgent` | VARCHAR(500) | ❌       |                          | Device info để hiển thị phiên đăng nhập |

### 5.11 Entity: PasswordResetToken

| Field       | Type         | Required | Constraints          | Description               |
|-------------|--------------|----------|----------------------|---------------------------|
| `id`        | UUID v7      | ✅       | PK                   |                           |
| `userId`    | UUID v7      | ✅       | FK → User.id         |                           |
| `tokenHash` | VARCHAR(255) | ✅       | SHA-256              | Lưu hash                  |
| `expiresAt` | TIMESTAMPTZ  | ✅       | Hết hạn sau 15 phút  |                           |
| `usedAt`    | TIMESTAMPTZ  | ❌       |                      | Đã dùng — vô hiệu hoá ngay|
| `createdAt` | TIMESTAMPTZ  | ✅       | Auto                 |                           |

### 5.12 Entity: DanhMucVatTu (danh mục gợi ý)

| Field       | Type          | Required | Description                          |
|-------------|---------------|----------|--------------------------------------|
| `id`        | UUID v7       | ✅       | PK                                   |
| `ten`       | NVARCHAR(300) | ✅       | Tên vật tư / thiết bị                |
| `donViTinh` | NVARCHAR(50)  | ✅       | Đơn vị tính mặc định                 |
| `isActive`  | BOOLEAN       | ✅       | Default: true                        |

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
    ├─ WRITE: INSERT RefreshToken (hash, userId, expiresAt)
    └─ Response: { accessToken, user: { id, username, hoTen, boPhan, role, ... } }
       + Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh

POST /api/auth/refresh
    Cookie: refreshToken
    ├─ Hash token → lookup RefreshToken WHERE tokenHash=? AND isRevoked=false AND expiresAt>now
    ├─ Nếu không tìm thấy → 401
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

### 6.2 Tờ Trình — CRUD

```
GET /api/to-trinh
    Query: loai, q, boPhan, trangThai, nhaCungCap, thamDinhId, pheDuyetId,
           ngayTrinhFrom, ngayTrinhTo, page(default:1), limit(default:20)
    ├─ Server apply data scope theo role (§3.3)
    ├─ Apply filters
    ├─ READ: ToTrinh JOIN ChiPhiDong JOIN User (nguoiTrinh, thamDinh, pheDuyet)
    └─ Response: { data: ToTrinh[], total, page, totalPages }

GET /api/to-trinh/:id
    ├─ Server check scope: nhan_vien chỉ xem boPhan mình
    └─ Response: ToTrinh đầy đủ + chiPhi[] + vatTuCoSan[] + fileDinhKem[] + lichSu[]

POST /api/to-trinh
    Body: { loai, boPhan, ngayTrinh, veViec, noiDung, chiPhi[]?, vatTuCoSan[]?,
            ngayBatDauHD?, ngayHetHanHD?, nhaCungCap? }
    ├─ Validate bắt buộc theo loại
    ├─ READ: PhanQuyenDuyet WHERE boPhan=? → lấy thamDinhId, pheDuyetId
    ├─ Auto-gen mã: SELECT COUNT(*)+1 WHERE loai=? (cần lock để tránh race condition)
    ├─ WRITE: INSERT ToTrinh (trangThai='nhap')
    ├─ WRITE: INSERT ChiPhiDong[] (nếu MS)
    ├─ WRITE: INSERT VatTuCoSan[] (nếu có)
    ├─ WRITE: INSERT LichSuToTrinh (hanhDong='tao')
    └─ Response: { id, ma }

PUT /api/to-trinh/:id
    Body: (giống POST, partial update)
    ├─ Server check: trangThai ∈ ['nhap', 'tu_choi']
    ├─ Server check: currentUser là nguoiTrinhId hoặc admin
    ├─ WRITE: UPDATE ToTrinh
    ├─ WRITE: DELETE + INSERT ChiPhiDong[] (replace all)
    ├─ WRITE: DELETE + INSERT VatTuCoSan[] (replace all)
    └─ WRITE: INSERT LichSuToTrinh (hanhDong='sua')

DELETE /api/to-trinh/:id
    ├─ Server check: trangThai = 'nhap'
    ├─ Server check: currentUser là nguoiTrinhId hoặc admin
    ├─ WRITE: ToTrinh.isDeleted = true
    └─ WRITE: INSERT LichSuToTrinh (hanhDong='xoa')
```

### 6.3 Tờ Trình — Workflow Actions

```
POST /api/to-trinh/:id/gui           (nhap → cho_duyet)
    ├─ Check: trangThai ∈ ['nhap', 'tu_choi']
    ├─ Check: currentUser là nguoiTrinhId hoặc admin
    ├─ Check (nếu MS): phải có ≥ 1 ChiPhiDong
    ├─ WRITE: trangThai='cho_duyet'
    ├─ WRITE: LichSuToTrinh (hanhDong='gui' hoặc 'gui_lai')
    └─ EMAIL: Gửi thông báo → thamDinhUser

POST /api/to-trinh/:id/tham-dinh    (cho_duyet → tham_dinh)
    ├─ Check: trangThai = 'cho_duyet'
    ├─ Check: currentUser.id = thamDinhId hoặc admin
    ├─ WRITE: trangThai='tham_dinh', thamDinhLuc=now()
    ├─ WRITE: LichSuToTrinh
    └─ EMAIL: Gửi thông báo → pheDuyetUser

POST /api/to-trinh/:id/phe-duyet    (tham_dinh → phe_duyet)
    ├─ Check: trangThai = 'tham_dinh'
    ├─ Check: currentUser.id = pheDuyetId hoặc admin
    ├─ WRITE: trangThai='phe_duyet', pheDuyetLuc=now()
    ├─ WRITE: LichSuToTrinh
    └─ EMAIL: Gửi thông báo → nguoiTrinh

POST /api/to-trinh/:id/tu-choi      (cho_duyet → tu_choi  HOẶC  tham_dinh → tu_choi)
    Body: { lyDo: string (bắt buộc, không rỗng) }
    ├─ Check: trangThai ∈ ['cho_duyet', 'tham_dinh']
    ├─ Nếu trangThai = 'cho_duyet' → Check: currentUser.id = thamDinhId hoặc admin
    ├─ Nếu trangThai = 'tham_dinh' → Check: currentUser.id = pheDuyetId hoặc admin
    ├─ WRITE: trangThai='tu_choi', lyDoTuChoi=lyDo
    ├─ WRITE: LichSuToTrinh (ghiChu=lyDo)
    └─ EMAIL: Gửi thông báo kèm lý do → nguoiTrinh
```

### 6.4 Upload File

```
POST /api/upload
    Content-Type: multipart/form-data
    Field: file (binary), context: "dinh_kem" | "hop_dong_ky" | "anh_noi_dung"
    ├─ Validate: size ≤ 20MB
    ├─ Validate: extension ∈ {pdf, doc, docx, xls, xlsx, jpg, jpeg, png, gif}
    ├─ Scan virus (nếu có tích hợp)
    ├─ Lưu file: {storage}/{year}/{month}/{uuid}.{ext}
    ├─ WRITE: INSERT FileDinhKem (hoặc trả về URL để FE dùng khi save tờ trình)
    └─ Response: { id, ten, url, mimeType, sizeBytes }

DELETE /api/upload/:id
    ├─ Check: file thuộc tờ trình của currentUser
    ├─ Xoá khỏi object storage
    └─ WRITE: DELETE FileDinhKem
```

### 6.5 Báo Cáo

```
GET /api/bao-cao/tong-hop
    Query: nam (required), thang? (1-12, nếu thiếu → cả năm)
    Auth: tham_dinh, phe_duyet, admin
    └─ Response:
       {
         tongSo: number,
         theoTrangThai: { nhap, cho_duyet, tham_dinh, phe_duyet, tu_choi },
         theoLoai: { MS, NT },
         theoBoPhan: [{ boPhan, tongSo, pheDuyet, tuChoi }],
         theoThang: [{ thang, tongSo }],   // 12 phần tử nếu query cả năm
         tiLePheduyet: number               // phần trăm
       }

GET /api/bao-cao/chi-phi
    Query: tuNgay, denNgay, boPhan?, maPhi?, nhaCungCap?, page, limit
    Auth: phe_duyet, admin
    └─ Response:
       {
         tongChuaVAT: number,
         tongCoVAT: number,
         theoBoPhan: [...],
         theoMaPhi: [...],
         theoNhaCungCap: [...],
         chiTiet: [ToTrinh + ChiPhiDong]
       }
```

### 6.6 Admin — User Management

```
GET    /api/admin/users          → Danh sách users (có filter, phân trang)
POST   /api/admin/users          → Tạo user mới (isFirstLogin=true, password tạm)
PUT    /api/admin/users/:id      → Cập nhật thông tin, role, isActive
DELETE /api/admin/users/:id      → Soft delete (isDeleted=true)
POST   /api/admin/users/:id/reset-password → Reset về mật khẩu tạm, isFirstLogin=true

GET    /api/admin/bo-phan        → Danh sách bộ phận
POST   /api/admin/bo-phan        → Tạo bộ phận mới
PUT    /api/admin/bo-phan/:id    → Cập nhật
DELETE /api/admin/bo-phan/:id    → Soft delete

GET    /api/admin/ma-phi         → Danh sách mã phí (filter theo boPhan)
POST   /api/admin/ma-phi         → Tạo mã phí mới
PUT    /api/admin/ma-phi/:id     → Cập nhật
DELETE /api/admin/ma-phi/:id     → Soft delete

GET    /api/admin/phan-quyen-duyet      → Lấy cấu hình theo bộ phận
PUT    /api/admin/phan-quyen-duyet/:boPhanId → Cập nhật người thẩm định / phê duyệt
```

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
│         │  │ # │ Mã     │ BP  │ Ngày  │ Về việc │ Số tiền │...│   │
│         │  ├──────────────────────────────────────────────────┤   │
│         │  │ 1 │ MS0001 │ IT  │ 01/04 │ Mua...  │ 50tr    │...│   │
│         │  │ 2 │ MS0002 │ KT  │ 01/04 │ Mua...  │ 25tr    │...│   │
│         │  └──────────────────────────────────────────────────┘   │
│         │  [← 1 2 3 ... →]                         20 / trang    │
└───────────────────────────────────────────────────────────────────┘
```

### S07 — Chi Tiết Tờ Trình (MS)

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Quay lại]  MS0001  [Badge: Đã phê duyệt]   [Sửa] [In PDF]   │
│ IT - Mua máy tính bổ sung tháng 04/26                           │
│                                                                 │
│ ┌─ Thông tin chung ─────────────────────────────────────────┐   │
│ │ Ngày trình: 01/04/2026  │  Bộ phận: IT                   │   │
│ │ Người trình: Nguyễn Thế Hùng    Mã: MS0001               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Nội dung ────────────────────────────────────────────────┐   │
│ │ KG BLĐ xin phê duyệt, ...                                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ Danh sách chi phí ───────────────────────────────────────┐   │
│ │ Mã phí │ Tên   │ Chưa VAT │ Có VAT  │ NCC      │ Mua cho │   │
│ │ IT0001 │ TSCĐ  │ 45.5tr   │ 50tr    │ Cty ABC  │ NV Hùng │   │
│ │                           Tổng: 50,000,000 đ              │   │
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

### S09 — Báo Cáo Tổng Hợp

```
┌─────────────────────────────────────────────────────────────────┐
│ Báo cáo hoạt động                  [Năm: 2026 ▼] [Tháng: 4 ▼]  │
│                                                                 │
│ ┌──────────┬───────────┬────────────┬────────────┬───────────┐  │
│ │ Tổng: 10 │ Chờ TD: 3 │ Chờ PD: 2  │ Đã PD: 4   │ Từ chối:1│  │
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

---

## 8. REQUIREMENT BACKLOG

| ID   | Tên Tính Năng                          | Mức Độ   | Trạng Thái  | Ghi Chú                                                        |
|------|----------------------------------------|----------|-------------|----------------------------------------------------------------|
| F001 | Xác thực JWT + Refresh Token           | Critical | Planned     | Thay thế "chọn user" mock; bắt buộc cho production            |
| F002 | Đổi mật khẩu lần đầu (isFirstLogin)   | Critical | Planned     | Chặn truy cập đến khi hoàn thành                              |
| F003 | Quên mật khẩu qua email               | High     | Planned     | Reset link TTL 15 phút, 1 lần dùng                            |
| F004 | Upload file thật (object storage)     | High     | Planned     | Thay thế URL `#`; validate size + type; scan virus nếu có     |
| F005 | Trang báo cáo đầy đủ (S09, S10)       | High     | Planned     | Hiện là stub; cần API + biểu đồ                               |
| F006 | Quản trị admin (S11–S14)              | High     | Planned     | CRUD user, bộ phận, mã phí, cấu hình phân quyền              |
| F007 | Lịch sử thay đổi tờ trình (timeline) | High     | Planned     | Bảng LichSuToTrinh; hiển thị ở S07                            |
| F008 | Sửa và gửi lại sau từ chối           | High     | Planned     | Cho phép edit tu_choi → gui lại → cho_duyet                   |
| F009 | Phân trang danh sách (S05)            | High     | Planned     | Hiện render tất cả; cần khi data thật                         |
| F010 | Email thật (SMTP / SendGrid)          | High     | Planned     | Thay thế toast mô phỏng; gửi email tới người liên quan        |
| F011 | Export PDF tờ trình                   | Medium   | Planned     | In tờ trình theo template; đã có print stylesheet cơ bản      |
| F012 | Export báo cáo Excel                  | Medium   | Planned     | Chi phí theo bộ phận / mã phí                                 |
| F013 | Nhúng ảnh vào nội dung tờ trình      | Medium   | In Progress | Field anhNoiDung đã có; cần editor hỗ trợ upload + preview   |
| F014 | Tự động tính VAT (soTienChuaVAT → soTienCoVAT) | Medium | Planned | Tỷ lệ VAT 10% mặc định; có thể cấu hình                |
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
| E014   | 403  | isFirstLogin = true, truy cập API khác              | "Bạn cần đổi mật khẩu trước khi tiếp tục."           |
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

| ID   | Trigger                              | Nội Dung                                                                    | Loại      |
|------|--------------------------------------|-----------------------------------------------------------------------------|-----------|
| N001 | Gửi tờ trình thành công             | `📧 Email gửi đến {thamDinh.hoTen} để thẩm định tờ trình {ma}`             | `info`    |
| N002 | Thẩm định xong                       | `📧 Email gửi đến {pheDuyet.hoTen} để phê duyệt tờ trình {ma}`             | `info`    |
| N003 | Phê duyệt thành công                 | `📧 Email thông báo tờ trình {ma} đã phê duyệt gửi đến {nguoiTrinh.hoTen}` | `success` |
| N004 | Từ chối tờ trình                     | `📧 Email thông báo từ chối tờ trình {ma} gửi đến {nguoiTrinh.hoTen}`      | `warning` |
| N005 | Tạo tờ trình thành công             | `Tờ trình {ma} đã được lưu nháp thành công.`                                | `success` |
| N006 | Upload file thành công              | `File "{ten}" đã được đính kèm.`                                            | `success` |

### 10.2 Email Thật (production)

| ID   | Kênh  | Trigger                           | Người Nhận        | Template / Nội Dung                                               |
|------|-------|-----------------------------------|-------------------|--------------------------------------------------------------------|
| E001 | Email | Gửi tờ trình (→ cho_duyet)       | Người thẩm định   | Thông báo có tờ trình mới cần thẩm định + link trực tiếp          |
| E002 | Email | Thẩm định xong (→ tham_dinh)     | Người phê duyệt   | Thông báo có tờ trình cần phê duyệt + link trực tiếp              |
| E003 | Email | Phê duyệt thành công             | Người trình       | Chúc mừng tờ trình {ma} "{veViec}" đã được phê duyệt             |
| E004 | Email | Từ chối                          | Người trình       | Thông báo từ chối + lý do + link để sửa và gửi lại               |
| E005 | Email | Tạo tài khoản mới                | User mới          | Thông tin đăng nhập tạm, link đổi mật khẩu lần đầu               |
| E006 | Email | Quên mật khẩu                    | User yêu cầu      | Link reset mật khẩu (TTL 15 phút)                                 |
| E007 | Email | Admin reset mật khẩu            | User được reset   | Thông báo mật khẩu đã được reset, link đổi mật khẩu              |

---

## 11. UI GROUPING — SYSTEM MENU

> Menu thay đổi theo role. Tất cả role đều thấy sidebar với các mục phù hợp quyền.

### Menu — nhan_vien

- Tờ trình (`/to-trinh`)

### Menu — tham_dinh

- Tờ trình (`/to-trinh`)
- Báo cáo (`/bao-cao`)

### Menu — phe_duyet

- Tờ trình (`/to-trinh`)
- Báo cáo (`/bao-cao`)
- Báo cáo chi phí (`/bao-cao/chi-phi`)

### Menu — admin

- Tờ trình (`/to-trinh`)
- Báo cáo (`/bao-cao`)
- Báo cáo chi phí (`/bao-cao/chi-phi`)
- Quản lý người dùng (`/admin/users`)
- Quản lý bộ phận (`/admin/bo-phan`)
- Quản lý mã phí (`/admin/ma-phi`)
- Cấu hình phân quyền duyệt (`/admin/phan-quyen`)

### Sidebar Footer (tất cả role)

- Avatar + Họ tên + Bộ phận + Chức vụ
- Link đến Hồ sơ cá nhân (`/profile`)
- Nút đăng xuất → `POST /api/auth/logout` → redirect `/login`

---

## Phụ Lục A: Danh Sách Người Dùng Mặc Định

| Username   | Họ Tên              | Bộ Phận      | Chức Vụ            | Role        |
|------------|---------------------|--------------|---------------------|-------------|
| quynhdt267 | Dương Thuý Quỳnh    | Mua hàng     | Trưởng phòng        | tham_dinh   |
| tanvt      | Trương Văn Tân      | IT           | Trưởng phòng IT     | tham_dinh   |
| myadh      | Dương Hà My         | Kế toán      | Kế toán trưởng      | tham_dinh   |
| nhunght    | Trần Hồng Nhung     | Marketing    | Quản lý MKT         | phe_duyet   |
| hongdv     | Dương Văn Hồng      | Ban lãnh đạo | Giám đốc            | phe_duyet   |
| vanlth     | Lê Thị Hồng Vân     | Ban lãnh đạo | Phó giám đốc        | phe_duyet   |
| hungnt     | Nguyễn Thế Hùng     | IT           | Nhân viên IT        | nhan_vien   |
| lienhm     | Hoàng Minh Liên     | Kế toán      | Kế toán viên        | nhan_vien   |
| thanhpv    | Phạm Văn Thành      | Marketing    | Nhân viên MKT       | nhan_vien   |

> Tất cả user trên cần được seed vào DB khi khởi tạo với `isFirstLogin = true`.

## Phụ Lục B: Danh Mục Mã Phí Mặc Định

| Mã     | Tên                  | Bộ Phận    |
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

> **Lý do lưu tenMaPhi là snapshot:** Nếu admin đổi tên mã phí, tờ trình cũ phải giữ nguyên tên lúc tạo để đảm bảo tính chính xác kiểm toán.

> **Lý do dùng soft delete:** Yêu cầu audit trail — mọi dữ liệu phải khôi phục được. Không hard delete bất kỳ entity nào.

> **Lý do không để nhan_vien thẩm định/phê duyệt:** Nguyên tắc tách biệt nghĩa vụ (separation of duties) — người tạo tờ trình không được tự duyệt tờ trình của mình.

> **Lý do lyDoTuChoi bắt buộc:** Người trình cần biết chính xác lý do để sửa đúng và gửi lại; từ chối không có lý do gây mất thông tin.
