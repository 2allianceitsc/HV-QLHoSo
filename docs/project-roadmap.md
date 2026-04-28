# Project Roadmap

## Project Status

**Current Phase:** Phase 1 (UI Complete, Mock Data)  
**Start Date:** 2026-04-02  
**Status:** Active Development  
**Last Updated:** 2026-04-02

---

## Phase 1: UI & Mock Data Foundation

**Status:** ✅ Complete (as of 2026-04-02)

### Completed
- ✅ Next.js 16.2.2 project scaffold (App Router)
- ✅ React 19 with TypeScript
- ✅ Zustand state management with localStorage persistence
- ✅ Tailwind CSS v4 + CSS variables for theming
- ✅ Dark/light mode via next-themes
- ✅ All page routes implemented
  - Login page (mock user selector)
  - Submission list with tabs and search
  - Create submission form (MS + NT types)
  - Detail view with approval actions
  - Introduction page
- ✅ All UI components
  - AppLayout (sidebar, nav, responsive)
  - StatusBadge (status display)
  - Form controls (input, select, textarea)
- ✅ Mock data structure
  - 9 mock users across 5 departments
  - 10 cost codes (maPhi)
  - 5 approval routing rules
  - 6 sample submissions in various states
- ✅ Approval workflow state machine
  - nhập → chờ duyệt → tham_dinh → phê_duyệt
  - guiToTrinh, thamDinh, pheDuyet, tuChoi actions
- ✅ Role-based action visibility
  - nhan_vien can submit
  - tham_dinh can review
  - phe_duyet can approve

### Known Limitations
- ❌ No backend server
- ❌ No database (all mock data)
- ❌ No persistent storage (loses submissions on refresh)
- ❌ No file upload (UI only)
- ❌ No email notifications
- ❌ No real authentication

---

## Phase 2: Backend Integration

**Target:** Weeks 1-4 after Phase 1 complete

### Sprint 2.1: API Skeleton & Database
**Duration:** 1 week

**Tasks:**
- [ ] Choose backend framework (Node.js Express, Nest.js, or similar)
- [ ] Set up PostgreSQL or MongoDB database
- [ ] Define database schema for:
  - users (user profiles + roles)
  - toTrinhs (submissions)
  - chiPhis (cost line items)
  - approvalHistory (audit trail)
- [ ] Create database migrations
- [ ] Set up API route structure:
  - `POST /api/auth/login`
  - `GET /api/submissions`
  - `POST /api/submissions`
  - `GET /api/submissions/[id]`
  - `PATCH /api/submissions/[id]/status`
  - `POST /api/submissions/[id]/approve`
  - `POST /api/submissions/[id]/reject`
- [ ] Implement basic CRUD endpoints (mock data)

**Success Criteria:**
- API endpoints accept requests and return mock data
- Database schema created and tested
- Migration scripts working

### Sprint 2.2: API Integration with Frontend
**Duration:** 1 week

**Tasks:**
- [ ] Add API call layer in store (or use SWR/React Query)
- [ ] Replace Zustand mock data with API calls
  - `login()` → `POST /api/auth/login`
  - `addToTrinh()` → `POST /api/submissions`
  - `updateToTrinh()` → `PATCH /api/submissions/[id]`
  - `thamDinh()` → `POST /api/submissions/[id]/approve` (reviewer)
  - `pheDuyet()` → `POST /api/submissions/[id]/approve` (approver)
  - `tuChoi()` → `POST /api/submissions/[id]/reject`
- [ ] Handle loading states (show spinners)
- [ ] Handle error states (show error toasts)
- [ ] Add retry logic for failed requests
- [ ] Persist auth token (httpOnly cookie or localStorage)

**Success Criteria:**
- App fetches data from API instead of mock
- Create/update operations persist to database
- Status changes sync immediately

### Sprint 2.3: Authentication & Authorization
**Duration:** 1 week

**Tasks:**
- [ ] Choose auth method:
  - Option A: OAuth (Google, Microsoft)
  - Option B: JWT with custom login
  - Option C: LDAP/Active Directory integration
- [ ] Implement login endpoint with user validation
- [ ] Issue JWT or session tokens
- [ ] Add middleware to verify tokens on API routes
- [ ] Add frontend auth guard (redirect to /login if not authenticated)
- [ ] Implement logout (clear token, redirect)
- [ ] Load user roles from database, not hardcoded

**Success Criteria:**
- Users can log in with real credentials
- Logout clears authentication
- API rejects unauthorized requests
- Role-based access control enforced on backend

### Sprint 2.4: Audit Trail & Validation
**Duration:** 1 week

**Tasks:**
- [ ] Log all approval actions (who, when, status change)
- [ ] Add server-side validation for form inputs
  - Required fields
  - Cost amount > 0
  - Contract dates (start < end)
  - File size limits
- [ ] Prevent invalid state transitions
  - Can't approve twice
  - Can't modify approved submission
  - Wrong role approval rejected
- [ ] Add timestamps to all entities (createdAt, updatedAt)
- [ ] Implement audit trail view (who approved, when, notes)

**Success Criteria:**
- All actions logged to database
- Audit trail visible to admins
- Invalid actions rejected by API
- Data integrity enforced

---

## Phase 3: File Management & Notifications

**Target:** Weeks 5-7 after Phase 1 complete

### Sprint 3.1: File Upload
**Duration:** 1 week

**Tasks:**
- [ ] Choose file storage backend
  - Option A: AWS S3
  - Option B: Azure Blob Storage
  - Option C: Local disk with multipart upload
- [ ] Implement multipart form handling in API
- [ ] Add file upload endpoint: `POST /api/submissions/[id]/files`
- [ ] Validate file types (PDF, DOCX, XLSX only)
- [ ] Validate file size (<10MB per file)
- [ ] Generate presigned URLs for downloads
- [ ] Replace FileDinhKem mock URLs with real paths
- [ ] Add upload progress indicator in UI

**Success Criteria:**
- Files uploaded to storage backend
- Download links work
- File list displays correctly
- File validation prevents large/invalid files

### Sprint 3.2: Email Notifications
**Duration:** 1 week

**Tasks:**
- [ ] Choose email service (SendGrid, AWS SES, SMTP)
- [ ] Create email templates for:
  - Submission received
  - Ready for review (to tham_dinh)
  - Ready for approval (to phe_duyet)
  - Approved (to submitter)
  - Rejected (to submitter + reason)
  - Status update for watchers
- [ ] Add notification logic to approval endpoints
- [ ] Queue notifications (async, don't block API)
- [ ] Add notification preferences UI (optional)
- [ ] Test with multiple email addresses

**Success Criteria:**
- Emails send on status changes
- Email templates look professional
- No spam (one email per meaningful action)

### Sprint 3.3: In-App Notifications
**Duration:** 1 week

**Tasks:**
- [ ] Add notification table to database
- [ ] Create API endpoints for notifications
  - `GET /api/notifications` (user's notifications)
  - `PATCH /api/notifications/[id]/read`
  - `DELETE /api/notifications/[id]`
- [ ] Implement real-time notifications (WebSocket or polling)
  - Option A: WebSocket for real-time
  - Option B: Poll `/api/notifications` every 30s
- [ ] Add notification bell icon in header
- [ ] Show notification list (unread count)
- [ ] Mark as read when clicked
- [ ] Delete old notifications automatically (>30 days)

**Success Criteria:**
- Users see new notifications immediately
- Notification count accurate
- Can dismiss/archive notifications
- Notifications persist across sessions

---

## Phase 4: Advanced Features & Analytics

**Target:** Weeks 8-12 after Phase 1 complete

### Sprint 4.1: Advanced Search & Filtering
**Duration:** 1 week

**Tasks:**
- [ ] Add database indexes for search performance
- [ ] Implement full-text search (by content, not just code/subject)
- [ ] Add advanced filters:
  - By date range (submitted, approved)
  - By approver
  - By department
  - By status
  - By cost range
- [ ] Save search filters (favorite searches)
- [ ] Export search results to CSV
- [ ] Pagination for large result sets (default 20 per page)

**Success Criteria:**
- Search returns results in <500ms
- Filters work independently and in combination
- Export works correctly

### Sprint 4.2: Dashboard & Analytics
**Duration:** 1 week

**Tasks:**
- [ ] Create admin dashboard with:
  - Total submissions (by type, status)
  - Average approval time (by department)
  - Pending submissions (overdue if >5 days)
  - Top approvers (most approvals)
  - Cost summary (total approved, by department)
- [ ] Charts (pie, bar, time-series)
- [ ] Export analytics to PDF/Excel
- [ ] Set up usage monitoring (Google Analytics or custom)

**Success Criteria:**
- Dashboard loads in <2s
- Charts display correctly
- Export formats are correct

### Sprint 4.3: Batch Operations & Templates
**Duration:** 1 week

**Tasks:**
- [ ] Implement bulk approval (select multiple, approve together)
- [ ] Implement rejection with reason (required comment)
- [ ] Create submission templates
  - Save current submission as template
  - Apply template when creating new submission
  - Manage templates (edit, delete)
- [ ] Add comments/notes on submissions (threaded discussion)
- [ ] Implement delegation (approve on behalf of someone)

**Success Criteria:**
- Bulk operations complete in reasonable time
- Templates save time on repeated submissions
- Comments work correctly

---

## Phase 5: Scalability & DevOps

**Target:** Weeks 13+ after Phase 1 complete

### Sprint 5.1: Performance Optimization
**Duration:** 1 week

**Tasks:**
- [ ] Profile bundle size (target <500KB)
- [ ] Implement code splitting (lazy-load pages)
- [ ] Add caching strategy (Redis for frequently accessed data)
- [ ] Optimize database queries (N+1 prevention, indexes)
- [ ] Add request/response compression (gzip)
- [ ] Monitor Core Web Vitals (LCP, FID, CLS)

**Success Criteria:**
- Lighthouse score >85
- API response time <200ms
- Page load time <2s

### Sprint 5.2: Deployment & CI/CD
**Duration:** 1 week

**Tasks:**
- [ ] Choose deployment platform (Vercel, AWS, Azure, on-premises)
- [ ] Set up automated testing (unit, integration tests)
- [ ] Implement linting & code quality checks (ESLint, Prettier)
- [ ] Create build pipeline (GitHub Actions, GitLab CI, etc.)
- [ ] Set up staging environment
- [ ] Implement blue-green deployment
- [ ] Create runbooks for common operations

**Success Criteria:**
- Every commit triggers automated tests
- Deployments happen with single click
- Rollback is quick and painless

### Sprint 5.3: Monitoring & Error Tracking
**Duration:** 1 week

**Tasks:**
- [ ] Set up error tracking (Sentry or similar)
- [ ] Add application logging (Winston, Pino)
- [ ] Monitor API performance (response times, error rates)
- [ ] Set up alerting (on errors, slow requests)
- [ ] Create health check endpoint
- [ ] Implement uptime monitoring
- [ ] Create incident response procedures

**Success Criteria:**
- Errors automatically reported
- Performance metrics visible
- On-call team alerted on issues

---

## Known Gaps & Technical Debt

### Phase 1 Gaps
- **File Upload:** UI present but no backend
- **Email Notifications:** No mail service integration
- **Audit Trail:** Only timestamps, no detailed logs
- **User Sync:** Hardcoded mock users only
- **Search:** Only basic string matching

### Technical Debt
- No unit tests (0% coverage)
- No error boundaries
- No loading states
- No error toast messages
- No form validation (client-side only)
- Zustand store grows with each feature (may need refactoring)

### Security Gaps
- No HTTPS enforcement (Phase 2)
- No CSRF protection (Phase 2)
- No rate limiting (Phase 2)
- No input sanitization (Phase 2)
- No data encryption at rest (Phase 2)

---

## Milestones & Release Timeline

| Phase | Target Date | Key Deliverable |
|-------|------------|-----------------|
| **Phase 1** | 2026-04-02 ✅ | UI scaffold + mock data |
| **Phase 2** | 2026-05-02 | Real backend, auth, file upload |
| **Phase 3** | 2026-06-02 | Notifications, audit trail |
| **Phase 4** | 2026-07-02 | Analytics, advanced search |
| **Phase 5** | 2026-09-02 | Production deployment |

---

## Dependencies & Blockers

### Phase 2 Blockers
- [ ] Database platform chosen (PostgreSQL vs MongoDB vs other)
- [ ] Authentication method approved by client (OAuth vs JWT vs LDAP)
- [ ] API framework decision (Express, Nest.js, FastAPI, etc.)
- [ ] Hosting platform finalized (Vercel, AWS, Azure, on-prem)

### Phase 3 Blockers
- [ ] File storage backend selected (S3, Azure Blob, Local)
- [ ] Email service approved (SendGrid, AWS SES, SMTP)
- [ ] SMTP credentials/keys obtained

### Phase 4 Blockers
- [ ] Analytics requirements clarified with client
- [ ] Advanced search feature set defined
- [ ] Template requirements documented

### Phase 5 Blockers
- [ ] DevOps infrastructure planned
- [ ] CI/CD pipeline chosen
- [ ] Production domain/SSL certificate ready

---

## Success Metrics

### User Engagement
- Submission creation time: <5 minutes (Phase 1 baseline)
- Average approval time: <24 hours (Phase 2 target)
- System uptime: >99.5% (Phase 5 target)

### Quality Metrics
- Test coverage: >60% (Phase 2)
- Build success rate: >95% (Phase 2)
- Deployment frequency: >1x per week (Phase 2)

### Business Metrics
- Submissions submitted: >100/month (Phase 2)
- Approval rate: >80% on first pass (Phase 3)
- User satisfaction: >4/5 (Phase 4)

---

## Open Questions

1. **Database Choice:** PostgreSQL (relational) vs MongoDB (document)? Cost, scalability implications?
2. **Authentication:** Will users authenticate via company SSO (OAuth) or custom login?
3. **File Storage:** Where should files be stored? Budget constraints for S3 vs local storage?
4. **Notifications:** Email required, or in-app only? How urgent is notification delivery?
5. **Deployment:** On-premises server or cloud (AWS, Azure, Vercel)? Security requirements?
6. **Compliance:** Are there audit/compliance requirements (HIPAA, GDPR, SOX)?
7. **Scale:** How many submissions/year expected? Number of concurrent users?
8. **Integration:** Should this integrate with other company systems? CRM, accounting, ERP?
9. **Maintenance:** Who will maintain the system after launch? What's the SLA?
10. **Budget:** What's the total budget for phases 2-5? Any constraints?
