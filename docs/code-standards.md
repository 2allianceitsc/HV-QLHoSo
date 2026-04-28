# Code Standards & Conventions

## Naming Conventions

### Vietnamese Domain Fields
The codebase uses **Vietnamese field names** to align with client terminology. This is intentional and required.

**Examples:**
- `hoTen` (first + last name in camelCase, not snake_case)
- `boPhan` (department)
- `chucVu` (position/title)
- `trangThai` (status)
- `veViec` (subject/topic)
- `noiDung` (content/description)
- `maPhi` (cost code)
- `soTien` (amount)
- `nhaCungCap` (vendor/supplier)
- `ngayTrinh` (submission date)
- `ngayBatDauHD` (contract start date)
- `ngayHetHanHD` (contract end date)
- `thamDinh` (review/technical appraisal action)
- `pheDuyet` (approve/sign-off action)
- `tuChoi` (reject action)

### Case Rules

| Category | Case | Example |
|----------|------|---------|
| Variables (Vietnamese) | camelCase | `hoTen`, `boPhan`, `trangThai` |
| Variables (English) | camelCase | `currentUser`, `toTrinhs`, `avatarColor` |
| Constants | UPPER_SNAKE_CASE | `MOCK_USERS`, `PHAN_QUYEN_DUYET`, `TRANG_THAI_LABEL` |
| Type Names | PascalCase | `ToTrinh`, `User`, `ChiPhiDong`, `TrangThaiToTrinh` |
| Components | PascalCase | `AppLayout`, `StatusBadge` |
| Functions | camelCase | `getUserById()`, `formatCurrency()`, `genMaToTrinh()` |
| Files | kebab-case | `use-store.ts`, `app-layout.tsx` |
| Directories | kebab-case (routes) or lowercase | `to-trinh/`, `components/ui/` |

### Import Paths
Use `@/` alias for root imports (configured in tsconfig.json):
```typescript
import { useStore } from '@/store/useStore';
import { ToTrinh } from '@/types';
import { MOCK_USERS } from '@/lib/mockData';
```

---

## Component Patterns

### Client Components
Mark with `'use client'` directive at top of file:
```typescript
'use client';
import { useState } from 'react';

export default function MyComponent() {
  const [state, setState] = useState(null);
  return <div>...</div>;
}
```

### Functional Component Structure
```typescript
'use client';
import { ReactNode } from 'react';

interface ComponentProps {
  title: string;
  children: ReactNode;
  onSubmit?: (data: unknown) => void;
}

export default function Component({ title, children, onSubmit }: ComponentProps) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
```

### Type Definition for Props
Always create a `Props` interface:
- Props interface optional if no props
- Use `ReactNode` for children
- Mark optional props with `?`
- Add JSDoc comments for complex props

### Component Location Rules
- **Pages:** `app/*/page.tsx` (route-specific)
- **Layouts:** `components/layout/` (structure)
- **UI:** `components/ui/` (reusable, small)
- **Hooks:** `hooks/` (shared logic, if needed)
- **Utils:** `lib/` (pure functions, constants)

---

## State Management Patterns

### Zustand Store
```typescript
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // State fields
  currentUser: User | null;
  toTrinhs: ToTrinh[];
  
  // Actions (methods)
  login: (userId: string) => void;
  updateToTrinh: (id: string, data: Partial<ToTrinh>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      toTrinhs: [],
      
      // Actions use 'set' for immutable updates
      login: (userId) => {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) set({ currentUser: user });
      },
      
      updateToTrinh: (id, data) => {
        set(state => ({
          toTrinhs: state.toTrinhs.map(tt =>
            tt.id === id ? { ...tt, ...data } : tt
          ),
        }));
      },
    }),
    {
      name: 'hv-app-storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
```

### Using the Store in Components
```typescript
'use client';
import { useStore } from '@/store/useStore';

export default function Component() {
  const currentUser = useStore(state => state.currentUser);
  const login = useStore(state => state.login);
  const toTrinhs = useStore(state => state.toTrinhs);
  
  return (
    <div>
      <h1>{currentUser?.hoTen}</h1>
      <button onClick={() => login('u1')}>Login</button>
    </div>
  );
}
```

### Immutable State Updates
**Never mutate directly:**
```typescript
// ❌ Bad
state.toTrinhs[0].trangThai = 'cho_duyet';
set(state);

// ✅ Good
set(state => ({
  toTrinhs: state.toTrinhs.map(tt =>
    tt.id === id ? { ...tt, trangThai: 'cho_duyet' } : tt
  ),
}));
```

---

## Type Definitions

### Domain Types (types/index.ts)
Keep types co-located with domain logic:
```typescript
// Core enums
export type LoaiToTrinh = 'MS' | 'NT';
export type TrangThaiToTrinh = 'nhap' | 'cho_duyet' | 'tham_dinh' | 'phe_duyet' | 'tu_choi';

// Domain entities
export interface User {
  id: string;
  username: string;
  hoTen: string;
  boPhan: string;
  chucVu: string;
  email: string;
  role: 'nhan_vien' | 'tham_dinh' | 'phe_duyet' | 'admin';
  avatarColor: string;
}

export interface ToTrinh {
  id: string;
  loai: LoaiToTrinh;
  ma: string;
  nguoiTrinhId: string;
  boPhan: string;
  ngayTrinh: string;
  veViec: string;
  noiDung: string;
  trangThai: TrangThaiToTrinh;
  thamDinhId: string;
  pheDuyetId: string;
  thamDinhLuc?: string;
  pheDuyetLuc?: string;
  fileDinhKem: FileDinhKem[];
  createdAt: string;
  
  // Type-specific fields (discriminated union pattern)
  chiPhi?: ChiPhiDong[]; // MS only
  ngayBatDauHD?: string; // NT only
  ngayHetHanHD?: string; // NT only
  nhaCungCap?: string;   // NT only
}
```

### Optional vs. Required
- Use `?` for optional fields
- Document with JSDoc if default values apply
- Use discriminated unions for type-specific fields

---

## CSS & Styling Patterns

### CSS Variables (globals.css)
Define theme variables at `:root`:
```css
:root {
  --primary: #3b82f6;
  --surface: #ffffff;
  --surface-2: #f9fafb;
  --border: #e5e7eb;
  --text-primary: #000000;
  --text-secondary: #4b5563;
  --text-muted: #9ca3af;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary: #60a5fa;
    --surface: #1f2937;
    --surface-2: #111827;
    --border: #374151;
    --text-primary: #f3f4f6;
    --text-secondary: #d1d5db;
    --text-muted: #9ca3af;
  }
}
```

### Tailwind Usage
Use utility classes + CSS variable fallbacks:
```html
<!-- Text color -->
<p className="text-text-primary">Primary text</p>
<p className="text-text-secondary">Secondary text</p>

<!-- Background -->
<div className="bg-surface">Card background</div>
<div className="bg-surface-2">Secondary background</div>

<!-- Borders -->
<div className="border border-border">Bordered element</div>

<!-- Status colors (hardcoded, not variables) -->
<div className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
  Approved
</div>
```

### Responsive Design
Mobile-first approach:
```html
<div className="p-4 md:p-6 lg:p-8">Responsive padding</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">Responsive grid</div>
<div className="hidden md:block">Hidden on mobile, visible on tablet+</div>
```

### Dark Mode
All colors should have dark mode variants:
```html
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content
</div>
```

---

## File Organization

### Directory Structure
```
app/
├── app/                    ← Routes (pages)
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   ├── login/page.tsx
│   ├── to-trinh/page.tsx
│   ├── to-trinh/tao/page.tsx
│   └── to-trinh/[id]/page.tsx
├── components/             ← Reusable components
│   ├── layout/AppLayout.tsx
│   └── ui/StatusBadge.tsx
├── lib/                    ← Utilities & constants
│   ├── mockData.ts
│   └── utils.ts
├── store/                  ← State management
│   └── useStore.ts
├── types/                  ← TypeScript types
│   └── index.ts
└── package.json
```

### Module Boundaries
- **Pages** don't share code — each route is independent
- **Components** are reusable across pages
- **Lib** contains pure functions, no React dependencies
- **Store** only contains Zustand stores
- **Types** only contains TypeScript interfaces

---

## Function Patterns

### Utility Functions
Keep pure, no side effects:
```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
```

### Event Handlers
Arrow functions, descriptive names:
```typescript
'use client';
export default function Component() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Action
  };
  
  const handleStatusChange = (newStatus: TrangThaiToTrinh) => {
    // Action
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Lookup Functions
Create helpers for data access:
```typescript
export function getUserById(id: string): User | undefined {
  return MOCK_USERS.find(u => u.id === id);
}

export function getPhanQuyenDuyet(boPhan: string): PhanQuyenDuyet {
  return PHAN_QUYEN_DUYET.find(p => p.boPhan === boPhan) ?? PHAN_QUYEN_DUYET[0];
}
```

---

## Error Handling

### Current Practice
- Mock data assumed valid
- No error boundaries needed yet

### Future Standards
```typescript
// Try-catch for async operations
async function fetchSubmissions() {
  try {
    const res = await fetch('/api/submissions');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    // Show toast to user
    throw error;
  }
}

// Error boundaries for React
'use client';
export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="p-4 bg-red-100 border border-red-300 rounded">
      <h2 className="text-red-800">Something went wrong</h2>
      <p className="text-red-700">{error.message}</p>
    </div>
  );
}
```

---

## TypeScript Best Practices

### Strict Mode
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### Type Annotations
Always annotate function signatures:
```typescript
// ❌ Bad
function getUserById(id) {
  return MOCK_USERS.find(u => u.id === id);
}

// ✅ Good
function getUserById(id: string): User | undefined {
  return MOCK_USERS.find(u => u.id === id);
}
```

### Discriminated Unions
Use for type-specific fields:
```typescript
type Submission = 
  | { loai: 'MS'; chiPhi: ChiPhiDong[] }
  | { loai: 'NT'; ngayBatDauHD: string; ngayHetHanHD: string };

function getSubmissionDetails(sub: Submission) {
  if (sub.loai === 'MS') {
    // TypeScript narrows to MS type
    console.log(sub.chiPhi);
  } else {
    // TypeScript narrows to NT type
    console.log(sub.ngayBatDauHD);
  }
}
```

---

## Comments & Documentation

### JSDoc for Public Functions
```typescript
/**
 * Format amount as Vietnamese currency (VND)
 * @param amount - Numeric amount
 * @returns Formatted string (e.g. "1.000.000 ₫")
 */
export function formatCurrency(amount: number): string {
  // ...
}
```

### Inline Comments
Explain "why", not "what":
```typescript
// ❌ Bad
users = users.filter(u => u.role !== 'admin'); // Remove admins

// ✅ Good
// Exclude admins from approval routing (security)
users = users.filter(u => u.role !== 'admin');
```

### TODO Comments
Mark incomplete work:
```typescript
// TODO: Implement file upload validation
// TODO: Add email notifications on approval
```

---

## Performance Guidelines

### Component Re-renders
- Use Zustand's selector pattern to avoid unnecessary re-renders:
```typescript
// ✅ Selects only needed state
const currentUser = useStore(state => state.currentUser);

// ❌ Triggers re-render on any store change
const store = useStore();
```

### List Rendering
Always use unique, stable keys:
```typescript
// ✅ Good
{toTrinhs.map(tt => (
  <SubmissionItem key={tt.id} submission={tt} />
))}

// ❌ Bad (index key causes re-ordering bugs)
{toTrinhs.map((tt, idx) => (
  <SubmissionItem key={idx} submission={tt} />
))}
```

### Avoid Inline Objects/Functions
Move to component scope to prevent re-creation:
```typescript
// ❌ Bad
<Component style={{ padding: 16 }} onClick={() => handleClick()} />

// ✅ Good
const handleClick = () => { /* ... */ };
const styles = { padding: 16 };
<Component style={styles} onClick={handleClick} />
```

---

## Testing Conventions (Future)

### File Location
- Tests colocated with source: `Component.test.tsx` next to `Component.tsx`
- Utilities tests: `utils.test.ts` next to `utils.ts`

### Test Structure
```typescript
import { render, screen } from '@testing-library/react';
import Component from './Component';

describe('Component', () => {
  it('should render title', () => {
    render(<Component title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Coverage Goals
- Aim for >60% coverage
- Prioritize:
  1. Utility functions (formatCurrency, formatDate)
  2. Store actions (addToTrinh, thamDinh)
  3. Components with logic (SubmissionForm)

---

## Code Review Checklist

Before committing, verify:
- ✅ TypeScript compiles without errors
- ✅ No console warnings or errors
- ✅ Naming follows conventions (Vietnamese domain terms)
- ✅ Components use `'use client'` when needed
- ✅ Zustand updates are immutable
- ✅ CSS uses variables for theming
- ✅ Props are properly typed
- ✅ Functions have JSDoc if public
- ✅ Tests added/updated (if applicable)
- ✅ No hardcoded values (use constants)
- ✅ Dark mode variants included in CSS

---

## Common Patterns to Avoid

| Anti-Pattern | Reason | Fix |
|---|---|---|
| Mutating state directly | Breaks reactivity, hard to debug | Use `set()` with spread operator |
| Mixing Vietnamese & English names | Confusing for bilingual team | Pick one consistently |
| Hardcoding strings | Not maintainable, hard to change | Use constants (MOCK_USERS, TRANG_THAI_LABEL) |
| Props drilling (5+ levels) | Hard to follow, refactor needed | Use store or Context API |
| Inline styles on every element | Maintenance nightmare | Use Tailwind classes or CSS variables |
| Comments explaining "what" code does | Redundant if code is clear | Comment "why" a decision was made |
