# LetsCycle

A local decluttering marketplace — give away or sell items, matched to nearby
people.

This repository is a **monorepo of two independent applications** that share one
Git history and path-filtered CI:

| Part            | Location               | Stack                                                                    | Status                       |
| --------------- | ---------------------- | ------------------------------------------------------------------------ | ---------------------------- |
| **Backend API** | [`backend/`](backend/) | Node + TypeScript modular monolith (Express, Prisma, PostgreSQL/PostGIS) | Steps 1–14 complete          |
| **Frontend**    | [`client/`](client/)   | Turborepo + pnpm workspace (Next.js, React, Tailwind)                    | Step 3 (API client) complete |

> This README is a living document. As new technologies, libraries, or tools are
> added on either side, this file is updated alongside them.

---

## Table of contents

- [Repository layout](#repository-layout)
- [Backend — API technologies](#backend--api-technologies)
- [Frontend — Turborepo technologies](#frontend--turborepo-technologies)
- [Shared conventions & tooling](#shared-conventions--tooling)
- [Continuous integration](#continuous-integration)
- [Getting started](#getting-started)

---

## Repository layout

```
letscycle/
├── backend/                 # Express API (modular monolith)
│   ├── src/                 # Feature modules (auth, listings, matching, …)
│   ├── prisma/              # Schema + migrations
│   └── requestly/           # API-client collection for manual testing
├── client/                  # Turborepo frontend workspace
│   ├── apps/web/            # Next.js app (App Router)
│   └── packages/            # Shared packages (config, ui, …)
├── PRDs/                     # Product requirement docs (backend, frontend)
└── .github/workflows/       # backend-ci.yml + frontend-ci.yml (path-filtered)
```

---

## Backend — API technologies

A **modular monolith**: one deployable, but every domain (auth, listings,
matching, messaging, transactions, trust, safety…) is a self-contained module
that talks to others only through a typed event bus and public `index.ts`
exports. This keeps modules extractable into microservices later without
rewrites.

### Runtime & language

| Technology              | Purpose                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Node.js 20**          | JavaScript runtime (LTS).                                                                                                |
| **TypeScript** (strict) | Static typing across the whole codebase. Strict mode with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, etc. |
| **tsx**                 | Fast TS execution for `dev` (watch) and scripts — no build step in development.                                          |

### Web framework & HTTP

| Technology             | Purpose                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Express 5**          | HTTP server and routing.                                                               |
| **helmet**             | Sets secure HTTP response headers (CSP, HSTS, etc.).                                   |
| **cors**               | Configurable Cross-Origin Resource Sharing — lets the web/mobile clients call the API. |
| **express-rate-limit** | Per-IP request throttling to blunt abuse and brute-force.                              |

### Data & persistence

| Technology             | Purpose                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| **PostgreSQL 16**      | Primary relational database.                                                                                |
| **PostGIS**            | Geospatial extension — proximity matching, "items near me", safe meet-points (`ST_DWithin`, `ST_Distance`). |
| **Prisma 7**           | Type-safe ORM: schema, migrations, and query client.                                                        |
| **@prisma/adapter-pg** | Native `pg` driver adapter for Prisma (required for raw PostGIS geography SQL).                             |

### Validation, auth & observability

| Technology                 | Purpose                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| **Zod 4**                  | Runtime schema validation for all request/response boundaries and config. |
| **jose**                   | JWT signing/verification (JWKS) — validates auth tokens.                  |
| **pino** + **pino-pretty** | Structured JSON logging (pretty-printed in dev).                          |

### External services (behind "dummy" seams until infra lands)

Each integration is coded against an interface with a **dummy** implementation,
so the app runs and tests without live cloud credentials. Real adapters are
swapped in at deploy time.

| Service                 | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| **AWS Cognito**         | User identity / authentication.                                    |
| **AWS S3**              | Listing image storage.                                             |
| **Stripe Connect**      | Marketplace payments and payouts (money handled as integer pence). |
| **AWS SES**             | Transactional email.                                               |
| **AWS Secrets Manager** | All secrets referenced here — never committed to code, env, or DB. |

### Testing & quality

| Technology                                                         | Purpose                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Vitest 4**                                                       | Unit + integration test runner (serial against a shared Postgres).         |
| **supertest**                                                      | HTTP-level assertions against the Express app.                             |
| **ESLint** + **typescript-eslint**                                 | Linting.                                                                   |
| **eslint-plugin-import-x** + **eslint-import-resolver-typescript** | Enforces module boundaries (modules importable only via their `index.ts`). |
| **Prettier** + **eslint-config-prettier**                          | Formatting (Prettier owns style; ESLint owns correctness).                 |

### Compliance (GDPR)

Built-in: right-to-erasure (`DELETE /users/me`), data portability
(`GET /users/me/export`), and an append-only audit log.

---

## Frontend — Turborepo technologies

A **Turborepo + pnpm workspace** under `client/`, structured
"sorta-microservice" like the backend: the app is split into feature modules and
shared packages so pieces can scale independently as the team grows.

### Monorepo & workspace

| Technology              | Purpose                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Turborepo**           | Task orchestration and caching across workspace packages (`turbo run build/lint/typecheck`). |
| **pnpm** (workspaces)   | Fast, disk-efficient package manager; manages `apps/*` and `packages/*`.                     |
| **TypeScript** (strict) | Shared strict config via the `@letscycle/config` package.                                    |
| **Prettier**            | Repo-wide formatting.                                                                        |

### Web application (`apps/web`)

| Technology                        | Purpose                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 15** (App Router)       | React framework — routing, server components, SSR/SSG, build tooling.                                                           |
| **React 19**                      | UI library.                                                                                                                     |
| **Tailwind CSS v4**               | Utility-first styling via CSS-first `@theme` — a single, quickly-tweakable token file drives the whole app's colours and fonts. |
| **@tailwindcss/postcss**          | Tailwind's PostCSS plugin (v4 build pipeline).                                                                                  |
| **Lucide** (`lucide-react`)       | Icon set — clean, consistent, tree-shakeable SVG icons.                                                                         |
| **Google Sora** (via `next/font`) | Brand typeface, self-hosted and optimised by Next.                                                                              |

### Design system (`packages/ui`)

The whole app re-themes from **one file** — `packages/ui/src/theme.css` holds the
semantic colour, radius, and font tokens (fresh-green palette, light + dark);
components only ever reference tokens (`bg-primary`, `text-muted-foreground`),
never raw colours.

| Technology                    | Purpose                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| **class-variance-authority**  | Type-safe component style variants (e.g. Button variant/size).                            |
| **clsx** + **tailwind-merge** | The `cn()` helper — merge conditional classes and resolve Tailwind conflicts (last wins). |
| **Lucide** (`lucide-react`)   | Icon set; `<Icon name>` maps backend `category.iconName` values to Lucide by name.        |

Primitives shipped: **Button, Input, Card, Typography (Heading/Text), Icon,
Skeleton**, plus a **ThemeProvider + ThemeToggle** (light/dark via `data-theme`,
persisted, no-flash init script). Radix-based primitives (Dialog, Select,
Checkbox, …) arrive with the features that need them.

### Design direction

- **Fresh-green** brand palette (sustainability theme); deliberately _not_
  Mercari's navy.
- **Mobile-first** throughout (`min-h-dvh`, device-width viewport).
- **Dark mode** built in from the start via `data-theme` on `<html>`.

### API client (`packages/api-client`)

The single, typed gateway to the backend — feature code never calls `fetch`
directly. Framework-agnostic (no React in the core) so a future React Native app
reuses it unchanged.

| Technology                | Purpose                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **TanStack Query**        | Server-state fetching/caching; one `QueryClient` per tab via `<ApiProvider>`, with typed hooks per domain. |
| Typed `fetch` wrapper     | Base URL from `NEXT_PUBLIC_API_BASE_URL`, injects `Authorization: Bearer`, throws typed `ApiError`.        |
| Refresh-on-401 (built-in) | Single-flight rotation via `/auth/refresh`, retries once, then fires an `onSessionExpired` handler.        |

Endpoints so far: `authApi` (signup/login/refresh/logout) and `systemApi`
(health, public settings, terms, presigned uploads); the remaining domains land
with their feature steps.

### Shared packages

| Package                     | Purpose                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| **`@letscycle/config`**     | Shared strict `tsconfig.base.json` consumed by every workspace package.               |
| **`@letscycle/ui`**         | Design system: `theme.css` tokens, `cn()` helper, and the core styled primitives.     |
| **`@letscycle/api-client`** | Typed API gateway: `fetch` wrapper, token store, refresh, endpoints, and Query hooks. |

### Tooling & quality

| Technology                          | Purpose                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------ |
| **ESLint** + **eslint-config-next** | Linting with Next.js's recommended rules (core-web-vitals + TypeScript). |
| **@eslint/eslintrc**                | Flat-config compatibility shim for Next's shareable config.              |

### Planned frontend libraries (per PRD, not yet installed)

These are locked in the frontend PRD and will be added — and documented here —
as their build steps arrive:

- **Radix UI** primitives (shadcn pattern) — accessible unstyled components,
  wrapped as more design-system primitives (Dialog, Select, Checkbox, …).
- **Zustand** — lightweight client state (auth session store, step 4).
- **React Hook Form** + **Zod** — forms and validation (Zod shared in spirit
  with the backend).
- **MapLibre GL** + **OpenStreetMap** — maps for proximity/meet-points.
- **PWA** support — installable, mobile-app-like experience.

---

## Shared conventions & tooling

| Convention            | Detail                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------- |
| **Language**          | TypeScript strict on both sides.                                                             |
| **Naming**            | camelCase everywhere.                                                                        |
| **Money**             | Always integer **pence** — never floats.                                                     |
| **Secrets**           | AWS Secrets Manager references only; never in code, env files, or the database.              |
| **Module boundaries** | Import a module only through its public `index.ts`.                                          |
| **Git**               | Small, focused commits; feature branch → PR → `main`. Plain commit messages (single author). |
| **Node**              | v20 across backend and frontend.                                                             |

---

## Continuous integration

CI is **path-filtered** so each app only builds when its files change:

| Workflow                                               | Triggers on  | Runs                                                                                      |
| ------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| [`backend-ci.yml`](.github/workflows/backend-ci.yml)   | `backend/**` | Prisma generate + migrate, lint, typecheck, Vitest (against a PostGIS service container). |
| [`frontend-ci.yml`](.github/workflows/frontend-ci.yml) | `client/**`  | pnpm install, turbo lint, typecheck, production build.                                    |

---

## Getting started

### Backend

```bash
cd backend
npm ci
docker compose up -d --wait      # PostgreSQL 16 + PostGIS
npx prisma generate
npx prisma migrate deploy
npm run dev                       # http://localhost:3000 (API at /api/v1)
npm test                          # Vitest
```

### Frontend

```bash
cd client
pnpm install
cp apps/web/.env.example apps/web/.env.local   # points at the local API
pnpm dev                          # Next.js dev server → http://localhost:3001
pnpm build                        # production build
pnpm lint && pnpm typecheck
```

> The web app runs on **3001** so it doesn't clash with the backend on **3000**;
> it reads the API base URL from `NEXT_PUBLIC_API_BASE_URL`.

> **Windows note:** `pnpm` is installed user-space (`npm install -g pnpm@9`) and
> is available on the PowerShell PATH.
