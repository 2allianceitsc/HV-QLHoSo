# Design: Tách tiền chưa VAT / có VAT + thêm trường mua cho ai / mục đích / người dùng

**Ngày:** 2026-04-16  
**Phạm vi:** ChiPhiDong (tờ trình mua sắm - loại MS)

---

## Mục tiêu

Mỗi dòng chi phí trong tờ trình mua sắm cần:
1. Tách số tiền thành **Giá chưa VAT** và **Giá có VAT** (cả hai nhập tay)
2. Thêm 3 trường thông tin bổ sung: **Mua cho ai**, **Mục đích**, **Người sử dụng**
3. Tổng cuối bảng = tổng `soTienCoVAT`

---

## Thay đổi type (`types/index.ts`)

```ts
export interface ChiPhiDong {
  id: string;
  maPhi: string;
  tenMaPhi: string;
  soTienChuaVAT: number;   // thay thế soTien
  soTienCoVAT: number;     // mới
  nhaCungCap: string;
  muaCho?: string;         // mới — Mua cho ai
  mucDich?: string;        // mới — Mục đích sử dụng
  nguoiSuDung?: string;    // mới — Người sử dụng
}
```

`soTien` bị xóa hoàn toàn.

---

## Mock data (`lib/mockData.ts`)

Tất cả phần tử trong `chiPhi[]` của `MOCK_TO_TRINH` cần:
- Xóa `soTien`, thêm `soTienChuaVAT` và `soTienCoVAT` (giá trị thực tế, ví dụ VAT 10%)
- Thêm `muaCho`, `mucDich`, `nguoiSuDung` với giá trị mẫu phù hợp ngữ cảnh từng tờ trình

---

## Form nhập (`components/to-trinh/ToTrinhForm.tsx`)

Mỗi dòng chi phí thêm:
- Hàng tiền: 2 ô cạnh nhau — **Giá chưa VAT** (số) | **Giá có VAT** (số)
- Hàng thông tin: 3 ô text — **Mua cho ai** | **Mục đích** | **Người sử dụng** (optional)

Xóa ô `soTien` cũ.

---

## Trang chi tiết (`app/to-trinh/[id]/page.tsx`)

Bảng chi phí:
- Cột cũ "Số tiền" → tách thành 2 cột: **Chưa VAT** và **Có VAT**
- Bên dưới mỗi dòng: hiển thị inline 3 trường mới (dạng text nhỏ, màu muted, nếu có giá trị)
- Dòng tổng: `Tổng cộng = sum(soTienCoVAT)`

---

## Trang sửa (`app/to-trinh/[id]/sua/page.tsx`)

Nếu trang sửa dùng lại `ToTrinhForm`, tự động được cập nhật. Nếu không, cần cập nhật tương tự form nhập.

---

## Không thay đổi

- Luồng phê duyệt, trạng thái tờ trình
- Tờ trình loại NT (nguyên tắc) không có `chiPhi`, không bị ảnh hưởng
- Store actions (`guiToTrinh`, `thamDinh`, `pheDuyet`, `tuChoi`) không thay đổi
