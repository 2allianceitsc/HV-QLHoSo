# 04 — Bug & Lệch Logic Trong Mockup

> Các vấn đề **trong code mockup hiện tại** cần fix để phù hợp với BA hoặc UX hợp lý.
> Khác với "tính năng còn thiếu" — đây là chỗ mockup đã làm nhưng làm sai.

## 🔴 BUG-01 — Không sửa được tờ trình bị từ chối

**Vi phạm BA §4.5** — luồng "Sửa & gửi lại sau từ chối".

**Vị trí lỗi:**
- [app/to-trinh/[id]/sua/page.tsx:30](../../app/to-trinh/[id]/sua/page.tsx#L30):
  ```ts
  if (tt.trangThai !== 'nhap' || tt.nguoiTrinhId !== currentUser?.id) {
    return <p>Tờ trình này không thể chỉnh sửa</p>;
  }
  ```
- [app/to-trinh/[id]/page.tsx:44-45](../../app/to-trinh/[id]/page.tsx#L44):
  ```ts
  const canEdit = isOwner && tt.trangThai === 'nhap';
  const canGui = isOwner && tt.trangThai === 'nhap';
  ```

**Hệ quả:** Tờ trình bị từ chối → người trình không có cách nào sửa & gửi lại — phải tạo mới. Mất hoàn toàn lý do từ chối có ý nghĩa.

**Fix:**
```ts
const editableStates: TrangThaiToTrinh[] = ['nhap', 'tu_choi'];
const canEdit = isOwner && editableStates.includes(tt.trangThai);
const canGui = isOwner && editableStates.includes(tt.trangThai);
```

Ngoài ra: nút "Gửi tờ trình" khi `tu_choi` nên hiển thị label "Gửi lại" để UX rõ hơn.

---

## 🔴 BUG-02 — nhan_vien chọn được bộ phận khác mình

**Liên quan câu hỏi blocking Q06** trong `BA/open-questions.md`.

**Vị trí lỗi:**
- [components/to-trinh/ToTrinhForm.tsx:160-168](../../components/to-trinh/ToTrinhForm.tsx#L160):
  ```tsx
  <select value={values.boPhan} onChange={e => set('boPhan', e.target.value)}>
    {BO_PHAN_LIST.map(b => <option key={b} value={b}>{b}</option>)}
  </select>
  ```
- Hard-code 5 bộ phận, không filter theo `currentUser`.

**Hệ quả:**
- `nhan_vien` IT có thể tạo tờ trình cho phòng Kế toán → tờ trình đó sẽ do người duyệt Kế toán xử lý.
- Sau khi tạo xong, user IT **không còn thấy tờ trình của mình** vì `app/to-trinh/page.tsx:50-52` lọc theo `currentUser.boPhan`.

**Fix tạm (chờ Q06 quyết)**:
- Khoá dropdown — `nhan_vien` chỉ thấy `currentUser.boPhan`
- Hoặc disable hoàn toàn (read-only) hiển thị bộ phận của user

---

## 🔴 BUG-03 — Sidebar menu giống nhau cho mọi role

**Vi phạm BA §11 — UI Grouping System Menu**.

**Vị trí lỗi:**
- [components/layout/AppLayout.tsx:11-15](../../components/layout/AppLayout.tsx#L11):
  ```ts
  const NAV = [
    { href: '/to-trinh', label: 'Tờ trình', icon: FileText },
    { href: '/bao-cao', label: 'Báo cáo HĐ', icon: BarChart2 },
    { href: '/introduce', label: 'Giới thiệu', icon: BookOpen },
  ];
  ```
- Hard-code 3 mục, render giống nhau cho mọi role.

**BA §11 yêu cầu:**

| Role | Menu thấy được |
|------|----------------|
| `nhan_vien` | Tờ trình |
| `tham_dinh` | Tờ trình + Báo cáo |
| `phe_duyet` | Tờ trình + Báo cáo + Báo cáo chi phí |
| `admin` | Tất cả + 4 menu admin |

**Fix:** filter `NAV` theo `currentUser.role`.

---

## 🟡 BUG-04 — Mã tờ trình `K00001` sai pattern

**Vị trí lỗi:**
- [lib/mockData.ts:126](../../lib/mockData.ts#L126):
  ```ts
  { id: 'tt4', loai: 'MS', ma: 'K00001', ... }
  ```

Loại = `MS` nhưng mã = `K00001`. Theo BA §5.5: mã MS phải `MS{seq:0000}`.

**Fix:** đổi thành `MS0004` (vì đã có MS0001-MS0003).

---

## 🟡 BUG-05 — Không validate "MS phải có ≥ 1 chi phí"

**Vi phạm BA §6.3 (POST /api/to-trinh/{id}/gui)**:
> Check (nếu MS): phải có ≥ 1 ChiPhiDong

**Vị trí lỗi:**
- [components/to-trinh/ToTrinhForm.tsx:52-62](../../components/to-trinh/ToTrinhForm.tsx#L52):
  ```ts
  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!values.veViec.trim()) e.veViec = 'Vui lòng nhập tiêu đề';
    if (values.loai === 'NT') {
      if (!values.nhaCungCap.trim()) e.nhaCungCap = '...';
      ...
    }
    // KHÔNG check chiPhi.length cho MS
  };
  ```

**Hệ quả:** User có thể tạo tờ trình MS với 0 dòng chi phí và bấm "Lưu & Gửi ngay" → tờ trình rỗng vẫn vào trạng thái `cho_duyet`.

**Fix:** thêm `if (values.loai === 'MS' && values.chiPhi.length === 0) e.chiPhi = 'Phải có ít nhất một dòng chi phí';`

---

## 🟡 BUG-06 — Phân quyền duyệt cấu hình `myadh` thẩm định nhiều bộ phận khác mình

**Liên quan câu hỏi blocking Q01**.

**Vị trí cấu hình:**
- [lib/mockData.ts:52-58](../../lib/mockData.ts#L52):
  ```ts
  { boPhan: 'Kế toán', thamDinhId: 'u3', pheDuyetId: 'u5' },     // u3 = myadh
  { boPhan: 'Marketing', thamDinhId: 'u3', pheDuyetId: 'u4' },   // u3 = myadh
  { boPhan: 'Hành chính', thamDinhId: 'u3', pheDuyetId: 'u5' },  // u3 = myadh
  ```

`u3` (Dương Hà My — Kế toán trưởng) thẩm định cho **3 bộ phận** Kế toán, Marketing, Hành chính.

**Vấn đề:** Nếu My tạo tờ trình cho phòng Kế toán → My được auto-gán làm thẩm định cho chính tờ trình của mình. Hiện mockup không chặn self-approval.

**Tạm chấp nhận** trong mock — nhưng cần lưu ý khi build production.

---

## 🟡 BUG-07 — `ngayBatDauHD` <= `ngayHetHanHD` không validate

**Vị trí lỗi:**
- `ToTrinhForm.tsx:55-58` validate cả 2 ngày tồn tại nhưng **không check** thứ tự.

**Hệ quả:** User có thể nhập `ngayHetHan = 2026-01-01`, `ngayBatDau = 2026-12-31` → tờ trình NT có hợp đồng "lùi".

**Fix:** thêm `if (values.ngayBatDau > values.ngayHetHan) e.ngayHetHan = 'Ngày hết hạn phải sau ngày bắt đầu';`

---

## 🟢 BUG-08 — Filter dropdown bộ phận hiện tất cả cho nhan_vien

**Vị trí lỗi:**
- [app/to-trinh/page.tsx:177-187](../../app/to-trinh/page.tsx#L177)

`nhan_vien` chỉ thấy tờ trình bộ phận mình (đúng) nhưng dropdown filter "Bộ phận" lại liệt kê tất cả 5 bộ phận. Filter sang bộ phận khác → list rỗng (không gây lộ data, nhưng UX kém).

**Fix:** với `nhan_vien`, ẩn dropdown filter này (hoặc disable, chỉ chọn được dept của mình).

---

## 🟢 BUG-09 — Toast thiếu khi tạo tờ trình & upload file

BA §10.1 N005, N006 yêu cầu toast khi:
- Tạo tờ trình thành công (lưu nháp)
- Upload file thành công

Mockup `app/to-trinh/tao/page.tsx:14-36` không gọi `addNotification` sau khi `addToTrinh`. Tương tự cho upload ảnh và upload hợp đồng đã ký.

---

## 🟢 BUG-10 — Persisted store không migrate khi đổi shape

**Vị trí:** `store/useStore.ts:127-130`

```ts
{
  name: 'hv-app-storage',
  partialize: (state) => ({ currentUser: state.currentUser }),
}
```

Chỉ persist `currentUser`. OK cho mock. **Lưu ý:** khi BA đổi shape `User` (thêm `passwordHash`, `isActive`...), cần version migration nếu không sẽ lỗi runtime trên user đã có localStorage.

---

## 🟢 BUG-11 — Không có pages.tsx ở `/` (root route)

Mockup có route `/login`, `/to-trinh`, `/bao-cao`, `/introduce` nhưng **không có handler cho `/`**.

**Vị trí:** `app/app/page.tsx` tồn tại nhưng có thể chỉ redirect hoặc default page. Cần kiểm tra.

(Đã thấy file tồn tại trong glob — chưa đọc. Nếu là redirect đến `/to-trinh` thì OK.)

---

## Tổng kết bug

| Bug ID | Mức | Loại | Ưu tiên fix |
|--------|-----|------|------------|
| BUG-01 | 🔴 | Workflow | P0 — sai BA |
| BUG-02 | 🔴 | Permission | P0 — đợi Q06 |
| BUG-03 | 🔴 | UX/Permission | P1 — sai BA |
| BUG-04 | 🟡 | Mock data | P2 — cosmetic |
| BUG-05 | 🟡 | Validation | P1 — sai BA |
| BUG-06 | 🟡 | Mock data | P2 — đợi Q01 |
| BUG-07 | 🟡 | Validation | P2 — UX |
| BUG-08 | 🟢 | UX | P3 |
| BUG-09 | 🟢 | UX (toast) | P3 |
| BUG-10 | 🟢 | Tech debt | P3 |
| BUG-11 | 🟢 | Routing | Cần verify |
