# CLAUDE.md — DEV

This file provides guidance to Claude Code when working in `DEV/`.

> For full project context, see the root `../CLAUDE.md` and `../From Clients/Giao diện web tờ trình.xlsx`.
> For framework principles, see `./principles/` (inherited from Vibe365).
> For what's HR-business vs framework, see `./BUSINESS_MODULES.md`.

## Stack

- Monorepo: pnpm workspace (`apps/api`, `apps/web`, `packages/shared`)
- Backend: NestJS 10 + Prisma + PostgreSQL + Socket.IO
- Frontend: React 18 + Vite + Tailwind + shadcn/ui + Zustand + TanStack Query + RHF + Zod
- Deploy: Railway single-service (FE static served by NestJS in prod)

## Single-Port UX

From the user's perspective this is a **1-port app**:
- **Prod:** NestJS serves both API and FE static on **:3028** (single process, single port).
- **Dev:** Open **:5418** (Vite). `/api/*` and `/uploads/*` are proxied to internal NestJS on :3028 — invisible to the user.

The "2 ports in dev" only exists because Vite needs its own dev server for HMR. Once built, it's truly 1 port.

Hardcoded (Vibe365 base + 28) to avoid local conflicts:

| Surface | Port |
|---------|------|
| User URL (dev)  | 5418 (Vite — proxies /api → 3028) |
| User URL (prod) | 3028 (NestJS serves API + static FE) |
| Internal BE     | 3028 (only directly hit by Vite proxy in dev) |

Defined in:
- `apps/web/vite.config.ts` — `server.port: 5418`, proxy `/api` and `/uploads` → `localhost:3028`
- `apps/api/src/main.ts` — `process.env.PORT ?? 3028`
- `.env` — `PORT=3028`, `CORS_ORIGIN=http://localhost:5418`
- `apps/api/.env` — same

## Commands

```bash
pnpm install       # install workspace deps
pnpm dev           # FE :5418 + BE :3028 concurrently
pnpm build         # web build → copy to api/public → nest build
pnpm db:migrate    # prisma migrate dev
pnpm db:seed       # seed default data — LOCAL ONLY (guarded for prod)
pnpm db:studio     # Prisma Studio
pnpm check         # tsc --noEmit
pnpm lint          # eslint
```

## Database

- **Dev**: `postgresql://postgres:****@switchback.proxy.rlwy.net:16603/railway`
- **Prod**: `postgresql://postgres:****@switchback.proxy.rlwy.net:43733/railway`

Both empty initially — migrations run on first deploy.

## Auth Flow

- JWT in **httpOnly cookies** (never localStorage)
- Login response `{mustChangePassword: true}` → `/first-time-password` before app
- Refresh token auto-renew, axios interceptor handles 401 → refresh → retry
- 2FA: TOTP (authenticator apps) + email OTP — see `auth/two-fa/`

## Code Safety Rules (DEV-specific)

### API (NestJS)
- All endpoints **must** have `@Roles([...])` guard
- All DTOs **must** use `class-validator` decorators
- All DB writes **must** set `logCreatedBy` / `logUpdatedBy` from JWT
- All entities **must** use `uuidv7()` PK — no auto-increment
- **NEVER** `$queryRaw` / `$executeRaw` in user-facing flows (bypasses soft-delete)
- All datetime → UTC before persisting

### Frontend (React)
- **NEVER** store JWT in `localStorage` / `sessionStorage`
- All forms = `react-hook-form` + `zod`
- All server state = `@tanstack/react-query`
- Role checks via `useAuthStore()`, not local state
- **NEVER** `dangerouslySetInnerHTML`

### Database
- Every model: standard columns (`note`, `isDeleted`, `isDisabled`, `orderNo`, audit fields)
- Migrations reviewed for destructive ops before `pnpm db:migrate`
- Soft-delete middleware is global

## Railway Build & Serve

Railway builds both FE and BE on every deploy via `railway.toml`:

```
pnpm --filter web build         # React → apps/web/dist/
cp apps/web/dist/ → api/public/ # static into API
pnpm --filter api build         # nest compile
```

NestJS serves `apps/api/public/` via `ServeStaticModule` (production only). All non-`/api/*` routes fall through to React's `index.html` (SPA routing).

- **Do NOT commit built FE files** — `apps/api/public/` is gitignored
- **Do NOT skip** `pnpm --filter web build` in `buildCommand`

## Pre-Built vs To-Build

See `./BUSINESS_MODULES.md` for the full breakdown. TL;DR:
- **Pre-built:** auth, email, user mgmt, system settings, branding, notifications, org structure
- **To strip later:** attendance, dashboard, reports, client, status, vibe-icons (HR-specific from Vibe365)
- **To build:** document approval workflow modules (per `From Clients/Giao diện web tờ trình.xlsx`)
