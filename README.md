# HV — Quy Trình Duyệt Hồ Sơ — Developer Guide

Web-based document/case approval workflow system. This DEV directory is the monorepo root.

> **Origin:** Bootstrapped from Vibe365 framework (HR system). Auth, email, user management, and infrastructure are inherited as-is. Document approval workflow is the new business logic to be built on top. See [BUSINESS_MODULES.md](./BUSINESS_MODULES.md) for what came pre-built and what is HR-business that can be stripped.

**Tech Stack:** React 18 + Vite (FE) · NestJS 10 + PostgreSQL + Prisma (BE) · Socket.IO (real-time) · Railway (deploy)

**Single user-facing port.** Production: NestJS serves both API and FE static on `3028`. Dev: open `http://localhost:5418` (Vite) — `/api` requests are transparently proxied to the internal NestJS on `3028`. You only ever type **one URL** in the browser.

Ports are hardcoded (Vibe365 base + 28) to avoid conflicts when both projects run side by side:
- Public URL (dev): `http://localhost:5418`
- Public URL (prod): `http://localhost:3028`
- Internal BE (dev only): `:3028` — proxied, not for direct use

## Quick Start

### Prerequisites

```bash
node --version    # Node 18+
pnpm --version    # pnpm 9+
```

### Setup

```bash
cd DEV
pnpm install
# .env is already pre-configured with the dev DB (Railway). Adjust if running local Postgres.

pnpm db:migrate
pnpm db:seed     # optional — seeds default settings/branding/email config
```

### Run Locally

```bash
pnpm dev         # 1 command, 1 URL to open
```

Open **http://localhost:5418** — that's it. Vite proxies `/api/*` to NestJS internally; you don't interact with the BE port directly.

- App + API: http://localhost:5418
- Swagger:   http://localhost:5418/api/docs (also accessible at :3028/api/docs if needed)

### Build (production = truly 1 port)

```bash
pnpm build       # web build → copy to api/public → nest build
pnpm start       # NestJS serves API + FE static on :3028
```

In production it's literally 1 process, 1 port. Open `http://localhost:3028` and NestJS handles both API and React routing.

## Database

| Env  | URL |
|------|-----|
| Dev  | `postgresql://postgres:****@switchback.proxy.rlwy.net:16603/railway` |
| Prod | `postgresql://postgres:****@switchback.proxy.rlwy.net:43733/railway` |

Both DBs are empty. Migrations run on first deploy.

## Deployment (Railway)

Single-service deploy. `railway.toml` builds web + api in one go, then runs `prisma migrate deploy` before starting the Node server. Same flow as Vibe365 — see `../docs/deployment-guide.md` (TODO: copy/adapt from Vibe365 if needed).

## What's Pre-Built

- Auth (login, JWT cookies, refresh, password reset, 2FA TOTP + email OTP)
- User management (Staff CRUD + Role/Permission RBAC)
- Email (config, templates, queue, jobs)
- System (settings, audit log, API request log, error log, integrity checks, warnings)
- Branding (logo + favicon upload)
- Notifications (in-app + Socket.IO real-time)
- Org structure (Company / Department / Office / Position / Team) — **reusable for approval routing**
- Profile (user self-service)

## What's HR-Specific (candidates to remove)

See [BUSINESS_MODULES.md](./BUSINESS_MODULES.md). Short list:
- `attendance/` — clock in/out, time tracking
- `dashboard/` — HR attendance dashboard
- `reports/` — HR reports
- `client/` — business-client management
- `status/` + `system/statuses/` — staff status definitions
- `vibe-icons/` + `system/vibe-icons/` — Vibe-specific icon set

## Principles

See `./principles/` for full coding/api/security/git/testing/ui-ux/bugs guidelines (inherited from Vibe365).
