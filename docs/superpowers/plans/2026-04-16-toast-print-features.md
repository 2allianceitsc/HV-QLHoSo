# Toast Email & Print CSS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm mock toast email notification khi thực hiện hành động phê duyệt, và cải thiện CSS in ấn tờ trình đã phê duyệt thành layout A4 chuyên nghiệp.

**Architecture:** Store-based toast system — Zustand store giữ `notifications[]`, các action (guiToTrinh/thamDinh/pheDuyet/tuChoi) push notification vào đó, `Toast` component trong `AppLayout` render và auto-dismiss. Print CSS dùng `@media print` trực tiếp trong trang chi tiết, thêm 2 JSX elements ẩn (print-header, print-signature) chỉ hiện khi in.

**Tech Stack:** Next.js 16, React, Zustand, Tailwind CSS, Lucide React, CSS @media print

---

## File Map

| File | Hành động | Trách nhiệm |
|---|---|---|
| `types/index.ts` | Modify | Thêm `AppNotification` type |
| `store/useStore.ts` | Modify | Thêm notifications state/actions, cập nhật 4 action hiện có |
| `components/ui/Toast.tsx` | Create | Toast UI component + auto-dismiss |
| `components/layout/AppLayout.tsx` | Modify | Render `<Toast />` global |
| `app/to-trinh/[id]/page.tsx` | Modify | Print CSS đẹp + print-header JSX + print-signature JSX |

---

## Task 1: Thêm AppNotification type

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Thêm type vào cuối file `types/index.ts`**

```typescript
export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add AppNotification type"
```

---

## Task 2: Cập nhật Zustand store — notifications

**Files:**
- Modify: `store/useStore.ts`

> Toàn bộ nội dung hiện tại của store cần được thay thế như sau. Đọc file trước khi edit.

- [ ] **Step 1: Thêm import AppNotification vào dòng import đầu file**

Dòng hiện tại:
```typescript
import { ToTrinh, User, ChiPhiDong } from '@/types';
```
Sửa thành:
```typescript
import { ToTrinh, User, ChiPhiDong, AppNotification } from '@/types';
```

- [ ] **Step 2: Thêm 3 fields vào interface `AppState` (sau `deleteToTrinh`)**

Tìm đoạn:
```typescript
  thamDinh: (id: string) => void;
  pheDuyet: (id: string) => void;
  tuChoi: (id: string, lyDo?: string) => void;
  guiToTrinh: (id: string) => void;
```
Thêm vào SAU `guiToTrinh`:
```typescript
  notifications: AppNotification[];
  addNotification: (message: string, type?: AppNotification['type']) => void;
  removeNotification: (id: string) => void;
```

- [ ] **Step 3: Thêm initial state `notifications: []`**

Tìm dòng:
```typescript
      currentUser: MOCK_USERS[6], // hungnt — nhân viên IT mặc định
      toTrinhs: MOCK_TO_TRINH,
```
Thêm vào sau `toTrinhs`:
```typescript
      notifications: [],
```

- [ ] **Step 4: Thêm 2 action mới `addNotification` và `removeNotification`**

Tìm dòng `guiToTrinh: (id) => {` và thêm 2 action SAU toàn bộ block `guiToTrinh`:
```typescript
      addNotification: (message, type = 'info') => {
        const id = `notif-${Date.now()}`;
        set(state => ({ notifications: [...state.notifications, { id, message, type }] }));
      },

      removeNotification: (id) => {
        set(state => ({ notifications: state.notifications.filter(n => n.id !== id) }));
      },
```

- [ ] **Step 5: Cập nhật action `guiToTrinh` để push notification**

Tìm và thay thế toàn bộ block `guiToTrinh`:
```typescript
      guiToTrinh: (id) => {
        const tt = get().toTrinhs.find(t => t.id === id);
        if (tt) {
          const thamDinhUser = MOCK_USERS.find(u => u.id === tt.thamDinhId);
          get().addNotification(`📧 Email gửi đến ${thamDinhUser?.hoTen ?? '—'} để thẩm định tờ trình ${tt.ma}`, 'info');
        }
        set(state => ({
          toTrinhs: state.toTrinhs.map(t =>
            t.id === id ? { ...t, trangThai: 'cho_duyet' } : t
          ),
        }));
      },
```

- [ ] **Step 6: Cập nhật action `thamDinh`**

Tìm và thay thế toàn bộ block `thamDinh`:
```typescript
      thamDinh: (id) => {
        const tt = get().toTrinhs.find(t => t.id === id);
        if (tt) {
          const pheDuyetUser = MOCK_USERS.find(u => u.id === tt.pheDuyetId);
          get().addNotification(`📧 Email gửi đến ${pheDuyetUser?.hoTen ?? '—'} để phê duyệt tờ trình ${tt.ma}`, 'info');
        }
        set(state => ({
          toTrinhs: state.toTrinhs.map(t =>
            t.id === id ? { ...t, trangThai: 'tham_dinh', thamDinhLuc: new Date().toISOString() } : t
          ),
        }));
      },
```

- [ ] **Step 7: Cập nhật action `pheDuyet`**

Tìm và thay thế toàn bộ block `pheDuyet`:
```typescript
      pheDuyet: (id) => {
        const tt = get().toTrinhs.find(t => t.id === id);
        if (tt) {
          const nguoiTrinh = MOCK_USERS.find(u => u.id === tt.nguoiTrinhId);
          get().addNotification(`📧 Email thông báo tờ trình ${tt.ma} đã phê duyệt gửi đến ${nguoiTrinh?.hoTen ?? '—'}`, 'success');
        }
        set(state => ({
          toTrinhs: state.toTrinhs.map(t =>
            t.id === id ? { ...t, trangThai: 'phe_duyet', pheDuyetLuc: new Date().toISOString() } : t
          ),
        }));
      },
```

- [ ] **Step 8: Cập nhật action `tuChoi`**

Tìm và thay thế toàn bộ block `tuChoi`:
```typescript
      tuChoi: (id, lyDo) => {
        const tt = get().toTrinhs.find(t => t.id === id);
        if (tt) {
          const nguoiTrinh = MOCK_USERS.find(u => u.id === tt.nguoiTrinhId);
          get().addNotification(`📧 Email thông báo từ chối tờ trình ${tt.ma} gửi đến ${nguoiTrinh?.hoTen ?? '—'}`, 'warning');
        }
        set(state => ({
          toTrinhs: state.toTrinhs.map(t =>
            t.id === id ? { ...t, trangThai: 'tu_choi', lyDoTuChoi: lyDo } : t
          ),
        }));
      },
```

- [ ] **Step 9: Đảm bảo `notifications` KHÔNG có trong `partialize`**

Tìm block `partialize`:
```typescript
      partialize: (state) => ({ currentUser: state.currentUser }),
```
Giữ nguyên — `notifications` không được persist (đúng rồi, không cần thay đổi).

- [ ] **Step 10: Commit**

```bash
git add store/useStore.ts
git commit -m "feat: add notifications to store, push email toasts on approval actions"
```

---

## Task 3: Tạo Toast component

**Files:**
- Create: `components/ui/Toast.tsx`

- [ ] **Step 1: Tạo file `components/ui/Toast.tsx` với nội dung sau**

```tsx
'use client';
import { useEffect } from 'react';
import { Mail, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { AppNotification } from '@/types';

export default function Toast() {
  const { notifications, removeNotification } = useStore();
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map(n => (
        <ToastItem key={n.id} notification={n} onRemove={removeNotification} />
      ))}
    </div>
  );
}

function ToastItem({ notification, onRemove }: { notification: AppNotification; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(notification.id), 4000);
    return () => clearTimeout(timer);
  }, [notification.id, onRemove]);

  const config = {
    success: { bg: 'var(--success-muted)', color: 'var(--success)', Icon: CheckCircle },
    warning: { bg: 'var(--warning-muted)', color: 'var(--warning)', Icon: AlertTriangle },
    info:    { bg: 'var(--primary-muted)', color: 'var(--primary)', Icon: Info },
  }[notification.type];

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto max-w-sm animate-slide-up"
      style={{
        background: config.bg,
        border: `1px solid color-mix(in srgb, ${config.color} 35%, transparent)`,
      }}
    >
      <Mail size={15} style={{ color: config.color }} className="mt-0.5 flex-shrink-0" />
      <p className="text-sm flex-1 leading-snug" style={{ color: 'var(--text-primary)' }}>
        {notification.message}
      </p>
      <button
        onClick={() => onRemove(notification.id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Thêm animation `animate-slide-up` vào `app/globals.css`**

Mở `app/globals.css`, thêm vào cuối file:
```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.2s ease-out forwards;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/Toast.tsx app/globals.css
git commit -m "feat: add Toast component with auto-dismiss and slide-up animation"
```

---

## Task 4: Tích hợp Toast vào AppLayout

**Files:**
- Modify: `components/layout/AppLayout.tsx`

- [ ] **Step 1: Thêm import Toast**

Tìm dòng:
```typescript
import { getInitials } from '@/lib/utils';
```
Thêm vào SAU:
```typescript
import Toast from '@/components/ui/Toast';
```

- [ ] **Step 2: Render `<Toast />` trong JSX**

Tìm đoạn closing `</div>` cuối cùng của component (sau `</main>`):
```tsx
      </div>
    </div>
  );
```
Thêm `<Toast />` trước closing div ngoài cùng:
```tsx
      </div>
      <Toast />
    </div>
  );
```

- [ ] **Step 3: Verify thủ công**

Mở dev server, vào tờ trình có trạng thái `cho_duyet` (ví dụ MS0002) với user `myadh` (thẩm định viên). Bấm "Thẩm định" → toast xanh hiện bottom-right với text `📧 Email gửi đến Dương Văn Hồng để phê duyệt tờ trình MS0002`, tự biến mất sau 4 giây.

- [ ] **Step 4: Commit**

```bash
git add components/layout/AppLayout.tsx
git commit -m "feat: integrate Toast into AppLayout for global email notifications"
```

---

## Task 5: Cải thiện Print CSS + thêm print-header và print-signature

**Files:**
- Modify: `app/to-trinh/[id]/page.tsx`

- [ ] **Step 1: Thay thế toàn bộ block `<style>` hiện có**

Tìm block style hiện tại:
```tsx
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { max-width: 100% !important; }
          body { background: white !important; }
        }
      `}</style>
```

Thay bằng:
```tsx
      <style>{`
        @media print {
          /* Ẩn chrome */
          aside, header, nav, .no-print, button, a[href] { display: none !important; }

          /* Page */
          body { background: white !important; font-family: 'Times New Roman', serif !important; color: #000 !important; margin: 0; }
          .print-full { max-width: 170mm !important; margin: 0 auto !important; padding: 10mm 5mm !important; }

          /* Cards phẳng */
          [style*="background: var(--surface)"], [style*="background:var(--surface)"] {
            background: white !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
          }

          /* Print-only elements */
          .print-header { display: flex !important; }
          .print-signature { display: table !important; }

          /* Tables */
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #888 !important; padding: 5px 8px !important; font-size: 10pt !important; }
          thead tr { background: #f0f0f0 !important; }

          /* Typography */
          h1 { font-size: 14pt !important; }
          h2 { font-size: 11pt !important; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
          p, span { font-size: 10pt !important; color: #000 !important; }

          /* Images */
          img { max-width: 100% !important; max-height: 80mm !important; object-fit: contain !important; }

          /* Page break */
          .print-signature { page-break-inside: avoid; }
        }
      `}</style>
```

- [ ] **Step 2: Thêm print-header JSX ngay sau thẻ `<div className="print-full">`**

Tìm dòng:
```tsx
      <div className="print-full">
        {/* Back + actions */}
```

Thêm vào giữa 2 dòng trên:
```tsx
      <div className="print-full">
        {/* Print header - chỉ hiển thị khi in */}
        <div className="print-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14pt', letterSpacing: '0.5px' }}>HV SYSTEM</div>
            <div style={{ fontSize: '9pt', color: '#555', marginTop: '2px' }}>Quy trình duyệt hồ sơ</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>PHIẾU ĐỀ XUẤT PHÊ DUYỆT</div>
            <div style={{ fontSize: '9pt', color: '#555', marginTop: '2px' }}>Mã: {tt.ma} | Ngày: {formatDate(tt.ngayTrinh)}</div>
          </div>
        </div>

        {/* Back + actions */}
```

- [ ] **Step 3: Thêm print-signature JSX ở cuối `<div className="space-y-4">`**

Tìm đoạn closing của `<div className="space-y-4">` — ngay trước `</div>` đóng của nó sau block Actions:
```tsx
        </div>
      </div>

      {/* Rejection modal */}
```

Thêm print-signature TRƯỚC `</div>` đóng của `space-y-4`:
```tsx
          {/* Chữ ký - chỉ hiển thị khi in */}
          <div className="print-signature" style={{ display: 'none', width: '100%', borderCollapse: 'collapse', marginTop: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Người trình', 'Thẩm định', 'Phê duyệt'].map(h => (
                    <th key={h} style={{ border: '1px solid #888', padding: '6px 10px', textAlign: 'center', fontSize: '10pt', background: '#f0f0f0', fontWeight: 'bold' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[null, null, null].map((_, i) => (
                    <td key={i} style={{ border: '1px solid #888', height: '60px', padding: '6px 10px' }} />
                  ))}
                </tr>
                <tr>
                  <td style={{ border: '1px solid #888', padding: '6px 10px', textAlign: 'center', fontSize: '10pt' }}>
                    {nguoiTrinh?.hoTen ?? '—'}
                  </td>
                  <td style={{ border: '1px solid #888', padding: '6px 10px', textAlign: 'center', fontSize: '10pt' }}>
                    <div>{thamDinhUser?.hoTen ?? '—'}</div>
                    {tt.thamDinhLuc && <div style={{ fontSize: '9pt', color: '#555' }}>{new Date(tt.thamDinhLuc).toLocaleDateString('vi-VN')}</div>}
                  </td>
                  <td style={{ border: '1px solid #888', padding: '6px 10px', textAlign: 'center', fontSize: '10pt' }}>
                    <div>{pheDuyetUser?.hoTen ?? '—'}</div>
                    {tt.pheDuyetLuc && <div style={{ fontSize: '9pt', color: '#555' }}>{new Date(tt.pheDuyetLuc).toLocaleDateString('vi-VN')}</div>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
```

- [ ] **Step 4: Verify thủ công**

Mở tờ trình `MS0001` (đã phê duyệt). Bấm "In / Xuất PDF" → print preview hiện:
- Header: "HV SYSTEM" trái, "PHIẾU ĐỀ XUẤT PHÊ DUYỆT | Mã: MS0001" phải
- Sidebar ẩn hoàn toàn
- Bảng thông tin chung, nội dung, chi phí có border
- Phần chữ ký 3 cột ở cuối với tên và ngày phê duyệt
- Không thấy nút, link, sidebar

- [ ] **Step 5: Commit**

```bash
git add app/to-trinh/[id]/page.tsx
git commit -m "feat: improve print CSS with A4 layout, company header, and signature block"
```

---

## Self-Review

**Spec coverage:**
- ✅ Toast system: Task 1 (type) + Task 2 (store) + Task 3 (component) + Task 4 (AppLayout)
- ✅ Print CSS A4: Task 5
- ✅ Print header: Task 5 Step 2
- ✅ Print signature: Task 5 Step 3
- ✅ Auto-dismiss 4s: Task 3 Step 1 (useEffect setTimeout)
- ✅ Notifications không persist: Task 2 Step 9

**Placeholder scan:** Không có TBD. Mọi bước đều có code đầy đủ.

**Type consistency:**
- `AppNotification` định nghĩa Task 1, dùng đúng trong Task 2 (store import) và Task 3 (Toast import)
- `removeNotification(id: string)` nhất quán xuyên suốt
- `addNotification(message, type)` nhất quán trong store và các action

**Ambiguity:** Không có.
