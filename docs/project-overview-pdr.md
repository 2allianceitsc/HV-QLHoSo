# HV - Quy Trình Duyệt Hồ Sơ — Project Overview & PDR

## Project Summary

**Project Name:** HV - Quy Trình Duyệt Hồ Sơ (Document/Case Approval Workflow System)  
**Client:** HV  
**Status:** Early development — UI functional with mock data, backend not started  
**Date Created:** 2026-04-02  
**Last Updated:** 2026-04-02

A web-based document approval workflow system for managing two types of submissions:
- **MS (Mua sắm):** Purchasing requests with cost line items
- **NT (Nguyên tắc):** Contract agreements with duration and vendor details

The system implements department-based approval routing with role-based access control across 5 approval stages.

---

## Client Requirements

**Source:** `From Clients/Giao diện web tờ trình.xlsx` (UI specification)  
**Feedback:** `From Clients/góp ý 0104.docx` (dated 2026-04-01)

### Key Requirements
1. **Two document types:** MS (purchasing) and NT (contract) with type-specific fields
2. **Approval workflow:** nhập (draft) → chờ duyệt (submitted) → thẩm định (reviewed) → phê duyệt (approved) or từ chối (rejected)
3. **Department-based routing:** Submissions route to department-specific reviewers and approvers
4. **Role-based actions:** nhanViên (submitter), tham_dinh (reviewer), phe_duyet (approver)
5. **Cost tracking:** MS type tracks cost codes (mã phí) and line-item amounts
6. **Attachments:** Support file uploads (currently UI-only)
7. **User management:** 9 mock users across 5 departments with mock authorization

---

## Functional Requirements

### FR-1: Authentication & User Management
- Login with user selection from 9 mock users
- Role-based access: nhan_vien, tham_dinh, phe_duyet, admin
- Current user persisted to localStorage via Zustand

**Acceptance Criteria:**
- User can log in as any mock user
- User role determines available actions (submit, review, approve)
- Session persists across page refreshes

### FR-2: Submission List & Search
- Display all submissions (MS and NT) in list view
- Tab-based filtering by type (MS / NT)
- Search by submission code (mã tờ trình) or subject (về việc)
- Show submission count by status

**Acceptance Criteria:**
- List loads mock data on page load
- Search filters results in <100ms
- Tab switching updates list without reload
- Status counts are accurate

### FR-3: Create Submission
- Form supports MS and NT types (toggle)
- MS: add multiple cost line items (mã phí, amount, vendor)
- NT: contract dates (start/end) and vendor name
- Auto-generate submission code (MS0001, NT0001, etc.)
- Attach multiple files (UI prepared, upload not yet implemented)

**Acceptance Criteria:**
- Form validates required fields
- Cost items can be added/removed dynamically
- Submission code auto-increments correctly
- File attachment UI works (download not implemented)

### FR-4: View & Approve Submission Details
- Show full submission details with read-only fields
- Display approval history (timestamps, approver names)
- Contextual action buttons based on user role and submission status:
  - nhan_vien: submit to review
  - tham_dinh: move to review or reject
  - phe_duyet: approve or reject

**Acceptance Criteria:**
- All submission fields display correctly
- Approval history is chronological
- Action buttons appear only when authorized
- Actions update status immediately

### FR-5: Theming (Dark/Light Mode)
- System-level dark/light mode toggle
- CSS variables drive all colors
- Persists to localStorage via next-themes

**Acceptance Criteria:**
- Theme toggle switches all colors correctly
- Theme persists across sessions
- All components respect theme

### FR-6: Introduction Page
- System overview and user guide
- Role descriptions and workflow diagram
- How to create and approve submissions

**Acceptance Criteria:**
- Page loads without errors
- Content is clear and instructive

---

## Non-Functional Requirements

### NFR-1: Performance
- Page load time: <2s
- Search filters: <100ms
- Smooth animations on theme switch

### NFR-2: Accessibility
- Color contrast meets WCAG AA
- Keyboard navigation supported
- Semantic HTML for screen readers

### NFR-3: Responsive Design
- Mobile: 320px+
- Tablet: 768px+
- Desktop: 1024px+
- Sidebar collapsible on mobile

### NFR-4: Code Quality
- TypeScript strict mode enabled
- No console warnings/errors
- Unit test coverage >60% (phase 2)

### NFR-5: State Management
- All state centralized in Zustand
- localStorage persistence key: `hv-app-storage`
- Immutable updates

---

## User Roles & Workflows

### User Types (9 mock users across 5 departments)

| Role | Department | Action |
|------|-----------|--------|
| nhan_vien | IT, Kế toán, Marketing | Submit, view own submissions |
| tham_dinh | IT, Kế toán, Marketing, Mua hàng | Review submissions, approve/reject |
| phe_duyet | IT, Kế toán, Marketing, Mua hàng, Ban lãnh đạo | Final approval or rejection |
| admin | — | (Future: manage users, templates) |

### Approval Workflow

```
┌─ Duyệt (Submission in draft)
│
├─ Chờ duyệt (Submitted to review)
│  ├─ Tham định (Reviewer reviews)
│  │  ├─ → Phê duyệt (Reviewer approves, sent to final approver)
│  │  └─ → Từ chối (Reviewer rejects)
│  └─ → Từ chối (Initial submission rejected)
│
├─ Tham định (Under review)
│  ├─ → Phê duyệt (Sent to final approver)
│  └─ → Từ chối (Rejected)
│
└─ Phê duyệt (Final approval)
```

**Department-Based Routing:**
- IT: tham_dinh=u2 (Trương Văn Tân), phe_duyet=u5 (Dương Văn Hồng)
- Kế toán: tham_dinh=u3 (Dương Hà My), phe_duyet=u5
- Marketing: tham_dinh=u3, phe_duyet=u4 (Trần Hồng Nhung)
- Mua hàng: tham_dinh=u1 (Dương Thuý Quỳnh), phe_duyet=u6 (Lê Thị Hồng Vân)

---

## Technical Constraints

### Current State (Mock Data)
- No backend server
- All data in-memory, populated from `lib/mockData.ts`
- State persists only `currentUser` to localStorage
- Submission state lost on page refresh (except user)

### Planned Backend Integration
1. **Database:** Decide on structure (PostgreSQL, MongoDB, etc.)
2. **API:** REST or GraphQL for submissions, users, approvals
3. **Authentication:** Replace mock login with OAuth/JWT
4. **File Storage:** S3, Azure Blob, or local storage for attachments
5. **Notifications:** Email/in-app notifications for approval events

---

## Known Gaps & Future Work

### Phase 1 (Current)
- ✅ UI scaffold with mock data
- ✅ Approval workflow state management
- ✅ Dark/light theme system
- ⚠️ File attachment UI only (no upload)
- ⚠️ No email notifications
- ⚠️ No audit trail beyond timestamps

### Phase 2 (Next)
- Backend API integration
- Real file upload (S3 or similar)
- Email notifications on approval/rejection
- Advanced search (by date range, approver, status)
- User management admin panel

### Phase 3 (Future)
- Analytics dashboard (submissions by department, approval times)
- Template management for common submission types
- Bulk actions (approve multiple submissions)
- API for integrating with other systems

---

## Open Questions

1. **File Storage:** Where should attachments be stored? Local disk, S3, or Azure Blob?
2. **Notifications:** Should the system send emails on status changes, or in-app only?
3. **Audit Trail:** What level of audit logging is required (all actions or just approvals)?
4. **User Sync:** Will user data come from an external directory (AD/LDAP) or managed in-app?
5. **Approval Hierarchy:** Are there any escalation rules if an approver is unavailable?
6. **Submission Templates:** Should users be able to create reusable templates?
7. **Bulk Operations:** Is there a need to approve/reject multiple submissions at once?
