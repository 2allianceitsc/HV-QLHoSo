# Hướng Dẫn Viết File REQUIREMENTS.md

> Tài liệu này mô tả cấu trúc, mục đích, và cách điền nội dung cho file `BA/REQUIREMENTS.md` —
> nguồn sự thật duy nhất về yêu cầu nghiệp vụ của dự án.
> Áp dụng được cho bất kỳ dự án web/mobile có nhiều vai trò và luồng nghiệp vụ phức tạp.

---

## Nguyên tắc cốt lõi

1. **REQUIREMENTS.md là nguồn sự thật duy nhất** — mọi quyết định về nghiệp vụ đều phải có trong đây.
2. **Không viết code trước khi requirements rõ ràng** — developer chỉ implement sau khi đọc file này.
3. **Cập nhật trước khi thay đổi code** — nếu hành vi hệ thống thay đổi, sửa file này trước.
4. **Ngôn ngữ nhất quán** — dùng ngôn ngữ Tiếng Việt cho tài liệu này, tuy nhiên các tên field/message thì dùng tiếng Anh.

---

## Cấu Trúc File (11 Section)

```
1. Header (metadata)
2. Screen List (danh sách màn hình)
3. Permission Matrix (ma trận phân quyền)
4. User Flow / Business Flow (luồng người dùng)
5. Field List / Data Dictionary (từ điển dữ liệu)
6. Data Flow / Table Impact (luồng dữ liệu + ví dụ API)
7. Mockup / Wireframe
8. Requirement Backlog
9. Error Handling
10. Notification Catalog
11. System Menu
```

---

## Section 1 — Header

**Mục đích:** Ghi nhận thông tin phiên bản để team biết file đang ở trạng thái nào.

```markdown
# {TÊN DỰ ÁN} — Yêu Cầu Hệ Thống

> **Cập nhật:** YYYY-MM-DD
> **Phiên bản:** X.Y.Z
> **Ngôn ngữ:** Tiếng Việt / English
```

**Hướng dẫn:**
- Tăng phiên bản mỗi khi có thay đổi lớn (breaking change → major, tính năng mới → minor, sửa nhỏ → patch).
- Ghi ngày cập nhật mỗi khi commit thay đổi vào file này.

---

## Section 2 — Screen List (Danh Sách Màn Hình)

**Mục đích:** Liệt kê toàn bộ màn hình (screen), dialog (modal), và trang của hệ thống.
Đây là "bản đồ" để developer, QA, và PM biết hệ thống có bao nhiêu view.

### Cấu trúc bảng Screen

```markdown
| ID  | Tên Màn Hình     | Route            | Vai Trò          | Mô Tả                             |
|-----|-----------------|------------------|-----------------|-----------------------------------|
| S01 | Đăng nhập       | `/login`         | Không cần auth  | Form đăng nhập username + password |
| S02 | Dashboard Admin | `/admin`         | ADMIN           | Tổng quan hệ thống                |
```

**Quy tắc đặt ID:**
- Screen: `S01`, `S02`... (dùng số có padding 2 chữ số)
- Modal/Dialog: `M01`, `M02`...
- Sub-screen (tab hoặc bước trong flow): `S02b`, `S02c`...

**Nhóm screen theo domain** (dùng heading `###`):
```
2.1 Xác Thực (Auth)
2.2 Dashboard (theo vai trò)
2.3 Quản Lý Người Dùng
2.4 Nghiệp Vụ Chính (đặt tên theo domain của dự án)
2.5 Báo Cáo
2.6 Cấu Hình Hệ Thống
2.7 Hồ Sơ Cá Nhân
2.8 Modals / Dialogs
```

**Khi nào cần mô tả chi tiết hơn:**
- Screen có nhiều tab → liệt kê từng tab thành sub-section `#### 2.x.y`
- Tab có logic phức tạp → thêm bảng cột, bộ lọc, logic tính toán ngay bên dưới

---

## Section 3 — Permission Matrix (Ma Trận Phân Quyền)

**Mục đích:** Định nghĩa rõ role nào được làm gì. Developer sẽ implement guard dựa vào đây.
**Rule quan trọng nhất:** Server luôn enforce — UI chỉ ẩn/hiện, không thay thế server-side check.

### 3.1 Định Nghĩa Vai Trò

```markdown
| Vai Trò     | Mã           | Mô Tả                                              |
|-------------|--------------|-----------------------------------------------------|
| Người dùng  | USER         | Người dùng cuối, chỉ thao tác dữ liệu của mình    |
| Quản trị    | ADMIN        | Quản trị toàn hệ thống                             |
```

### 3.2 Bảng Ma Trận Theo Module

Tạo 1 bảng cho mỗi nhóm tính năng (module):

```markdown
#### Module Xác Thực

| Chức năng          | USER | ADMIN |
|--------------------|------|-------|
| Đăng nhập          | ✅   | ✅    |
| Đổi mật khẩu mình | ✅   | ✅    |
| Reset mật khẩu người khác | ❌ | ✅ |
```

**Ký hiệu:**
- `✅` — được phép
- `❌` — không được phép
- `✅ (của mình)` — chỉ với dữ liệu của chính mình
- `✅ (nhóm mình)` — phạm vi được quản lý
- `✅ (liên quan)` — chỉ những entity liên quan đến role đó

### 3.3 Data Access Rules (Quan Trọng)

Khi role quyết định **phạm vi dữ liệu** (không chỉ chức năng), cần viết rõ:

```markdown
| Role  | Scope | SQL-like condition                        |
|-------|-------|--------------------------------------------|
| USER  | self  | WHERE user_id = @currentUserId            |
| ADMIN | all   | Không filter                              |
```

Nếu scope phức tạp (ví dụ: Manager thấy nhóm mình bao gồm nhiều nguồn), viết pseudocode SQL:

```markdown
Staff visible to Manager (@mgrId):
  1. Staff trong Team mà @mgr là manager
  2. Staff trong Department mà @mgr là manager
  → UNION của tất cả điều kiện
```

---

## Section 4 — User Flow / Business Flow

**Mục đích:** Mô tả **bước-by-bước** một luồng nghiệp vụ xảy ra như thế nào.
Developer đọc đây để biết: khi user bấm nút X thì backend làm gì, điều kiện rẽ nhánh là gì.

### Format khuyến nghị — ASCII flow diagram

```markdown
### 4.1 Luồng Đăng Nhập

[S01 Đăng nhập]
    │
    ├─ Nhập username + password → POST /api/auth/login
    │
    ├─ IsFirstLogin = true → [S04 Đổi mật khẩu lần đầu] (bắt buộc)
    │
    ├─ 2FA required → [S42 Xác thực 2FA]
    │   ├─ Google TOTP: nhập mã 6 số
    │   └─ Email OTP: hệ thống gửi email, user nhập mã
    │
    └─ Thành công → Redirect theo role:
        ├─ ADMIN → /admin
        └─ USER  → /dashboard
```

**Quy tắc viết flow:**
- Mỗi bước là 1 dòng, indent bằng `│`, `├─`, `└─`
- Điều kiện rẽ nhánh dùng `├─ Nếu A` / `└─ Nếu B`
- Ghi tên màn hình `[SXX ...]` và endpoint `/api/...` khi có
- Ghi action DB: `READ: ...`, `WRITE: INSERT/UPDATE ...`

**Các luồng cần viết (ít nhất):**
- Login / Logout (luôn cần)
- Luồng nghiệp vụ chính của dự án
- Luồng quản lý dữ liệu (CRUD chính)
- Luồng có xử lý background job / scheduled task

---

## Section 5 — Field List / Data Dictionary

**Mục đích:** Định nghĩa chính xác từng field của từng entity. Developer dùng đây để tạo schema DB và DTO.

### Format bảng Field

```markdown
### 5.1 Entity: UserAccount

| Field          | Type          | Required | Constraints          | Description              |
|----------------|---------------|----------|-----------------------|--------------------------|
| `Id`           | UUID          | ✅       | PK, UUIDv7            | Unique identifier        |
| `Username`     | VARCHAR(200)  | ✅       | Unique, case-insensitive | Login username         |
| `Email`        | VARCHAR(500)  | ✅       | Unique, RFC format    | Email address            |
| `PasswordHash` | VARCHAR(500)  | ✅       | bcrypt                | Hashed password          |
| `IsActive`     | BOOLEAN       | ✅       | Default: true         | Account enabled flag     |
| `CreatedAt`    | TIMESTAMPTZ   | ✅       | Auto                  | Creation timestamp (UTC) |
| `IsDeleted`    | BOOLEAN       | ✅       | Default: false        | Soft delete flag         |
```

**Quy tắc field quan trọng:**
- Tất cả PK: **UUID v7** (time-ordered, không dùng auto-increment integer)
- Tất cả FK: UUID trỏ đến PK của entity khác — ghi rõ `FK → EntityName`
- Tất cả datetime: **TIMESTAMPTZ UTC** (server lưu UTC, UI hiển thị theo timezone user)
- Tất cả delete: **soft delete** (`IsDeleted = true`), không bao giờ hard delete
- Mọi entity đều có **Standard Audit Fields**: `Log_CreatedAt`, `Log_CreatedBy`, `Log_UpdatedAt`, `Log_UpdatedBy`, `IsDeleted`, `IsDisabled`, `OrderNo`, `Note`

**Cột Constraints — viết rõ:**
- Unique constraint: `Unique`
- FK: `FK → TableName`
- Enum/check: `"value1" | "value2" | "value3"`
- Giá trị mặc định: `Default: true`
- Giới hạn: `≥ 0`, `7–15 digits`
- Format: `IANA timezone`, `RFC format`, `ISO country name`

**Phân nhóm field trong cùng entity:**
Khi entity lớn (như User Profile), dùng sub-heading để nhóm:
```markdown
#### Personal Information
#### Work Schedule
#### HR-Only Fields (chỉ HR Admin được sửa)
```

### Bảng tổng hợp Auxiliary Entities

Với entity nhỏ/phụ trợ, gom vào 1 bảng tổng hợp:

```markdown
| Entity        | Key Fields               | Relationships                     |
|---------------|--------------------------|-----------------------------------|
| **Department** | `Id`, `CompanyId`, `Name` | One-to-many: Staff               |
| **Position**  | `Id`, `Code`, `Name`      | One-to-many: Staff (Staff.PositionId) |
```

---

## Section 6 — Data Flow / Table Impact

**Mục đích:** Mô tả cụ thể **server làm gì** ở mỗi API endpoint quan trọng — bảng nào đọc, bảng nào ghi, kèm ví dụ request/response JSON.

### Format

```markdown
### 6.1 Tạo User Mới

```
POST /api/users
    │
    ├─ Validate input (FirstName, Email required)
    ├─ Check duplicate: Email WHERE IsDeleted = false
    ├─ Auto-generate Username: Surname + FirstName[0] + Year[-2:]
    ├─ Hash password với bcrypt
    ├─ WRITE: INSERT UserLogin (Username, Email, PasswordHash, IsFirstLogin = true)
    └─ WRITE: INSERT Staff (UserLoginId, ...)
```

**Tables affected:** `UserLogin` (Insert), `Staff` (Insert)

**Example — Request:**
```json
{
  "firstName": "Nguyen",
  "email": "nguyen@company.com"
}
```

**Example — Response:**
```json
{
  "success": true,
  "data": { "id": "..." }
}
```
```

**Các flow cần có:**
- Login / Logout
- Tạo / Sửa entity chính
- Import hàng loạt (nếu có)
- Background job / Scheduled task (nếu có)
- Mỗi flow ghi rõ `Tables affected`

---

## Section 7 — Mockup / Wireframe

**Mục đích:** Mô tả bố cục UI ở dạng text ASCII hoặc link tới file thiết kế.

```markdown
## 7. MOCKUP / WIREFRAME

> Xem file thiết kế tại: [Link Figma / Zeplin / ...]
>
> Hoặc mô tả bằng ASCII:

### S01 — Trang Đăng Nhập

```
┌──────────────────────────────────┐
│           [Logo trái]  [Logo phải]│
│                                  │
│  ┌────────────────────────────┐  │
│  │ Username / Email           │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Password            [👁]   │  │
│  └────────────────────────────┘  │
│                                  │
│  [         Đăng nhập           ] │
│  Quên mật khẩu?                  │
└──────────────────────────────────┘
```
```

---

## Section 8 — Requirement Backlog

**Mục đích:** Ghi lại các yêu cầu đang chờ, đã từ chối, hoặc sẽ làm sau.

```markdown
## 8. REQUIREMENT BACKLOG

| ID   | Tên Tính Năng      | Mức Độ | Trạng Thái      | Ghi Chú                         |
|------|-------------------|--------|------------------|---------------------------------|
| F001 | Export PDF        | Medium | Planned (v2.0)   | Client yêu cầu — chưa ưu tiên  |
| F002 | Dark mode         | Low    | Rejected         | Out of scope                    |
| F003 | Multi-language    | High   | In Progress      | English + Vietnamese            |
```

**Trạng thái:** `Planned`, `In Progress`, `Done`, `Rejected`, `On Hold`
**Mức độ:** `Critical`, `High`, `Medium`, `Low`

---

## Section 9 — Error Handling

**Mục đích:** Định nghĩa các mã lỗi và thông báo lỗi chuẩn — để frontend hiển thị đúng và dev test được.

```markdown
## 9. ERROR HANDLING

| Mã Lỗi | HTTP | Mô Tả                                | Thông Báo Hiển Thị              |
|--------|------|---------------------------------------|---------------------------------|
| E001   | 401  | Sai username/email hoặc password     | "Thông tin đăng nhập không đúng" |
| E002   | 401  | Tài khoản bị vô hiệu hóa            | "Tài khoản đã bị khóa"         |
| E003   | 403  | Không có quyền truy cập              | "Bạn không có quyền thực hiện" |
| E004   | 409  | Email đã tồn tại                    | "Email này đã được sử dụng"    |
| E005   | 422  | Dữ liệu không hợp lệ                | Hiển thị lỗi inline trên field |
```

**Quy tắc:**
- Mã lỗi là hằng số — không thay đổi giữa các phiên bản
- Thông báo lỗi hướng tới người dùng cuối — không expose stack trace
- HTTP status code theo chuẩn REST

---

## Section 10 — Notification Catalog

**Mục đích:** Liệt kê tất cả thông báo hệ thống gửi cho user (email, in-app, push).

```markdown
## 10. NOTIFICATION CATALOG

| ID   | Kênh    | Trigger                       | Template / Nội Dung                    | Phân Quyền    |
|------|---------|-------------------------------|----------------------------------------|---------------|
| N001 | Email   | Tạo tài khoản mới             | Template: WELCOME                      | HR Admin      |
| N002 | In-App  | Nhân viên đi trễ              | "{Tên} đã đến lúc {giờ}"              | Manager       |
| N003 | Email   | OTP quên mật khẩu             | "Mã OTP của bạn là: {code}"           | System        |
```

**Kênh:** `Email`, `In-App`, `Push Notification`, `SMS`, `Webhook`

---

## Section 11 — System Menu

**Mục đích:** Mô tả cây menu của ứng dụng — nhóm các screen thành menu items theo vai trò.

```markdown
## 11. SYSTEM MENU

> Menu thay đổi theo vai trò. Mỗi role thấy một tập menu khác nhau.

### Menu — EMPLOYEE
- Dashboard (`/`)
- Lịch sử chấm công (`/attendance/history`)
- Hồ sơ cá nhân (`/profile`)

### Menu — ADMIN
- [Tất cả menu Employee]
- Quản lý nhân viên (`/employees`)
- Báo cáo (`/reports`)
- Cấu hình hệ thống (`/system/settings`)
```

---

## Checklist Trước Khi Giao Dev

Trước khi bắt đầu implementation, đảm bảo file REQUIREMENTS.md có đầy đủ:

- [ ] Tất cả screen đã có ID và route rõ ràng
- [ ] Permission matrix có đầy đủ role và module
- [ ] Data access rules (scope) đã được định nghĩa nếu có phân quyền dữ liệu
- [ ] Mỗi luồng nghiệp vụ chính đã có flow diagram
- [ ] Tất cả entity chính đã có bảng field đầy đủ kiểu dữ liệu và constraint
- [ ] Standard audit fields (`IsDeleted`, `CreatedAt`...) đã được áp dụng
- [ ] Mã lỗi quan trọng đã được liệt kê
- [ ] Business rules đặc biệt đã được highlight rõ (ví dụ: "không được bỏ qua bước này")

---

## Tips Thực Tế

### Viết Business Rules nổi bật

Dùng blockquote `>` hoặc **bold** để làm nổi bật rule quan trọng:

```markdown
> ⚠️ **KHÔNG THỂ BỎ QUA:** Nếu IsFirstLogin = true → bắt buộc đổi mật khẩu trước khi vào hệ thống.
> Không có đường tắt nào — API sẽ từ chối mọi request khác cho đến khi hoàn thành.
```

### Đánh dấu Field DEPRECATED

Khi thay đổi thiết kế data, đừng xóa field cũ ngay — đánh dấu và ghi lý do:

```markdown
| `ManagerId` | UUID | | ~~FK → Staff~~ ⚠️ **DEPRECATED** — dùng `ManagerMapping` table thay thế. Giữ lại để migrate. |
```

### Ghi rõ "Tại sao" cho quyết định thiết kế

```markdown
> **Lý do không dùng hard delete:** Yêu cầu audit trail — mọi dữ liệu đã xóa phải khôi phục được.
> **Lý do dùng UUID v7:** Sortable by time, index-friendly như integer nhưng không cần central sequence.
```

### Liên kết chéo giữa section

Khi một phần liên quan đến phần khác, ghi link markdown:
```markdown
Xem quy tắc phân quyền chi tiết tại [§3.3 Data Access Rules](#33-data-access-rules).
```

---

## Template Khung Rỗng

Copy đoạn sau để bắt đầu file mới:

```markdown
# {TÊN DỰ ÁN} — Yêu Cầu Hệ Thống

> **Cập nhật:** YYYY-MM-DD
> **Phiên bản:** 0.1.0
> **Ngôn ngữ:** Tiếng Việt

---

## 1. MỤC LỤC
- **2.** [Danh Sách Màn Hình](#2-screen-list)
- **3.** [Ma Trận Phân Quyền](#3-permission-matrix)
- **4.** [Luồng Người Dùng / Nghiệp Vụ](#4-user-flow--business-flow)
- **5.** [Danh Sách Field / Data Dictionary](#5-field-list--data-dictionary)
- **6.** [Luồng Dữ Liệu / Tác Động Bảng](#6-data-flow--table-impact)
- **7.** [Mockup / Wireframe](#7-mockup--wireframe)
- **8.** [Requirement Backlog](#8-requirement-backlog)
- **9.** [Error Handling](#9-error-handling)
- **10.** [Notification Catalog](#10-notification-catalog)
- **11.** [UI Grouping — System Menu](#11-ui-grouping--system-menu)

---

## 2. SCREEN LIST

### 2.1 Xác Thực

| ID | Tên Màn Hình | Route | Auth | Mô Tả |
|----|-------------|-------|------|-------|
| S01 | ... | ... | ... | ... |

---

## 3. PERMISSION MATRIX

### 3.1 Định Nghĩa Vai Trò

| Vai Trò | Mã | Mô Tả |
|---------|-----|-------|
| ... | ... | ... |

### 3.2 Ma Trận Quyền

#### Module Xác Thực

| Chức năng | ROLE_A | ROLE_B |
|-----------|--------|--------|
| ... | ✅ | ❌ |

---

## 4. USER FLOW / BUSINESS FLOW

### 4.1 Luồng Đăng Nhập

```
[S01]
    │
    └─ ...
```

---

## 5. FIELD LIST / DATA DICTIONARY

### 5.1 Entity: ...

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `Id` | UUID | ✅ | PK, UUIDv7 | Unique identifier |

---

## 6. DATA FLOW / TABLE IMPACT

### 6.1 ...

---

## 7. MOCKUP / WIREFRAME

---

## 8. REQUIREMENT BACKLOG

| ID | Tên Tính Năng | Mức Độ | Trạng Thái | Ghi Chú |
|----|--------------|--------|-----------|---------|

---

## 9. ERROR HANDLING

| Mã Lỗi | HTTP | Mô Tả | Thông Báo Hiển Thị |
|--------|------|-------|-------------------|

---

## 10. NOTIFICATION CATALOG

| ID | Kênh | Trigger | Nội Dung | Phân Quyền |
|----|------|---------|---------|-----------|

---

## 11. UI GROUPING — SYSTEM MENU

### Menu — {ROLE_A}
- ...
```
