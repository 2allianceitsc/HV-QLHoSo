# BA Doc — Phân Quyền Duyệt Tờ Trình Theo Loại Chi Phí

> **Phiên bản:** 1.2
> **Ngày tạo:** 2026-05-15
> **Cập nhật lần cuối:** 2026-06-04
> **Trạng thái:** Đề xuất — chờ phê duyệt
> **Liên quan:** `requirements.md` §2.2 (Tờ trình), `From Clients/Giao diện web tờ trình.xlsx`, ma trận phân quyền do khách HV gửi 2026-05-15
>
> **Lịch sử thay đổi:**
>
> | Phiên bản | Ngày | Nội dung |
> |---|---|---|
> | 1.0 | 2026-05-15 | Khởi tạo |
> | 1.2 | 2026-06-04 | Bổ sung phân quyền duyệt NT theo bộ phận tờ trình |

---

## 1. BỐI CẢNH & VẤN ĐỀ

### 1.1 Hiện trạng
Model `ApprovalConfig` đang gắn theo `Department`, mỗi bộ phận chỉ có **1 reviewer + 1 approver** duy nhất. Mỗi `Submission` mang sẵn `reviewerId` + `approverId` được copy từ config khi tạo.

### 1.2 Yêu cầu mới từ khách (ma trận Excel)
Khách HV cung cấp bảng phân quyền chi tiết — 13 loại chi phí (CostCode) × 7 nhân sự, với 4 chiều phân quyền hệ thống hiện **chưa hỗ trợ**:

| Chiều phân quyền | Ví dụ | Hỗ trợ hiện tại |
|---|---|---|
| Theo **loại chi phí** (CostCode) | Mỗi cost code có flow duyệt riêng | ❌ |
| **Nhiều bước thẩm định** | TT5 (Chi phí vật tư): "thẩm định bước 1" → "thẩm định bước 2" → "Phê duyệt" | ❌ Chỉ 1 bước reviewer |
| **Routing theo ngưỡng tiền** | TT7: <2tr → Tài; ≥2tr → Hà My. TT12: <15tr / <50tr / ≥50tr | ❌ |
| **Nhiều người cùng 1 role** | TT5: 2 người cùng "thẩm định bước 2" | ❌ Quan hệ 1-1 |
| **Routing theo bộ phận tờ trình (NT)** | NT: Bộ phận A → người duyệt X; Bộ phận B → người duyệt Y | ❌ |

### 1.3 Mục tiêu
Refactor cơ chế phân quyền duyệt từ "per-department" sang **rule-engine per-cost-code**, hỗ trợ multi-step, threshold routing, multi-approver per step, và (riêng với NT) routing theo bộ phận tờ trình.

---

## 2. PHẠM VI

### 2.1 Trong phạm vi
- Model dữ liệu mới: `CostCodeApprovalRule`, `SubmissionApprovalStep`.
- Ràng buộc mới: **1 tờ trình = 1 CostCode** (đơn giản hóa routing theo tổng tiền).
- Engine resolve workflow tại thời điểm submit (snapshot).
- Màn hình admin: `/admin/approval-rules` (2 view: matrix + form).
- Thay đổi UI tạo tờ trình: chọn CostCode trước, các ExpenseLine bị ràng buộc cùng CostCode.
- Thay đổi UI chi tiết tờ trình: timeline các step duyệt.
- Audit log cho việc sửa rule (dùng `Log_CreatedBy/UpdatedBy` sẵn có).

### 2.2 Ngoài phạm vi (phase sau)
- Ủy quyền (delegate) khi người duyệt vắng — phase này **treo step**, không có cơ chế ủy quyền.
- Default fallback approver khi không khớp rule — phase này **reject submit**.
- Migration dữ liệu cũ — hệ thống chưa go-live, **xóa tay** các tờ trình test cũ trước khi triển khai.
- Notification thông minh hơn (escalation, nhắc nhở quá hạn).

---

## 3. THUẬT NGỮ

| Thuật ngữ | Định nghĩa |
|---|---|
| **CostCode** | Mã loại chi phí (đã có), ví dụ "Chi phí công tác", "Chi phí vật tư". |
| **Approval Rule** | Một dòng cấu hình: với CostCode X, ngưỡng tiền Y, step Z → ai duyệt. |
| **Step** | Một bước trong flow duyệt; mỗi step có `stepOrder` (thứ tự tuần tự) + `stepType` (REVIEW/APPROVE). |
| **Mode (ANY/ALL)** | Khi 1 step có nhiều người: `ANY` = ai duyệt trước cũng pass; `ALL` = tất cả phải duyệt. |
| **Ngưỡng (threshold)** | Khoảng tiền `[minAmount, maxAmount)` mà rule áp dụng. `null` = vô cực. |
| **Plan duyệt (snapshot)** | Danh sách step + người duyệt cụ thể, được "đóng băng" vào DB lúc submit. |
| **Bộ phận tờ trình** | `Department` của tờ trình (lấy từ bộ phận của người tạo tờ trình tại thời điểm submit). Dùng để route người duyệt ở các step của tờ trình Nguyên tắc (NT). |

---

## 4. QUYẾT ĐỊNH THIẾT KẾ ĐÃ CHỐT

| # | Quyết định | Lý do |
|---|---|---|
| D1 | UI admin **matrix view (read-only) + form view (edit)** | Matrix dễ đối chiếu file Excel khách; form dễ nhập rule phức tạp |
| D2 | Mode `ANY`/`ALL` cấu hình **trên từng rule** (field `mode`) | Linh hoạt — ảnh khách gửi không nói rõ logic, để admin tự quyết |
| D3 | Ngưỡng tính trên **tổng tiền cả tờ trình** | Đơn giản hơn so với per-line, đủ chính xác vì **mỗi tờ trình chỉ 1 CostCode** |
| D4 | **1 tờ trình = 1 CostCode** | Hệ quả của D3. UI bắt chọn CostCode ở step 1 trước khi nhập line. |
| D5 | **Không** fallback approver — reject submit nếu không có rule khớp | Đảm bảo admin phải cấu hình đầy đủ, tránh "rò" tờ trình ra ngoài flow |
| D6 | **Treo step** khi người duyệt vắng. **Admin có quyền sửa `approverId`** của step `in_progress` để chuyển sang người khác (delegate thủ công), hệ thống notify approver mới. | Đáp ứng tình huống thực tế khi approver vắng dài; vẫn giữ tính chủ động ở phía admin (không auto-delegate). |
| D7 | **Audit** sửa rule qua `Log_*` columns sẵn có | Đã có sẵn cơ chế, không cần build mới |
| D8 | **Chỉ role `admin`** sửa được rule | Khớp với phân quyền hệ thống hiện tại |
| D9 | **Xóa tay** tờ trình cũ, không cần migration | Hệ thống chưa go-live, dữ liệu test |
| D10 | Plan duyệt **snapshot lúc submit** | Tránh trường hợp rule đổi giữa chừng làm tờ trình "đi lạc" |
| D11 | **NT detail có thể gắn `departmentId`** (nullable). `null` = áp dụng cho mọi bộ phận (fallback). Nhiều detail cùng `stepOrder` nhưng khác `departmentId` = routing theo bộ phận. Tại thời điểm resolve, ưu tiên detail có `departmentId` khớp trước, nếu không có thì dùng detail `departmentId = null`. Nếu không có cả fallback → reject submit (tương tự D5). | Đáp ứng yêu cầu mỗi bộ phận có người duyệt NT riêng. Dùng cùng cơ chế detail-per-row, không cần bảng mới. |

---

## 5. MODEL DỮ LIỆU

### 5.1 Bảng mới: `CostCodeApprovalRule` (header) + `CostCodeApprovalRuleDetail` (lines)

Tách header/detail để **group rule theo cost code + loại tờ trình**, hỗ trợ 2 use case:
- **Mua sắm (MS):** rule gắn cost code cụ thể, có ngưỡng tiền.
- **Nguyên tắc (NT):** rule **không** gắn cost code (`costCodeId = null`), chỉ có cấp duyệt, không ngưỡng tiền.

```prisma
model CostCodeApprovalRule {
  id             String  @id
  submissionType String  @map("SubmissionType")   // "MS" | "NT"
  costCodeId     String? @map("CostCodeId")       // NULL khi submissionType = "NT"
  name           String? @map("Name")             // tên gợi nhớ, vd "Flow vật tư tiêu hao"
  isActive       Boolean @default(true) @map("IsActive")

  // Audit
  isDeleted    Boolean  @default(false) @map("IsDeleted")
  logCreatedAt DateTime @default(now()) @map("Log_CreatedAt") @db.Timestamptz
  logCreatedBy String?  @map("Log_CreatedBy")
  logUpdatedAt DateTime @updatedAt @map("Log_UpdatedAt") @db.Timestamptz
  logUpdatedBy String?  @map("Log_UpdatedBy")

  costCode CostCode? @relation(fields: [costCodeId], references: [id])
  details  CostCodeApprovalRuleDetail[]

  // 1 cost code chỉ có 1 rule MS active; 1 rule NT global active (costCodeId NULL).
  @@unique([submissionType, costCodeId])
  @@index([submissionType, isActive, isDeleted])
  @@map("CostCodeApprovalRule")
}

model CostCodeApprovalRuleDetail {
  id           String  @id
  ruleId       String  @map("RuleId")
  stepOrder    Int     @map("StepOrder")            // 1, 2, 3...
  stepType     String  @map("StepType")             // "REVIEW" | "APPROVE"
  stepLabel    String? @map("StepLabel")            // "Thẩm định bước 1", "Phê duyệt"...
  minAmount    BigInt? @map("MinAmount")            // NULL = -∞ — luôn NULL khi rule.submissionType = "NT"
  maxAmount    BigInt? @map("MaxAmount")            // NULL = +∞ — luôn NULL khi rule.submissionType = "NT"
  approverId   String  @map("ApproverId")
  mode         String  @default("ANY") @map("Mode") // "ANY" | "ALL"
  // Chỉ dùng cho NT: NULL = áp dụng mọi bộ phận (fallback); có giá trị = chỉ áp dụng khi tờ trình thuộc bộ phận đó.
  // Với MS luôn phải NULL (API reject nếu client gửi giá trị).
  departmentId String? @map("DepartmentId")

  // Audit
  isDeleted    Boolean  @default(false) @map("IsDeleted")
  logCreatedAt DateTime @default(now()) @map("Log_CreatedAt") @db.Timestamptz
  logCreatedBy String?  @map("Log_CreatedBy")
  logUpdatedAt DateTime @updatedAt @map("Log_UpdatedAt") @db.Timestamptz
  logUpdatedBy String?  @map("Log_UpdatedBy")

  rule       CostCodeApprovalRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  approver   Staff                @relation(fields: [approverId], references: [id])
  department Department?          @relation(fields: [departmentId], references: [id])

  @@index([ruleId, stepOrder, isDeleted])
  @@map("CostCodeApprovalRuleDetail")
}
```

**Semantic ngưỡng (chỉ áp dụng với MS):** detail áp dụng khi `total ∈ [minAmount, maxAmount)` — `min` inclusive, `max` exclusive. Để biểu diễn "≥2tr" thì `min=2_000_000, max=null`.

**Với NT:** `costCodeId` của header là `null`, tất cả `minAmount`/`maxAmount` của detail là `null`. Chuỗi step + approver, có thể kèm `departmentId` để route theo bộ phận. Validation DTO phải enforce: `minAmount`/`maxAmount` phải null; `departmentId` chỉ hợp lệ khi `rule.submissionType = "NT"`.

### 5.2 Bảng mới: `SubmissionApprovalStep`

```prisma
model SubmissionApprovalStep {
  id                 String   @id
  submissionId       String   @map("SubmissionId")
  stepOrder          Int      @map("StepOrder")
  stepType           String   @map("StepType")             // "REVIEW" | "APPROVE"
  stepLabel          String?  @map("StepLabel")
  approverId         String   @map("ApproverId")           // có thể bị admin đổi sau khi snapshot
  originalApproverId String   @map("OriginalApproverId")   // approver lúc snapshot — bất biến, dùng để audit
  mode               String   @map("Mode")                 // "ANY" | "ALL"
  status             String   @default("pending") @map("Status")
  // status: "pending" | "in_progress" | "approved" | "rejected" | "skipped"
  decidedAt          DateTime? @map("DecidedAt") @db.Timestamptz
  decidedBy          String?  @map("DecidedBy")            // = approverId khi tự duyệt
  comment            String?  @map("Comment") @db.Text

  // Audit khi admin đổi approver
  reassignedAt       DateTime? @map("ReassignedAt") @db.Timestamptz
  reassignedBy       String?   @map("ReassignedBy")        // admin staffId
  reassignReason     String?   @map("ReassignReason") @db.Text

  logCreatedAt       DateTime @default(now()) @map("Log_CreatedAt") @db.Timestamptz

  submission       Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  approver         Staff      @relation("StepApprover", fields: [approverId], references: [id])
  originalApprover Staff      @relation("StepOriginalApprover", fields: [originalApproverId], references: [id])

  @@index([submissionId, stepOrder])
  @@index([approverId, status])
  @@map("SubmissionApprovalStep")
}
```

### 5.3 Thay đổi bảng `Submission`

- **Thêm:** `costCodeId String @map("CostCodeId")` — NOT NULL.
- **Bỏ:** `reviewerId`, `approverId` — không còn 1-1 nữa, lấy từ `SubmissionApprovalStep`.
- **Giữ nguyên:** `status` (`draft`/`pending_review`/`in_review`/`approved`/`rejected`) — semantics điều chỉnh:
  - `pending_review`: vừa submit, chờ step đầu tiên xử lý.
  - `in_review`: ≥1 step REVIEW đã pass, chưa tới APPROVE cuối.
  - `approved`: step APPROVE cuối cùng đã pass.
  - `rejected`: bất kỳ step nào reject → toàn bộ tờ trình reject.

### 5.4 Thay đổi bảng `ExpenseLine`
- DB constraint: tất cả `ExpenseLine.costCodeId` thuộc cùng 1 `Submission` phải bằng `Submission.costCodeId`. Enforce ở DTO validation + (optional) DB CHECK trigger.

### 5.5 Deprecate `ApprovalConfig`
- Bảng cũ giữ lại 1 release để rollback, sau đó drop. Migration mới **không** sinh insert vào bảng này.

---

## 6. RUNTIME — RESOLVE WORKFLOW

### 6.1 Khi submit tờ trình (status `draft` → `pending_review`)

```
1. Lookup rule header:
   IF submission.type = "MS":
     rule = SELECT * FROM CostCodeApprovalRule
            WHERE submissionType='MS' AND costCodeId=submission.costCodeId
              AND isActive=true AND isDeleted=false
     total = SUM(submission.expenseLines.amountIncVat)
   ELSE (submission.type = "NT"):
     rule = SELECT * FROM CostCodeApprovalRule
            WHERE submissionType='NT' AND costCodeId IS NULL
              AND isActive=true AND isDeleted=false
     total = NULL         // không xét ngưỡng
     dept  = submission.submitter.departmentId

2. IF rule IS NULL:
     → REJECT submit (HTTP 422). Message MS: "Chưa có cấu hình duyệt cho loại chi phí X."
                                  Message NT: "Chưa có cấu hình duyệt cho tờ trình Nguyên tắc."

3. Lookup details:
   IF type = "MS":
     matches = SELECT * FROM CostCodeApprovalRuleDetail
               WHERE ruleId=rule.id AND isDeleted=false
                 AND (minAmount IS NULL OR total >= minAmount)
                 AND (maxAmount IS NULL OR total < maxAmount)
   ELSE:
     // Ưu tiên detail có departmentId khớp; fallback về detail departmentId IS NULL.
     // Nếu 1 stepOrder có cả detail khớp dept VÀ detail fallback → chỉ lấy detail khớp dept.
     specific  = SELECT * FROM CostCodeApprovalRuleDetail
                 WHERE ruleId=rule.id AND isDeleted=false AND departmentId=dept
     fallback  = SELECT * FROM CostCodeApprovalRuleDetail
                 WHERE ruleId=rule.id AND isDeleted=false AND departmentId IS NULL
     // Với mỗi stepOrder: nếu có ≥1 dòng specific → dùng specific; ngược lại dùng fallback.
     matches = MERGE(specific, fallback) theo logic ưu tiên trên

4. IF matches IS EMPTY:
     → REJECT, message MS: "Chưa có cấu hình duyệt cho cost code X tại mức tiền Y."
5. IF không có detail stepType='APPROVE' trong matches:
     → REJECT, message: "Cấu hình thiếu bước Phê duyệt."
6. groups = matches GROUP BY stepOrder
7. FOR EACH group (theo stepOrder tăng dần):
     FOR EACH detail trong group:
       INSERT SubmissionApprovalStep {
         submissionId, stepOrder, stepType, stepLabel,
         approverId, mode, status='pending'
       }
8. UPDATE Submission.status = 'pending_review'
9. Active step = step có stepOrder nhỏ nhất → set status='in_progress'
10. Notify approver(s) của active step
```

### 6.2 Khi 1 approver bấm "Duyệt" trên 1 step

```
1. Validate: user.staffId == step.approverId AND step.status == 'in_progress'
2. UPDATE step SET status='approved', decidedAt=now(), decidedBy=user.staffId, comment=...
3. Check group (cùng stepOrder):
   - mode='ANY': nếu 1 step approved → các step còn lại trong group set status='skipped'
   - mode='ALL': nếu còn step status != 'approved' → group chưa xong, dừng
4. Nếu group xong:
   - Tìm group kế tiếp (stepOrder lớn hơn gần nhất) → set status='in_progress', notify
   - Nếu hết group → UPDATE Submission.status='approved', approvedAt=now()
```

### 6.3 Khi 1 approver bấm "Từ chối"

```
1. Validate tương tự
2. UPDATE step SET status='rejected', decidedAt, decidedBy, comment (bắt buộc)
3. Các step còn lại của tờ trình SET status='skipped'
4. UPDATE Submission.status='rejected', rejectionReason = step.comment
5. Notify submitter
```

### 6.4 "Treo step" khi approver vắng — admin reassign

- Mặc định: không có hành động tự động. Step giữ `status='in_progress'` chờ approver xử lý.
- **Admin có quyền đổi `approverId`** của step (`status` ∈ `pending` | `in_progress`):

```
1. Validate: actor có role='admin', step.status ∈ {pending, in_progress},
             newApproverId != current approverId,
             newApproverId tồn tại + not deleted,
             reason không rỗng.
2. UPDATE step SET
     approverId = newApproverId,
     reassignedAt = now(),
     reassignedBy = actor.staffId,
     reassignReason = reason
   (giữ nguyên originalApproverId)
3. Notify approver mới (email + in-app):
     - Nếu step đang `in_progress`: "Bạn vừa được phân công duyệt tờ trình X (do admin Y chuyển từ Z, lý do: ...)"
     - Nếu step `pending`: chỉ in-app, sẽ notify email khi step active.
4. Notify approver cũ (optional, in-app): "Step X của tờ trình Y đã được chuyển sang Z."
5. Ghi log vào SubmissionLog (audit trail).
```

- Không cho reassign khi step đã `approved` | `rejected` | `skipped`.
- Mode `ALL` với nhiều người trong group: reassign 1 detail row, các row khác giữ nguyên.

---

## 7. UI / UX

### 7.1 Màn hình admin `/admin/approval-rules` (mới — S-NEW-01)

**Auth:** `admin` only.

Màn hình có **2 tab cấp 1: "Mua sắm" và "Nguyên tắc"**, ứng với 2 giá trị `submissionType` của header rule.

---

#### Tab 1 — **Mua sắm** (`submissionType = "MS"`)

Có 2 sub-tab:

**Sub-tab "Tổng quan" (matrix, read-only):**
- Bảng pivot: hàng = CostCode, cột = Staff (chỉ list staff có ≥1 detail).
- Mỗi ô: `<stepLabel>` + badge ngưỡng (vd "PD <2tr").
- Highlight ô có nhiều detail (multi-threshold).
- Nút "Export Excel" để gửi lại khách đối chiếu.

**Sub-tab "Chi tiết theo Cost Code":**
- Sidebar trái: tree CostCode (group theo Department). Icon ✅ nếu đã có rule, ⚠️ nếu chưa.
- Panel phải khi chọn CostCode X:
  - Header rule: tên gợi nhớ (`name`), toggle `isActive`.
  - List step (detail) theo `stepOrder` tăng dần.
  - Mỗi step: card có:
    - Label (vd "Thẩm định bước 1") — sửa được.
    - List detail trong step: rows `[Người duyệt] [Min] [Max] [Mode]`.
    - Button "+ Thêm detail (ngưỡng khác)" → thêm row mới cùng `stepOrder`.
    - Button "Xóa step" (chỉ enable khi không có submission đang chạy).
  - Button "+ Thêm step" cuối list.
- Validation real-time:
  - Ngưỡng overlap trong cùng `stepOrder` → red border.
  - CostCode không có step APPROVE → warning banner.
  - Có "khoảng hở" ngưỡng → warning + nút "Thêm detail cho khoảng còn lại".

---

#### Tab 2 — **Nguyên tắc** (`submissionType = "NT"`)

- **Chỉ 1 rule duy nhất, global** (`costCodeId = null`). Không cần tree CostCode, không cần matrix.
- Layout = single page form:
  - Header: tên rule (`name`), toggle `isActive`.
  - List step theo `stepOrder` tăng dần.
  - Mỗi step: card có:
    - Label.
    - List detail: rows `[Bộ phận] [Người duyệt] [Mode]` — **không có field Min/Max** (UI ẩn hoàn toàn).
      - Cột **Bộ phận**: dropdown chọn department (có search) hoặc chọn "Tất cả bộ phận" (= `departmentId = null`, hiển thị đầu danh sách dạng mục riêng, tô xám nhẹ để phân biệt với các dòng specific).
    - Button "+ Thêm dòng phân quyền" → thêm detail mới cùng `stepOrder` (có thể cùng hoặc khác bộ phận).
    - Button "Xóa step".
  - Button "+ Thêm cấp duyệt" cuối list.
- Validation real-time:
  - Phải có ≥1 step `APPROVE`.
  - Không cho nhập Min/Max (API reject nếu client cố gửi).
  - Cùng `stepOrder` + cùng `departmentId` + cùng `approverId` → duplicate, highlight đỏ.
  - Warning nếu 1 step không có dòng fallback (`departmentId = null`) và không có dòng cho tất cả bộ phận → tờ trình từ bộ phận chưa cấu hình sẽ bị reject submit.

### 7.2 Màn hình tạo tờ trình S06 (sửa)

- **Step 1 (mới):** chọn `CostCode` — required, dropdown có search.
  - Sau khi chọn, hiển thị preview: "Tờ trình này sẽ qua N bước duyệt (...)" — call API resolve preview với amount=0 để xem các step không phụ thuộc ngưỡng.
  - Nếu cost code chưa có rule → disable nút "Tiếp tục", show link liên hệ admin.
- **Step 2:** nhập các `ExpenseLine` — field `costCodeId` của mỗi line **disable + auto-fill** giá trị ở step 1.
- **Đổi CostCode sau khi đã nhập line:** confirm dialog "Đổi loại chi phí sẽ xóa các dòng đang nhập. Tiếp tục?".

### 7.3 Màn hình chi tiết tờ trình S07 (sửa)

- Panel "Lịch sử duyệt" thay bằng **Timeline các step**:
  ```
  ✅ Thẩm định bước 1 — Dương Thị Gấn — 2026-05-14 10:23 — "OK"
  ✅ Thẩm định bước 2 — Dương Hà My (ANY) — 2026-05-14 11:05 — "OK"
     ↳ skipped: Dương Thị Gấn (vì ANY)
  ⏳ Phê duyệt — Trần Thị Hồng Nhung ⚠️ (đã chuyển từ Dương Văn Hồng bởi admin Nhung, lý do: "vắng dài hạn") — đang chờ
  ```
- Nút "Duyệt" / "Từ chối" chỉ hiển thị với approver hiện tại (`approverId`) của step `in_progress`.
- **Nút "Đổi người duyệt"** chỉ hiển thị với role `admin`, trên các step có `status` ∈ `pending` | `in_progress`:
  - Mở dialog: dropdown chọn approver mới (loại trừ người hiện tại) + ô lý do (required).
  - Confirm → gọi API reassign → reload timeline.
  - Hiển thị warning badge "⚠️ đã chuyển từ {originalApprover}" nếu `reassignedAt != null`.

### 7.4 Notification
- Khi step chuyển `in_progress` → email + in-app notify approver(s) hiện tại của step.
- Khi submit reject → notify submitter + lý do.
- Khi approved cuối → notify submitter + tất cả người đã duyệt.
- **Khi admin reassign approver:**
  - Approver mới: email + in-app — *"Bạn vừa được phân công duyệt tờ trình {code} (do admin {tên} chuyển từ {tên cũ}, lý do: {reason})."* — gửi ngay nếu step đang `in_progress`; nếu step còn `pending` thì chỉ in-app, email sẽ gửi khi step active.
  - Approver cũ (in-app only): *"Bước duyệt của bạn trên tờ trình {code} đã được chuyển sang {tên mới}."*

---

## 8. API SPEC (CHANGES)

### 8.1 Endpoints mới

| Method | Route | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/approval-rules?submissionType=MS&costCodeId=` | admin | Lấy header + details. Với NT thì bỏ `costCodeId`. |
| `GET` | `/api/approval-rules/matrix?submissionType=MS` | admin | Trả pivot data cho matrix view (chỉ MS). |
| `POST` | `/api/approval-rules` | admin | Tạo header rule mới `{submissionType, costCodeId?, name?}`. |
| `PATCH` | `/api/approval-rules/:id` | admin | Sửa header (name, isActive). |
| `DELETE` | `/api/approval-rules/:id` | admin | Soft-delete header + cascade details. |
| `POST` | `/api/approval-rules/:id/details` | admin | Thêm detail vào rule. |
| `PATCH` | `/api/approval-rule-details/:id` | admin | Sửa detail. |
| `DELETE` | `/api/approval-rule-details/:id` | admin | Soft-delete detail. |
| `POST` | `/api/approval-rules/preview` | any auth | Resolve plan cho `{submissionType, costCodeId?, total?}` — dùng ở UI tạo tờ trình. |

### 8.2 Endpoints sửa

| Endpoint | Thay đổi |
|---|---|
| `POST /api/submissions` | Body thêm `costCodeId` (required). Sau khi tạo & submit → resolve workflow, snapshot step. |
| `GET /api/submissions/:id` | Response thêm field `approvalSteps: SubmissionApprovalStep[]`. Bỏ `reviewerId`, `approverId`. |
| `POST /api/submissions/:id/approve` | Body: `{ stepId, comment? }`. Validate user là approver của step. |
| `POST /api/submissions/:id/reject` | Body: `{ stepId, comment }` (comment required). |
| `PATCH /api/submissions/:id/steps/:stepId/reassign` | **Admin only**. Body: `{ newApproverId, reason }` (cả 2 required). Đổi `approverId` của step (chỉ khi status ∈ pending/in_progress), ghi audit, notify approver mới. |

### 8.3 Validation rules (DTO)

**`CreateApprovalRuleDto` (header):**
- `submissionType`: enum `MS`|`NT`.
- `costCodeId`: REQUIRED + existing nếu type `MS`; phải NULL nếu type `NT`.
- `name`: optional, max 255.
- Unique check: `(submissionType, costCodeId)` chưa tồn tại (kể cả `costCodeId=NULL` với NT — tối đa 1 rule NT active).

**`CreateApprovalRuleDetailDto`:**
- `ruleId`: existing header, not deleted.
- `stepOrder`: int ≥ 1.
- `stepType`: enum `REVIEW`|`APPROVE`.
- `minAmount`, `maxAmount`: bigint ≥ 0, `min < max` nếu cả 2 đều có. **Phải NULL khi rule header là NT.**
- `approverId`: existing Staff, không deleted.
- `mode`: enum `ANY`|`ALL`.
- `departmentId`: optional. **Chỉ hợp lệ khi rule header là NT** — API reject nếu gửi `departmentId` cho rule MS. Nếu có, phải là existing Department, không deleted.
- **Cross-detail check (MS only):** không overlap với detail khác cùng `(ruleId, stepOrder)`. Cụ thể: 2 khoảng `[min1, max1)` và `[min2, max2)` không được giao nhau (trừ khi cùng người + cùng mode — coi như duplicate, reject).
- **Cross-detail check (NT only):** không cho duplicate `(ruleId, stepOrder, departmentId, approverId)` — cùng bộ phận + cùng người + cùng bước là thừa.

---

## 9. ACCEPTANCE CRITERIA (USER STORIES)

### US-01 — Admin cấu hình rule cho 1 cost code
**Là** admin, **tôi muốn** cấu hình rule duyệt cho cost code "Chi phí công tác", **để** các tờ trình loại này được route đúng người duyệt theo ngưỡng tiền.

**AC:**
- [ ] Truy cập `/admin/approval-rules`, chọn "Chi phí công tác" → thấy form trống.
- [ ] Thêm step 1 "Thẩm định" → chọn Dương Thị Gấn, mode=ANY, không ngưỡng → save thành công.
- [ ] Thêm step 2 "Phê duyệt" → 2 rule: `[null, 2_000_000)` Trương Văn Tài và `[2_000_000, null)` Dương Hà My → save thành công.
- [ ] Cố tình tạo rule overlap (`[null, 3_000_000)` và `[2_000_000, null)`) → toast error, không save.
- [ ] Mở tab "Tổng quan" → thấy ô của Tài hiển thị "PD <2tr", ô của Hà My hiển thị "PD ≥2tr".

### US-02 — Submitter tạo tờ trình cho cost code có rule
**Là** nhân viên, **tôi muốn** tạo tờ trình mua sắm cho "Chi phí công tác" với tổng 1.5tr, **để** hệ thống tự route đến Tài duyệt.

**AC:**
- [ ] Form tạo tờ trình: chọn cost code "Chi phí công tác" → preview hiện "2 bước: Thẩm định (Gấn) → Phê duyệt (theo ngưỡng)".
- [ ] Nhập line 1.5tr, submit → status `pending_review`.
- [ ] Chi tiết tờ trình: thấy 2 step được tạo, step "Thẩm định" `in_progress` cho Gấn.
- [ ] Gấn nhận notify email + in-app.

### US-03 — Resolve theo ngưỡng đúng người
**AC:**
- [ ] Tờ trình total 1.999.999đ → step Phê duyệt route đến Tài (rule `<2tr`).
- [ ] Tờ trình total 2.000.000đ → step Phê duyệt route đến Hà My (rule `≥2tr`).
- [ ] Tờ trình total 0đ (chỉ có line miễn phí, edge) → vẫn route theo rule có `minAmount=null`.

### US-04 — Multi-approver ANY
**AC:**
- [ ] Step "Thẩm định bước 2" của TT5 có 2 người (Gấn + Hà My) mode=ANY.
- [ ] Gấn duyệt trước → step approved, step của Hà My set `skipped`.
- [ ] Flow đi tiếp đến step kế tiếp.

### US-05 — Multi-approver ALL
**AC:**
- [ ] Cấu hình 1 step mode=ALL có 2 người A và B.
- [ ] A duyệt → step vẫn `in_progress`, B vẫn thấy nút "Duyệt".
- [ ] B duyệt → step approved, flow tiếp.
- [ ] A từ chối → toàn tờ trình reject ngay (không chờ B).

### US-06 — Reject submit khi không có rule khớp
**AC:**
- [ ] Cost code "Chi phí bản quyền" chỉ có rule cho `[null, 50tr)`.
- [ ] Submitter tạo tờ trình total 60tr → bấm submit → HTTP 422, message tiếng Việt rõ ràng.
- [ ] Tờ trình vẫn ở status `draft`, không vào pending_review.

### US-07 — Treo step khi approver vắng & admin reassign

**Là** admin, **tôi muốn** đổi người duyệt của 1 step khi approver gốc vắng dài hạn, **để** tờ trình không bị kẹt.

**AC:**
- [ ] Step `in_progress` của approver Hồng (đang vắng) → admin Nhung mở chi tiết tờ trình.
- [ ] Admin thấy nút "Đổi người duyệt" trên step `in_progress` (role khác không thấy).
- [ ] Click → dialog: chọn approver mới (dropdown loại trừ Hồng) + ô "Lý do" (required, ≥10 ký tự).
- [ ] Submit thành công → step có `approverId=mới`, `originalApproverId=Hồng` (không đổi), `reassignedBy=Nhung`, `reassignedAt`, `reassignReason`.
- [ ] Approver mới nhận email + in-app notify ngay (vì step đang `in_progress`).
- [ ] Approver cũ (Hồng) nhận in-app notify khi đăng nhập lại.
- [ ] Timeline hiển thị badge "⚠️ đã chuyển từ Hồng" với tooltip lý do.
- [ ] Approver mới duyệt → step pass bình thường.
- [ ] Reassign step `approved`/`rejected`/`skipped` → API trả 400.
- [ ] Reassign sang chính approver hiện tại → API trả 400.
- [ ] Approver gốc đăng nhập sau khi đã bị reassign → KHÔNG thấy nút duyệt (vì `approverId` đã đổi).

### US-11 — Admin cấu hình NT với routing theo bộ phận

**Là** admin, **tôi muốn** cấu hình tờ trình Nguyên tắc sao cho mỗi bộ phận có người duyệt riêng, **để** tờ trình NT của từng bộ phận đi đúng người phụ trách.

**AC:**
- [ ] Tab "Nguyên tắc" → step "Phê duyệt" → thêm dòng: Bộ phận = "Kinh doanh", Người duyệt = Hà My, Mode = ANY → save thành công.
- [ ] Thêm tiếp dòng fallback: Bộ phận = "Tất cả bộ phận" (departmentId = null), Người duyệt = Hồng Nhung, Mode = ANY → save thành công.
- [ ] Nhân viên bộ phận Kinh doanh submit NT → step Phê duyệt route đến Hà My.
- [ ] Nhân viên bộ phận Kế toán (không có dòng specific) submit NT → step Phê duyệt route đến Hồng Nhung (fallback).
- [ ] Xóa dòng fallback, nhân viên bộ phận Kế toán submit NT → HTTP 422 "Chưa có cấu hình duyệt cho bộ phận Kế toán."
- [ ] Cố thêm dòng duplicate (cùng bộ phận + cùng người + cùng bước) → toast error, không save.
- [ ] UI hiển thị warning nếu step không có dòng fallback: "Bộ phận chưa được cấu hình sẽ không thể submit tờ trình."
- [ ] Admin cố gửi `departmentId` cho rule MS → API trả 400.

### US-08 — Audit khi sửa rule
**AC:**
- [ ] Admin A tạo rule lúc T1 → `Log_CreatedBy=A`, `Log_CreatedAt=T1`.
- [ ] Admin B sửa rule lúc T2 → `Log_UpdatedBy=B`, `Log_UpdatedAt=T2`.
- [ ] Soft-delete: `isDeleted=true`, không xóa cứng → có thể trace lịch sử.

### US-09 — Snapshot bảo toàn khi rule đổi giữa chừng
**AC:**
- [ ] Tờ trình X submit lúc T1 với rule cũ → snapshot `SubmissionApprovalStep`.
- [ ] Admin sửa rule lúc T2.
- [ ] Approver duyệt tờ trình X lúc T3 → vẫn theo plan cũ (snapshot không đổi).
- [ ] Tờ trình Y submit lúc T4 → theo rule mới.

### US-10 — Bắt buộc 1 cost code per tờ trình
**AC:**
- [ ] UI: dropdown cost code ở line bị disable, auto-fill giá trị từ submission.
- [ ] API: nếu request có line với costCodeId ≠ submission.costCodeId → HTTP 400.
- [ ] Đổi cost code trên submission đã có line → confirm xóa line.

---

## 10. ERROR HANDLING

| Mã lỗi | Tình huống | Message tiếng Việt |
|---|---|---|
| `RULE_NOT_FOUND` | Submit nhưng không có rule khớp ngưỡng | "Chưa có cấu hình duyệt cho loại chi phí *{costCode}* ở mức *{total}*. Vui lòng liên hệ admin." |
| `RULE_MISSING_APPROVE` | Có rule REVIEW nhưng thiếu APPROVE | "Cấu hình duyệt cho *{costCode}* thiếu bước Phê duyệt. Liên hệ admin." |
| `RULE_OVERLAP` | Admin tạo rule có ngưỡng overlap | "Ngưỡng *{min}–{max}* trùng với rule khác trong cùng bước." |
| `RULE_GAP` | Admin tạo rule có "khoảng hở" (warning) | "Khoảng *{from}–{to}* chưa có rule. Tờ trình rơi vào khoảng này sẽ không submit được." |
| `NT_DEPT_NOT_CONFIGURED` | Submit NT nhưng không có detail khớp bộ phận và không có fallback | "Chưa có cấu hình duyệt cho bộ phận *{department}* trên tờ trình Nguyên tắc. Vui lòng liên hệ admin." |
| `STEP_NOT_AUTHORIZED` | User không phải approver bấm duyệt | "Bạn không có quyền duyệt bước này." |
| `STEP_ALREADY_DECIDED` | Step đã approved/rejected, có người bấm lại | "Bước này đã được xử lý." |
| `MIXED_COST_CODE` | Line khác cost code với submission | "Tất cả dòng chi phí phải cùng loại với tờ trình." |

---

## 11. ROADMAP TRIỂN KHAI

| Phase | Việc | Thời gian ước lượng |
|---|---|---|
| 1 | Schema migration: thêm `CostCodeApprovalRule`, `SubmissionApprovalStep`, `Submission.costCodeId`. Drop chưa, chỉ deprecate `ApprovalConfig`. | 0.5d |
| 2 | API CRUD rule + validation + matrix endpoint | 1d |
| 3 | API resolve + snapshot khi submit, approve/reject step | 1.5d |
| 4 | UI admin `/admin/approval-rules` (form view + matrix view) | 2d |
| 5 | UI tạo tờ trình S06: chọn cost code trước, preview workflow | 1d |
| 6 | UI chi tiết tờ trình S07: timeline step | 1d |
| 7 | Notification (email + in-app) | 0.5d |
| 8 | E2E test + UAT | 1d |
| **Tổng** | | **~8.5 ngày** |

---

## 12. RỦI RO & MITIGATION

| Rủi ro | Mức độ | Mitigation |
|---|---|---|
| Khách đổi yêu cầu phân quyền sau khi đã go-live | Trung | Engine rule-based → đổi config không cần code. Chỉ rủi ro khi có yêu cầu vượt model (vd condition non-amount). |
| Admin cấu hình thiếu rule → tờ trình kẹt | Cao | Validation warning "khoảng hở" + cảnh báo trên dashboard admin. Submitter nhận error message rõ. |
| Người duyệt vắng dài ngày → treo step | Trung | Phase sau bổ sung delegate. Hiện tại admin có thể manual override (optional). |
| Rule đổi giữa chừng làm tờ trình "đi lạc" | Thấp | Snapshot lúc submit → đã giải quyết (D10). |
| Performance khi resolve rule cho nhiều tờ trình | Thấp | Index `(costCodeId, stepOrder, isActive, isDeleted)` đủ nhanh; query đơn giản. |

---

## 13. PHỤ LỤC — Mapping ảnh khách → rule

> Mapping minh họa cho 3 cost code đại diện. Toàn bộ 13 dòng sẽ được nhập tay qua màn hình admin sau khi feature ready.

### TT1 — Chi phí nhân sự
Header: `{submissionType: "MS", costCodeId: <id Chi phí nhân sự>, name: "Flow chi phí nhân sự"}`

Details:
| stepOrder | stepType | label | min | max | approver | mode |
|---|---|---|---|---|---|---|
| 1 | REVIEW | Thẩm định | null | null | Dương Thị Gấn | ANY |
| 2 | APPROVE | Phê duyệt | null | null | Trần Thị Hồng Nhung | ANY |

### TT5 — Chi phí vật tư
Header: `{submissionType: "MS", costCodeId: <id Chi phí vật tư>, name: "Flow vật tư tiêu hao"}`

Details:
| stepOrder | stepType | label | min | max | approver | mode |
|---|---|---|---|---|---|---|
| 1 | REVIEW | Thẩm định bước 1 | null | null | Dương Thúy Quỳnh | ANY |
| 2 | REVIEW | Thẩm định bước 2 | null | null | Dương Thị Gấn | ANY |
| 2 | REVIEW | Thẩm định bước 2 | null | null | Dương Hà My | ANY |
| 3 | APPROVE | Phê duyệt | null | null | Trần Thị Hồng Nhung | ANY |

### TT12 — Mua sắm TSCĐ, CCDC...
Header: `{submissionType: "MS", costCodeId: <id Mua sắm TSCĐ>, name: "Flow mua sắm TSCĐ/CCDC"}`

Details:
| stepOrder | stepType | label | min | max | approver | mode |
|---|---|---|---|---|---|---|
| 1 | REVIEW | Thẩm định bước 1 | null | null | Dương Thúy Quỳnh | ANY |
| 2 | REVIEW | Thẩm định bước 2 | null | null | Dương Thị Gấn | ANY |
| 3 | APPROVE | Phê duyệt CPPS <15tr | null | 15_000_000 | Dương Hà My | ANY |
| 3 | APPROVE | Phê duyệt CPPS <50tr | 15_000_000 | 50_000_000 | Trần Thị Hồng Nhung | ANY |
| 3 | APPROVE | Phê duyệt CPPS ≥50tr | 50_000_000 | null | Dương Văn Hồng | ANY |

### NT — Tờ trình Nguyên tắc (global, không cost code)

Header: `{submissionType: "NT", costCodeId: null, name: "Flow duyệt tờ trình Nguyên tắc"}`

Details (min/max luôn null):

| stepOrder | stepType | label | departmentId | approver | mode |
|---|---|---|---|---|---|
| 1 | REVIEW | Thẩm định | null (tất cả) | Dương Thị Gấn | ANY |
| 2 | APPROVE | Phê duyệt | `<id Kinh doanh>` | Dương Hà My | ANY |
| 2 | APPROVE | Phê duyệt | null (fallback) | Trần Thị Hồng Nhung | ANY |

> Ghi chú: cấu hình trên minh họa routing — bộ phận Kinh doanh duyệt bởi Hà My, các bộ phận còn lại duyệt bởi Hồng Nhung. Cấu hình thực tế cần xác nhận với khách HV.

---

**Sign-off:**
- [ ] BA (Nhung)
- [ ] PM
- [ ] Dev Lead
- [ ] Khách HV
