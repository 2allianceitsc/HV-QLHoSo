# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HV — Quy Trình Duyệt Hồ Sơ** — A web-based document/case approval workflow system for client HV.

Source code lives in `./DEV/`. The framework was bootstrapped from Vibe365 (HR system) — full auth, user management, email, system settings, branding, and org structure are inherited as-is. Document approval business logic is to be built on top.

## Layout

```
HV-QuyTrinhDuyetHoSo/
├── From Clients/                    # Client deliverables (UI specs)
│   └── Giao diện web tờ trình.xlsx  # UI specification — read before planning UI work
├── DEV/                             # Monorepo source (pnpm workspace)
│   ├── apps/api/                    # NestJS 10 backend (port 3028)
│   ├── apps/web/                    # React 18 + Vite frontend (port 5418)
│   ├── packages/shared/             # Shared types/Zod schemas
│   ├── principles/                  # Coding/api/security/git/testing/ui-ux/bugs guidelines
│   ├── prisma schema, railway.toml, etc.
│   ├── CLAUDE.md                    # DEV-specific guidance
│   ├── Readme.md                    # Setup & dev guide
│   └── BUSINESS_MODULES.md          # What's HR-specific vs framework
├── docs/                            # Project docs (PDR, architecture, deployment)
├── mockup/                          # Existing Next.js mockup (separate, ignore for code)
└── CLAUDE.md                        # This file
```

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Query + Zustand + RHF + Zod
- **Backend:** NestJS 10 + TypeScript + Prisma + PostgreSQL + Socket.IO
- **Auth:** JWT in httpOnly cookies, refresh tokens, 2FA (TOTP + email OTP)
- **Deploy:** Railway single-service (FE static served by NestJS in prod)

## Single-Port UX

From the user's perspective this is a **1-port app** (same model as Vibe365):
- **Prod:** NestJS serves API + FE static on **:3028** — single process.
- **Dev:** Open **http://localhost:5418** (Vite). `/api/*` proxied to internal NestJS on :3028.

Ports hardcoded as Vibe365 base + 28 to avoid conflicts when both run locally.

## Databases (Railway)

- **Dev:** `postgresql://postgres:****@switchback.proxy.rlwy.net:16603/railway`
- **Prod:** `postgresql://postgres:****@switchback.proxy.rlwy.net:43733/railway`

Both empty initially. Migrations applied on first deploy via `prisma migrate deploy`.

## Quick Commands

```bash
cd DEV
pnpm install
pnpm dev          # FE :5418 + BE :3028
pnpm db:migrate
pnpm build
```

See `DEV/Readme.md` and `DEV/CLAUDE.md` for full details.

## Status

- ✅ Framework scaffolded (auth, email, user mgmt, system, branding, notifications, org structure)
- ⏳ Document approval workflow business logic — not yet implemented
- ⏳ HR-specific modules from Vibe365 still present (attendance, dashboard, reports, client, status, vibe-icons) — see `DEV/BUSINESS_MODULES.md` for strip plan
