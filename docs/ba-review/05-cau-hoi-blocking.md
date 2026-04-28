# 05 — Câu Hỏi Blocking Cần Khách Hàng / PM Quyết

> Trích 7 câu hỏi 🔴 Blocking từ [`BA/open-questions.md`](../../BA/open-questions.md) — chưa giải đáp.
> Mỗi câu kèm: ảnh hưởng đến mockup hiện tại + đề xuất sơ bộ.
> **Cần quyết trước khi**: thiết kế DB schema, viết API, hoặc fix mockup ở các bug liên quan.

---

## Q01 🔴 — Người thẩm định / phê duyệt tự duyệt tờ trình của chính mình?

**Tình huống thực tế trong mockup:**
- `myadh` (Kế toán trưởng) là `tham_dinh` cho 3 bộ phận: Kế toán, Marketing, Hành chính
- Nếu `myadh` tự tạo tờ trình cho phòng Kế toán → hệ thống auto-gán `myadh` làm thẩm định
- Mockup hiện **không chặn** việc này

**Cần khách hàng quyết:**
- A. Cho phép tự duyệt (tin tưởng, đơn giản)
- B. Chặn — yêu cầu admin gán người thẩm định khác trong trường hợp này
- C. Leo thang — chuyển lên cấp trên (giám đốc) thẩm định

**Ảnh hưởng:**
- Logic gán `thamDinhId`, `pheDuyetId` khi tạo tờ trình
- Validation phía server `currentUser.id !== nguoiTrinhId`
- Mock data `PHAN_QUYEN_DUYET` có thể cần thêm "thay thế khi tự duyệt"

---

## Q02 🔴 — Người phê duyệt tạo tờ trình → ai phê duyệt?

**Tình huống:** `hongdv` (Giám đốc, role `phe_duyet`) là người phê duyệt cho 4 bộ phận. Nếu giám đốc tạo tờ trình → ai duyệt cho giám đốc?

**Cần khách hàng quyết:**
- A. Giám đốc miễn phê duyệt (auto-approve)
- B. Phó giám đốc / hội đồng duyệt
- C. Admin xử lý thủ công
- D. Chỉ admin được phép tạo tờ trình thay giám đốc

**Ảnh hưởng:**
- Permission matrix §3.2 — có thể cần điều chỉnh
- Workflow §4 — thêm nhánh "tự phê duyệt" hoặc "leo thang"

---

## Q06 🔴 — Form tạo tờ trình: chọn được bộ phận khác không?

**Tình huống mockup hiện tại** ([components/to-trinh/ToTrinhForm.tsx:160-168](../../components/to-trinh/ToTrinhForm.tsx#L160)):
- Dropdown bộ phận **hiện tất cả 5 bộ phận**
- `nhan_vien` IT có thể chọn "Kế toán" → tờ trình do user IT tạo nhưng gắn vào phòng Kế toán → user IT mất quyền xem (bị filter theo dept)

**Cần khách hàng quyết:**
- A. Khoá theo `currentUser.boPhan` (an toàn)
- B. Cho phép chọn (linh hoạt, nhưng phải gỡ filter nhan_vien hoặc cho phép thấy tờ trình mình tạo)
- C. Cho phép `tham_dinh`/`phe_duyet`/`admin` chọn, nhưng `nhan_vien` thì khoá

**Ảnh hưởng (đã ghi tại [04-bug-mockup.md BUG-02](04-bug-mockup.md))**:
- Form tạo
- Phân quyền data scope §3.3

---

## Q08 🔴 — Hàng hoá VAT ≠ 10% (0%, 5%, 8%)

**Tình huống:**
- BA §4.3 ban đầu định: `soTienCoVAT = soTienChuaVAT × 1.1` (10%)
- Nhưng VAT có thể là 0% / 5% / 8% / miễn thuế

**Mockup hiện tại** ([ToTrinhForm.tsx:280-301](../../components/to-trinh/ToTrinhForm.tsx#L280)):
- 2 ô tách rời, **người dùng nhập tay cả hai**
- Không có ràng buộc tỉ lệ

**Cần khách hàng quyết:**
- A. Bắt buộc 10% — auto-calc (như BA §4.3 ban đầu)
- B. Cho nhập tay 2 ô độc lập (như mockup hiện tại) — user tự kiểm soát
- C. Có dropdown chọn % VAT (0/5/8/10) → auto-calc theo % chọn
- D. Mặc định 10%, có nút "VAT không 10%" để mở 2 ô độc lập

**Ảnh hưởng:**
- Validate phía server (BA §6.3): `soTienCoVAT >= soTienChuaVAT` đã đủ chưa, hay cần thêm rule?
- F014 (auto-calc VAT) trong backlog

---

## Q15 🔴 — Mã tờ trình khi soft delete?

**Tình huống:**
- BA §5.5: mã tờ trình unique, format `MS{seq:0000}`
- BA §5.5 cũng yêu cầu **soft delete** (`isDeleted=true`)
- Logic hiện tại: `ma = MS{COUNT(*)+1}`. Nếu xoá MS0002 → tạo mới sẽ là MS0003 hay MS0004?

**Mockup hiện tại** ([lib/utils.ts:30-34](../../lib/utils.ts#L30)):
```ts
export function genMaToTrinh(loai: 'MS' | 'NT', existing: ToTrinh[]): string {
  const count = existing.filter(t => t.loai === loai && t.ma.startsWith(prefix)).length;
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}
```
→ Đếm tất cả existing (chưa hỗ trợ soft delete). Trong mockup hiện đang **hard delete** (`deleteToTrinh` filter bỏ).

**Cần khách hàng quyết:**
- A. Mã liên tục, không có lỗ hổng — dùng sequence riêng (DB sequence/auto-increment), không phụ thuộc COUNT
- B. Cho phép trùng nếu xoá rồi tạo (rủi ro audit)
- C. Mã có thể có "lỗ" — bỏ qua mã đã xoá, đếm tiếp từ max+1 (dùng `MAX(seq)+1`)

**Ảnh hưởng:**
- Logic `genMaToTrinh` trong production
- Race condition khi 2 user tạo cùng lúc → cần lock / sequence

---

## Q16 🔴 — `User.boPhan` lưu ID hay tên?

**BA §5.1 ghi:** `User.boPhan: VARCHAR(100), FK → BoPhan.ten`

**Vấn đề:** Nếu admin đổi tên bộ phận ("Mua hàng" → "Procurement") → tất cả user có `boPhan = 'Mua hàng'` mất liên kết.

**Mockup hiện tại** ([types/index.ts:9](../../types/index.ts#L9)): `boPhan: string` (lưu tên).

**Cần khách hàng quyết:**
- A. Lưu **ID** (UUID), JOIN với bảng `BoPhan` khi cần tên — production-grade
- B. Lưu tên (snapshot tại thời điểm tạo) — đơn giản nhưng rủi ro

**Đề xuất:** Lưu ID. Việc đổi tên bộ phận là chuyện hợp lý có thể xảy ra.

**Ảnh hưởng:**
- Toàn bộ data model (User, ToTrinh, MaPhi đều có `boPhan`)
- Mockup hiện tại sẽ cần refactor khi sang production

---

## Q20 🔴 — Tờ trình nguyên tắc (NT) có nghiệp vụ gì khác MS?

**BA hiện mô tả NT:**
- Có `ngayBatDauHD`, `ngayHetHanHD`, `nhaCungCap`
- Upload `hopDongDaKy` sau phê duyệt
- KHÔNG có chi phí dự kiến

**Câu hỏi cụ thể:**
1. NT có cần danh sách chi phí dự kiến (như MS) không, hay chỉ ghi nhận NCC + hạn?
2. Khi hợp đồng sắp hết hạn → có cần tự động cảnh báo? (Mockup hiện đã có cảnh báo trong `/bao-cao`)
3. Sau phê duyệt NT, hợp đồng đã ký (`hopDongDaKy`) **bắt buộc upload** mới hoàn tất, hay tuỳ chọn?
4. Ai upload `hopDongDaKy`? (liên quan Q05 — BA cho phép cả `tham_dinh`, `phe_duyet`, `nhan_vien` upload)

**Ảnh hưởng:**
- Schema `ToTrinh` cho NT — có thêm bảng `ChiPhiNT` không?
- Status workflow NT — có thêm trạng thái `cho_ky_hop_dong` sau `phe_duyet`?
- Notification — cảnh báo SLA tự động cho hợp đồng sắp hết hạn?

---

## Tổng kết & Đề xuất

| Q | Ảnh hưởng cấu trúc | Ảnh hưởng UI mockup | Ảnh hưởng DB |
|---|---------------------|---------------------|--------------|
| Q01 | Permission rule | Logic gán duyệt | Constraint check |
| Q02 | Permission matrix | Workflow nhánh mới | Có thể thêm role |
| Q06 | Permission scope | Form bộ phận | — |
| Q08 | Tính toán VAT | UI 2 ô VAT | — |
| Q15 | Mã unique | — | Sequence design |
| Q16 | Foreign key | — | **Schema entity** |
| Q20 | NT workflow | UI chi tiết NT | Có thể thêm bảng |

**Khuyến nghị:**
1. Trước **cuộc họp tiếp theo với khách hàng**, dùng file này làm checklist xác nhận từng câu.
2. Q16 ưu tiên cao nhất — quyết sớm để khỏi phải migrate DB sau.
3. Q06 và Q08 có thể fix trong mockup ngay khi có quyết — vì là UI thuần.
4. Q01, Q02, Q20 thuộc nghiệp vụ — cần khách hàng / nghiệp vụ trả lời, không phải tech.

---

## Câu hỏi Important (🟡) — không blocking nhưng nên hỏi sớm

Để hỏi cùng đợt với 7 câu blocking ở trên (chi tiết tại `BA/open-questions.md`):

- Q03 — Người duyệt vắng mặt thì sao? (cơ chế ủy quyền)
- Q04 — Đổi cấu hình PhanQuyenDuyet, tờ trình pending ảnh hưởng?
- Q05 — Ai được upload `hopDongDaKy`?
- Q12 — Sau từ chối → gửi lại, `thamDinhLuc` reset?
- Q13 — Sau `phe_duyet` còn nghiệp vụ gì? (theo dõi mua hàng / thanh toán?)
- Q17 — Xoá tờ trình → file đính kèm xử lý sao?
- Q19 — Báo cáo chi phí tính trên tờ trình ở trạng thái nào?
- Q22 — User có thể thuộc nhiều bộ phận?
- Q24 — Sau đổi mật khẩu lần đầu, có phải đăng nhập lại?
