# System Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Next.js 16.2.2 Application            │
│         (Client-Side Rendering, App Router)     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │      React 19.2.4 Components           │    │
│  │  (Pages + Shared Components)           │    │
│  │  - to-trinh/ (list, create, detail)    │    │
│  │  - AppLayout (sidebar, nav)            │    │
│  │  - StatusBadge (status display)        │    │
│  └────────────────────────────────────────┘    │
│                  ↓                              │
│  ┌────────────────────────────────────────┐    │
│  │      Zustand v5 State Store            │    │
│  │  (currentUser, toTrinhs[])             │    │
│  │  - Persists currentUser to localStorage│    │
│  │  Key: 'hv-app-storage'                 │    │
│  └────────────────────────────────────────┘    │
│                  ↓                              │
│  ┌────────────────────────────────────────┐    │
│  │       Mock Data (In-Memory)            │    │
│  │  lib/mockData.ts                       │    │
│  │  - 9 mock users                        │    │
│  │  - 10 cost codes (maPhi)               │    │
│  │  - 5 approval routing rules            │    │
│  │  - 6 sample submissions                │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │   Styling: Tailwind CSS v4 + CSS Vars │    │
│  │   - globals.css (theme variables)      │    │
│  │   - Dark/light mode via next-themes    │    │
│  │   - Lucide React icons                 │    │
│  └────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
         ↓
   localStorage (Browser)
   - hv-app-storage: currentUser
```

**Note:** No backend server. All state managed client-side. Data lost on page refresh (except currentUser).

---

## Tech Stack Decisions

### Framework: Next.js 16.2.2
**Why:** 
- Modern App Router (file-based routing)
- Built-in TypeScript support
- `'use client'` directive for client components
- Optimized for production builds
- Built-in CSS support (Tailwind)

**Notes:**
- Running with `--webpack` flag (required for this development environment)
- Port 3016, bound to `0.0.0.0` for local network access

### State Management: Zustand v5 + localStorage
**Why:**
- Lightweight (no Redux boilerplate)
- Built-in `persist` middleware for localStorage
- Simple API (create, set, get)
- TypeScript first-class support

**Alternative Considered:** Redux — rejected due to complexity for this scope

**Persistence Strategy:**
- Only `currentUser` is persisted (user session)
- Submissions (`toTrinhs`) reset on page refresh (mock data reloads)
- Key: `hv-app-storage`

### Styling: Tailwind CSS v4 + CSS Variables
**Why:**
- Utility-first approach speeds development
- v4 uses `@tailwindcss/postcss` (modern plugin)
- CSS variables enable theme switching without SCSS
- No runtime CSS-in-JS overhead
- Dark mode built-in

**Custom Theme Variables** (globals.css):
```css
--primary, --surface, --surface-2, --border
--text-primary, --text-secondary, --text-muted
--success, --warning, --danger
```

**Dark Mode:** Handled via `next-themes` + CSS variable overrides

### Components: No UI Library
**Why:**
- Full design control
- Minimal dependencies
- Faster development for custom designs
- Client specifications from `From Clients/Giao diện web tờ trình.xlsx`

**Custom Components:**
- `AppLayout` — Sidebar + responsive nav
- `StatusBadge` — Status display with colors

**Icons:** Lucide React v1.7.0 (small, tree-shakeable icon library)

### Data Shapes: TypeScript Types
All domain objects strongly typed in `types/index.ts`:
- `ToTrinh` — Submission (union type: MS + NT)
- `User` — User profile + role
- `ChiPhiDong` — Cost line item
- `MaPhi` — Cost code catalog
- `TrangThaiToTrinh` — Status enum

---

## State Management Architecture

### Zustand Store Structure
```typescript
interface AppState {
  // State
  currentUser: User | null
  toTrinhs: ToTrinh[]
  
  // Auth actions
  login(userId: string): void
  logout(): void
  
  // Submission CRUD
  addToTrinh(data): string
  updateToTrinh(id, data): void
  deleteToTrinh(id): void
  
  // Workflow actions
  guiToTrinh(id): void        // nhập → chờ duyệt
  thamDinh(id): void          // chờ duyệt → tham_dinh
  pheDuyet(id): void          // tham_dinh → phê_duyệt
  tuChoi(id): void            // * → từ_chối
}
```

### Immutable Update Pattern
All state mutations use Zustand's `set()` with spread operators:
```typescript
set(state => ({
  toTrinhs: state.toTrinhs.map(tt => 
    tt.id === id ? { ...tt, ...data } : tt
  )
}))
```

### localStorage Persistence
```typescript
persist(
  (set, get) => ({ /* store definition */ }),
  {
    name: 'hv-app-storage',
    partialize: (state) => ({ currentUser: state.currentUser })
  }
)
```
Only `currentUser` is persisted; submissions are ephemeral.

---

## Routing Structure

### File-Based Routes (Next.js App Router)
```
/                          → Redirect to /to-trinh
/login                     → User selection & login
/introduce                 → System guide & overview
/to-trinh                  → Submission list + search
/to-trinh/tao              → Create new submission
/to-trinh/[id]             → View submission details + approve
```

### Dynamic Routes
- `/to-trinh/[id]` — Submission detail page (id from URL params)
- Route parameter accessed via `useParams()` hook

### Redirects
- Home page (`/`) redirects to `/to-trinh` (main workflow)

---

## Data Layer (Mock → Real Transition Path)

### Current: Mock Data
**Location:** `lib/mockData.ts`
- MOCK_USERS (hardcoded 9 users)
- MOCK_MA_PHI (cost codes)
- PHAN_QUYEN_DUYET (approval routing)
- MOCK_TO_TRINH (6 sample submissions)

**Initialization:** Store loads mock data at startup via imports

### Future: Backend Integration

#### Phase 1: API Skeleton
```typescript
// api/submissions/route.ts (Route Handler)
export async function GET() {
  // Fetch from database
  const submissions = await db.toTrinh.findMany();
  return Response.json(submissions);
}

export async function POST(req: Request) {
  // Create submission
  const data = await req.json();
  const submission = await db.toTrinh.create(data);
  return Response.json(submission, { status: 201 });
}
```

#### Phase 2: Replace Mock Calls
**Before:**
```typescript
const store = useStore(); // Zustand with mock data
```

**After:**
```typescript
// In useStore initialization:
useEffect(() => {
  fetch('/api/submissions')
    .then(r => r.json())
    .then(data => setToTrinhs(data))
}, [])
```

#### Phase 3: Authentication
- Replace mock login selector with OAuth or JWT
- Add `Authorization: Bearer {token}` to API calls
- Verify user role on backend

#### Phase 4: File Storage
- S3/Azure Blob for attachments
- Update `FileDinhKem` to reference cloud URLs
- API endpoint for presigned upload URLs

---

## Component Architecture

### Page Components (Routes)
Each route is a file-based page component:
- Fetch store data via `useStore()`
- Render UI
- Handle user interactions
- Dispatch store actions

**Pattern:**
```typescript
'use client';
import { useStore } from '@/store/useStore';
import { useParams } from 'next/navigation';

export default function Page() {
  const store = useStore();
  const params = useParams();
  
  return (
    <AppLayout>
      {/* Content */}
    </AppLayout>
  )
}
```

### Layout Component
`AppLayout.tsx` wraps all content:
- Sidebar with navigation
- User profile & logout
- Responsive drawer on mobile
- Collapsible sidebar on desktop

### UI Components
Reusable, small components:
- `StatusBadge` — Status display with color
- Future: Form inputs, buttons, modals

---

## Theming System

### CSS Variables (globals.css)
```css
:root {
  /* Light mode defaults */
  --primary: #3b82f6;
  --surface: #ffffff;
  --surface-2: #f9fafb;
  --text-primary: #000000;
  /* ... more vars */
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode overrides */
    --primary: #60a5fa;
    --surface: #1f2937;
    --surface-2: #111827;
    --text-primary: #ffffff;
    /* ... more vars */
  }
}
```

### next-themes Integration
Provides `<ThemeProvider>` in root layout:
```typescript
<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>
```

### Usage in Components
Components use Tailwind utilities that reference CSS variables:
```html
<div className="bg-surface-2 text-text-primary">
  {/* Automatically picks light/dark values */}
</div>
```

---

## Workflow Implementation

### Status Transitions (State Machine)
```
Initial: nhập (draft)
  ↓
Action: guiToTrinh() → chờ duyệt (submitted)
  ↓
Action: thamDinh() → tham_dinh (under review)
  ├─ Action: pheDuyet() → phê_duyệt (approved) ✅
  └─ Action: tuChoi() → từ_chối (rejected) ❌
```

### Role-Based Access
Each page checks `currentUser.role` to show/hide actions:
```typescript
if (currentUser.role === 'nhan_vien') {
  // Show "Gửi để duyệt" button
}
if (currentUser.role === 'tham_dinh') {
  // Show "Thẩm định" button
}
```

### Department-Based Routing
When submitting, system assigns reviewers based on department:
```typescript
const routing = getPhanQuyenDuyet(submission.boPhan);
// routing.thamDinhId → reviewer
// routing.pheDuyetId → approver
```

---

## Performance Considerations

### Current (Mock)
- No network latency
- All operations instant (<50ms)
- Suitable for development & testing

### Future Optimizations
1. **API Caching:** Use SWR or React Query for data fetching
2. **Code Splitting:** Lazy-load page components
3. **Images:** Optimize with `next/image`
4. **Fonts:** Use `next/font` for Google/local fonts
5. **Monitoring:** Add error tracking (Sentry)

### Bundle Size
- No UI libraries (shadcn, Radix) — smaller bundle
- Tailwind CSS minification built-in
- Tree-shaking for unused code

---

## Security Considerations

### Current (Development)
- No authentication (mock login)
- No authorization checks on backend (N/A)
- All data visible to all users (mock only)

### Future Implementation
1. **Authentication:**
   - OAuth (Google, Microsoft) or custom JWT
   - Secure token storage (httpOnly cookies)

2. **Authorization:**
   - Backend validates user role before approving
   - Field-level permissions (e.g., cost visibility by department)

3. **Data Protection:**
   - HTTPS only
   - Sensitive data encrypted at rest
   - Audit trail of all approvals

4. **Input Validation:**
   - Server-side validation for all form inputs
   - Sanitize user-generated content
   - Rate limiting on API endpoints

---

## Error Handling

### Current (Mock)
- No error states
- All operations assumed to succeed

### Future Patterns
```typescript
try {
  const result = await fetch('/api/submit', { method: 'POST', body })
  if (!result.ok) throw new Error('Failed to submit')
  // Update store with new submission
} catch (error) {
  // Show error toast to user
  console.error('Submission failed:', error)
}
```

---

## Scalability

### Current Limitations
- All data in-memory (max ~100 submissions)
- No pagination (mock data is small)
- Single-user focused (no concurrency)

### Scaling Strategies
1. **Database:** Move to PostgreSQL/MongoDB for persistent storage
2. **Pagination:** Add limit/offset to API
3. **Search:** Add full-text search via database
4. **Caching:** Redis for frequently accessed data
5. **CDN:** CloudFront/Cloudflare for static assets
6. **Load Balancing:** Multiple app instances behind load balancer

---

## Development Environment

### Setup
```bash
cd app/
npm install
npm run dev      # Runs on port 3016, webpack mode
```

### Build & Deploy
```bash
npm run build    # Production build
npm run start    # Start production server
```

### Configuration Files
- `next.config.ts` — Next.js settings
- `tsconfig.json` — TypeScript strict mode
- `tailwind.config.ts` — Tailwind CSS theme (if exists)
- `package.json` — Dependencies & scripts

---

## Deployment Architecture (Planned)

### Target: Vercel (Next.js Native)
- Git-based deployment (push → auto-deploy)
- Built-in environment variables
- Automatic HTTPS
- Edge caching for static assets
- Serverless functions for API routes

### Alternative: Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Monitoring & Logging (Future)

### Client-Side
- Error boundary component for catch errors
- Console logging (dev only)
- Sentry for error tracking

### Server-Side (When API exists)
- Application logs (stdout)
- Database query logs
- API request/response logging
- Performance metrics (response times)

### Analytics
- User behavior (page views, button clicks)
- Submission workflow metrics (approval times)
- Error rates by endpoint
