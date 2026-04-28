# Codebase Summary

## Directory Structure

```
D:/Clients/HV-QuyTrinhDuyetHoSo/
├── CLAUDE.md                        ← Project guidelines
├── From Clients/
│   ├── Giao diện web tờ trình.xlsx  ← UI specification
│   └── góp ý 0104.docx              ← Client feedback (2026-04-01)
│
└── app/                             ← Next.js application root
    ├── AGENTS.md                    ← Breaking changes notice
    ├── CLAUDE.md                    ← Legacy notice
    ├── next.config.ts               ← Next.js configuration
    ├── tsconfig.json                ← TypeScript config
    ├── package.json                 ← Dependencies (see below)
    │
    ├── app/                         ← App Router pages
    │   ├── layout.tsx (20 LOC)      ← Root layout + ThemeProvider
    │   ├── page.tsx                 ← Home, redirects to /to-trinh
    │   ├── globals.css              ← CSS variables, theming
    │   │
    │   ├── login/
    │   │   └── page.tsx (82 LOC)    ← Mock user login selector
    │   │
    │   ├── introduce/
    │   │   └── page.tsx (504 LOC)   ← System introduction & guide
    │   │
    │   ├── to-trinh/                ← Submission management
    │   │   ├── page.tsx (180 LOC)   ← List submissions, filter, search
    │   │   ├── tao/
    │   │   │   └── page.tsx (278 LOC) ← Create new submission form
    │   │   └── [id]/
    │   │       ├── page.tsx (224 LOC) ← Detail view + approval actions
    │   │       └── sua/
    │   │           └── page.tsx (3.5K LOC) ← Edit draft submission form
    │   │
    │   └── bao-cao/                 ← Reports
    │       └── page.tsx (14K LOC)   ← Contract expiry report with filters
    │
    ├── components/
    │   ├── layout/
    │   │   └── AppLayout.tsx (186 LOC) ← Sidebar + responsive nav
    │   │
    │   ├── to-trinh/
    │   │   └── ToTrinhForm.tsx       ← Shared form component (create/edit)
    │   │
    │   └── ui/
    │       └── StatusBadge.tsx (21 LOC) ← Status badge + approver name
    │
    ├── lib/
    │   ├── mockData.ts (151 LOC)    ← Mock users, cost codes, approvals, submissions
    │   └── utils.ts (54 LOC)        ← Helpers: format, lookup, generate
    │
    ├── store/
    │   └── useStore.ts (99 LOC)     ← Zustand store + localStorage persist
    │
    └── types/
        └── index.ts                 ← TypeScript domain types

**Total Source LOC:** ~1,380 (excluding node_modules, .next)
```

---

## Key Dependencies

| Package | Version | Role |
|---------|---------|------|
| next | 16.2.2 | Framework (App Router, webpack mode) |
| react | 19.2.4 | UI library |
| react-dom | 19.2.4 | DOM rendering |
| zustand | 5.0.12 | State management + localStorage persist |
| next-themes | 0.4.6 | Dark/light mode system |
| lucide-react | 1.7.0 | Icon library |
| @tailwindcss/postcss | 4 | CSS utility framework |
| tailwindcss | 4 | CSS processing |
| typescript | 5 | Type checking |

**Dev Server:** Port 3016, bound to `0.0.0.0`, webpack mode enabled

---

## Module Responsibilities

### `app/layout.tsx`
- Root layout wrapper
- Initializes `ThemeProvider` from next-themes
- Applies Tailwind CSS

### `app/page.tsx`
- Home page → redirects to `/to-trinh`

### `app/login/page.tsx`
- Mock user selector
- 9 users across 5 departments
- Calls `useStore().login(userId)`
- Stores user in Zustand (persisted)

### `app/introduce/page.tsx`
- System overview and user guide
- Explains roles and approval workflow
- How to use the application

### `app/to-trinh/page.tsx` (Submission List)
- Fetch submissions from store
- Tab filter: MS / NT
- Advanced filter panel: status, date range (ngayTrinh from/to)
- Search by `ma` (code) or `veViec` (subject)
- Display columns: Mã, Về việc, Nhà cung cấp, HĐ đã ký, Ngày trình, Người trình, Trạng thái
- Status counts (nhập, chờ duyệt, tham định, phê duyệt, từ chối)
- Department-based visibility: nhan_vien sees only own submissions, others see all
- Link to detail view (`/to-trinh/[id]`)

### `app/to-trinh/tao/page.tsx` (Create Submission)
- Form with type toggle (MS/NT)
- **MS-specific fields:** Dynamic cost line items (mã phí, amount, vendor)
- **NT-specific fields:** Contract dates (start/end), vendor name
- Subject (về việc), description (nội dung)
- File attachment UI (no upload yet)
- Auto-generate `ma` via `genMaToTrinh()`
- Create submission via `useStore().addToTrinh()`

### `app/to-trinh/[id]/page.tsx` (Submission Detail)
- Display all submission fields (read-only)
- Approval history with timestamps
- Department name and submitter name (lookup from store)
- Contextual action buttons:
  - nhan_vien: "Gửi để duyệt" (submit to review) → `guiToTrinh(id)`
  - tham_dinh: "Thẩm định" (review) → `thamDinh(id)` or "Từ chối" → `tuChoi(id)`
  - phe_duyet: "Phê duyệt" (approve) → `pheDuyet(id)` or "Từ chối" → `tuChoi(id)`
- Status badge with color

### `components/layout/AppLayout.tsx`
- Sidebar layout (240px wide, 64px collapsed)
- Navigation links: /to-trinh, /introduce, /login
- User profile card (name, role, department)
- Logout button
- Responsive: drawer on mobile, always visible on desktop
- Collapsible via state

### `components/ui/StatusBadge.tsx`
- Renders status as colored badge
- Component for approver name display

### `lib/mockData.ts` (Mock Data)
- **MOCK_USERS (9):** id, username, hoTen, boPhan, chucVu, email, role, avatarColor
- **MOCK_MA_PHI (10):** Cost codes (mã phí) — id, ma, ten, boPhan
- **PHAN_QUYEN_DUYET (5):** Approval routing by department — boPhan, thamDinhId, pheDuyetId
- **MOCK_TO_TRINH (6):** Sample submissions (4 MS, 2 NT) in various states

### `lib/utils.ts` (Utility Functions)
- `getUserById(id)` — Lookup user by ID
- `getMaPhiByMa(ma)` — Lookup cost code by code
- `getPhanQuyenDuyet(boPhan)` — Lookup approval routing by department
- `formatCurrency(amount)` — Format as Vietnamese currency (VND)
- `formatDate(dateStr)` — Format as dd/MM/yyyy
- `today()` — Return today's date as ISO string
- `genMaToTrinh(loai, existing)` — Auto-generate submission code (MS0001, NT0001, etc.)
- **TRANG_THAI_LABEL** — Status → Vietnamese label mapping
- **TRANG_THAI_COLOR** — Status → Tailwind CSS classes
- `getInitials(name)` — Extract initials for avatars

### `store/useStore.ts` (Zustand Store)
**State:**
- `currentUser: User | null` (default: u7 = hungnt, IT employee)
- `toTrinhs: ToTrinh[]` (all submissions)

**Actions:**
- `login(userId)` — Set current user
- `logout()` — Clear current user
- `addToTrinh(data)` — Create new submission, auto-generate ID and code
- `updateToTrinh(id, data)` — Update fields
- `deleteToTrinh(id)` — Remove submission
- `guiToTrinh(id)` — Change status to "chờ duyệt"
- `thamDinh(id)` — Change status to "tham_dinh", set timestamp
- `pheDuyet(id)` — Change status to "phê_duyệt", set timestamp
- `tuChoi(id)` — Change status to "từ chối"

**Persistence:**
- localStorage key: `hv-app-storage`
- Only persists `currentUser`, not submissions (mock data reset on refresh)

### `types/index.ts` (TypeScript Types)

**Core Types:**
- `LoaiToTrinh = 'MS' | 'NT'` — Submission type
- `TrangThaiToTrinh = 'nhap' | 'cho_duyet' | 'tham_dinh' | 'phe_duyet' | 'tu_choi'` — Status
- `User` — id, username, hoTen, boPhan, chucVu, email, role, avatarColor
- `ToTrinh` — Main entity (common + type-specific fields)
  - Common: id, loai, ma, nguoiTrinhId, boPhan, ngayTrinh, veViec, noiDung, trangThai, thamDinhId, pheDuyetId, thamDinhLuc, pheDuyetLuc, fileDinhKem, createdAt
  - MS-specific: `chiPhi: ChiPhiDong[]`
  - NT-specific: `ngayBatDauHD, ngayHetHanHD, nhaCungCap`
- `ChiPhiDong` — Cost line item (id, maPhi, tenMaPhi, soTien, nhaCungCap)
- `MaPhi` — Cost code (id, ma, ten, boPhan)
- `PhanQuyenDuyet` — Approval routing (boPhan, thamDinhId, pheDuyetId)
- `FileDinhKem` — Attachment (id, ten, url)

---

## Data Flow

### Create Submission (MS Type Example)
```
1. User navigates to /to-trinh/tao
2. Form displays with MS selected
3. User fills subject, description, adds 2 cost items
4. User clicks "Tạo"
5. Form calls useStore().addToTrinh({...})
6. Store:
   - Generates ID: tt-{timestamp}
   - Generates code: MS0005 (5th MS submission)
   - Creates ToTrinh object
   - Prepends to toTrinhs array
   - Returns ID
7. Page redirects to /to-trinh
8. List re-renders with new submission (status: nhập)
```

### Approve Submission
```
1. Approver views /to-trinh/[id]
2. Page checks useStore().currentUser.role
3. If tham_dinh, shows "Thẩm định" and "Từ chối" buttons
4. User clicks "Thẩm định"
5. Button calls useStore().thamDinh(id)
6. Store updates toTrinhs[idx].trangThai = 'tham_dinh'
7. Store updates toTrinhs[idx].thamDinhLuc = now
8. Page re-renders with new status
```

---

## Component Hierarchy

```
<RootLayout>
  <ThemeProvider>
    <AppLayout>
      <Sidebar>
        <NavLink>/to-trinh</NavLink>
        <NavLink>/introduce</NavLink>
        <NavLink>/login</NavLink>
        <UserProfile>
          <LogoutButton>
      </Sidebar>
      <MainContent>
        <Page>  ← Dynamic based on route
          <SubmissionList /> | <CreateForm /> | <DetailView />
          <StatusBadge /> (in list/detail)
</RootLayout>
```

---

## Styling Architecture

### CSS Variables (globals.css)
```css
--primary          /* Brand color (blue) */
--surface          /* Card/container background */
--surface-2        /* Secondary background */
--border           /* Border color */
--text-primary     /* Main text */
--text-secondary   /* Secondary text */
--text-muted       /* Faded text */
--success          /* Green for approved */
--warning          /* Yellow for pending */
--danger           /* Red for rejected */
```

**Dark Mode:** CSS variables have `:dark` pseudo-class overrides

### Tailwind CSS
- Utility-first approach
- Custom Tailwind v4 config (via @tailwindcss/postcss)
- No component library (shadcn, Radix) — custom components only
- Responsive prefixes: sm:, md:, lg:, xl:
- Dark mode: dark:

---

## Workflow Architecture

### Submission States & Transitions
```
nhập (draft)
  ↓
chờ duyệt (submitted for review)
  ├─ tham_dinh (reviewer stage)
  │  ├─ phê_duyệt (sent to final approver)
  │  └─ từ_chối (rejected by reviewer)
  └─ từ_chối (rejected immediately)

phê_duyệt (approved)
```

### State Mutation Rules
1. nhan_vien can only submit (nhập → chờ duyệt)
2. tham_dinh can review (chờ duyệt → tham_dinh or từ_chối)
3. phe_duyet can approve (tham_dinh → phê_duyệt or từ_chối)
4. All state changes tracked with timestamps (thamDinhLuc, pheDuyetLuc)

---

## Key Design Decisions

1. **Mock Data in Memory:** All data reset on refresh (except currentUser)
2. **Zustand for State:** Simpler than Redux, built-in persistence support
3. **Tailwind CSS:** Utility-first for rapid development without bloated CSS
4. **No Component Library:** Custom components give full flexibility for client design
5. **Vietnamese Field Names:** Domain language matches client terminology
6. **Department-Based Routing:** Approval workflow tied to departments, not individuals
7. **Webpack Mode:** Needed for development stability on this system

---

## File Sizes & Code Metrics

| File | LOC | Purpose |
|------|-----|---------|
| introduce/page.tsx | 504 | Longest: system guide |
| to-trinh/tao/page.tsx | 278 | Create form |
| to-trinh/[id]/page.tsx | 224 | Detail + actions |
| components/layout/AppLayout.tsx | 186 | Layout wrapper |
| to-trinh/page.tsx | 180 | List + search |
| lib/mockData.ts | 151 | Mock data |
| store/useStore.ts | 99 | State management |
| login/page.tsx | 82 | Login selector |
| components/ui/StatusBadge.tsx | 21 | Status display |

---

## Next Steps for Development

1. **Backend Integration:** Replace mock data with API calls
2. **File Upload:** Implement actual file storage (S3, etc.)
3. **Email Notifications:** Send emails on status changes
4. **User Management:** Load users from directory (AD/LDAP) or user table
5. **Audit Trail:** Log all state changes for compliance
6. **Testing:** Add unit tests (Jest, React Testing Library)
7. **Performance:** Monitor bundle size, implement code splitting
