# Frontend PRD — LetsCycle

Read `general-prd.md` and `backend-prd.md` first. This is the concrete build spec
for the web client. The backend is implemented through step 14 (all feature
modules live behind `/api/v1`), so this is written against a real, stable API.

## Decisions (locked)

- **Framework:** Next.js 15 (App Router), React 19, TypeScript strict
- **Styling:** Tailwind CSS v4 (CSS-first theme via CSS variables)
- **Design system:** own primitives built on Radix UI + Tailwind (shadcn/ui pattern)
- **Icons:** `lucide-react` (backend `category.iconName` values already map to Lucide)
- **Fonts:** Google **Sora** via `next/font` (self-hosted → no external request, CSP-safe)
- **Palette:** fresh green / sustainable (ties to the reuse/"cycle" theme). All colours
  and fonts are semantic tokens in one file, so the whole app re-themes in ~15 lines.
- **Server state:** TanStack Query. **UI/session state:** Zustand. **Forms:** React Hook Form + Zod
- **Repo:** Turborepo monorepo under `client/` with pnpm workspaces
- **Deployment:** Vercel or AWS Amplify (web-first, mobile-responsive, PWA-capable)

## Why a monorepo

Frontend has no literal "microservices", but the project wants the same
separation-for-scaling the backend has, plus a path to a future mobile app that
reuses the API. A Turborepo monorepo delivers both: feature-modular app code, and
shared packages a future `apps/mobile` (React Native) imports directly.

```
client/
  apps/
    web/                 # Next.js app
  packages/
    api-client/          # typed fetch client for /api/v1 + TanStack Query hooks
    ui/                  # design system: theme tokens, primitives, components
    config/              # shared tsconfig, eslint, tailwind preset, prettier
  turbo.json
  pnpm-workspace.yaml
```

**Boundary rule (mirrors the backend):** feature code imports shared code only
through a package's public entry (`@letscycle/ui`, `@letscycle/api-client`) — never
deep paths. Enforced by ESLint.

## App structure (`apps/web`)

```
apps/web/src/
  app/                   # App Router routes only (thin; delegate to features)
  features/              # one folder per domain, mirroring backend modules
    auth/  listings/  wishlists/  matching/  messaging/
    notifications/  transactions/  trust/  safety/  profile/
      components/        # feature UI
      hooks/             # feature data hooks (wrap api-client + TanStack Query)
      index.ts           # feature public surface
  components/            # app shell: layout, top bar, mobile bottom nav
  lib/                   # providers (Query, theme, auth), app config, env
```

Each feature owns its components + hooks and talks to the backend only via
`@letscycle/api-client`. Nothing outside a feature imports its internals.

## Future mobile app (why the API already serves it)

- **Auth is Bearer JWT** (Cognito) — a native app sends the same header.
- **Versioned REST/JSON** (`/api/v1`) — client-agnostic.
- **CORS is browser-only** — mobile ignores it.
- **Push is the one swap** — web uses Web Push; mobile uses FCM/APNs, added as a new
  channel behind the notifications module's existing `PushSender`/channel seam.
- `packages/api-client` and `packages/ui` (tokens + logic) are the reuse surface.

## Design system (`packages/ui`)

- **`theme.css`** — the single source of truth. CSS variables for the fresh-green
  palette (light + dark) and Sora font. Semantic tokens only:
  `--background --foreground --card --muted --muted-foreground --primary
  --primary-foreground --secondary --accent --border --input --ring
  --destructive --success --warning --radius`.
- **Tailwind preset** (`packages/config`) maps tokens → utilities (`bg-primary`,
  `text-foreground`, `rounded-[--radius]`…). Components never hard-code colours.
- **Dark mode** via `data-theme` on `<html>`; tokens defined for both.
- **Primitives:** Button, Input, Textarea, Select, Checkbox, Switch, Card, Badge,
  Avatar, Dialog, Sheet (mobile bottom-sheet), Toast, Skeleton, Tabs, Dropdown,
  EmptyState, Spinner. Built on Radix (accessible) + Tailwind tokens.
- **`<Icon name={category.iconName} />`** — maps backend icon names to Lucide.

## Mobile-first & PWA

- Mobile-first Tailwind; design small-screen first, scale up (`sm md lg`).
- **App-style bottom tab bar** on mobile: Browse · Wishlist · **Sell** (center) ·
  Messages · Profile. Sidebar/top nav on desktop.
- **PWA:** web manifest + service worker (installable to home screen). Service worker
  also handles Web Push for match/message notifications, with a permission-request flow.
- Wide content (tables, maps) scrolls inside its own container; body never scrolls
  horizontally.

## Routes

**Public:** `/` (landing/browse) · `/login` · `/signup` · `/listings` (search) ·
`/listings/[id]` · `/u/[userId]` (public profile).

**Authenticated:** `/sell` (create) · `/me` (my profile) · `/me/edit` ·
`/me/listings` · `/wishlists` · `/matches` · `/messages` · `/messages/[id]` ·
`/notifications` · `/transactions` · `/transactions/[id]` · `/settings`
(preferences, payouts onboarding, privacy: export + delete).

## Key flows (each maps to backend endpoints)

- **Onboarding:** signup → accept terms → set home location → land on browse.
- **Sell:** create-listing form (React Hook Form + Zod) → photo upload (presigned
  two-step: request URL → PUT → confirm) → publish (`publish: true`).
- **Browse/search:** filters (distance from home, keyword, category, price, type),
  sort; list + optional map.
- **Match:** notification → candidate → express interest.
- **Message:** conversation list → thread → send (marks counterpart read on open).
- **Transact:** commit → seller confirm → both confirm pickup → escrow → review.
- **Safety:** choose a verified meet point → start safe-transit → arrival / duress.
- **Trust:** leave a review after completion; view a user's trust score.
- **Privacy:** export my data; delete my account (Settings).

## API client (`packages/api-client`)

- Typed `fetch` wrapper: base URL from env, attaches `Authorization: Bearer`,
  transparent refresh-on-401 (rotates via `/auth/refresh`), typed errors.
- Per-domain modules mirroring the backend (`authApi`, `listingsApi`, `wishlistsApi`,
  `matchesApi`, `messagesApi`, `notificationsApi`, `transactionsApi`, `trustApi`,
  `safetyApi`, `usersApi`, `systemApi`).
- TanStack Query hooks per domain (`useListings`, `useCreateListing`, …) with
  optimistic updates on mutations.
- **Types:** hand-written to match backend responses for now. Optional later step:
  generate an OpenAPI doc from the backend Zod schemas and codegen the client.

## Auth

- **Now (dummy Cognito):** call `/auth/signup` + `/auth/login`; keep the access token
  in memory (Zustand), the refresh token in an httpOnly cookie (or secure store);
  refresh interceptor rotates on 401. A `<RequireAuth>` boundary guards private routes.
- **Later (real Cognito):** swap the token source to Cognito Hosted UI / Amplify Auth
  behind the same auth store — no feature code changes.

## Maps / location

Home-location picker and meet-point display need a map. Use **MapLibre GL** (or
Leaflet) with OpenStreetMap tiles for MVP. Tiles are an external host — allow that
origin in the app CSP (kept narrow). Decision revisited if a paid provider is chosen.

## Accessibility

WCAG 2.1 AA: semantic HTML, visible focus, full keyboard nav, ARIA on primitives
(Radix gives most of this), and token colours chosen for AA contrast in light + dark.

## Testing

- **Vitest + Testing Library** — component/hook tests colocated (same discipline as
  backend: tests beside code).
- **Playwright** — e2e for critical flows (signup → list → match → transact), added
  once flows exist.
- **CI (GitHub Actions):** lint → typecheck → test → build, on every push.

## Build order for Claude Code (one step per session)

1. **Monorepo scaffold** — Turborepo + pnpm workspaces; `apps/web` (Next.js, Tailwind
   v4, TS strict); `packages/config` (tsconfig/eslint/tailwind preset/prettier); CI.
   A styled `/` placeholder renders.
2. **Design-system foundation** (`packages/ui`) — `theme.css` (green palette + Sora),
   Tailwind preset, core primitives (Button, Input, Card, Typography, Icon, Skeleton),
   dark-mode toggle.
3. **API client** (`packages/api-client`) — fetch wrapper, token handling, refresh
   interceptor, TanStack Query provider, typed `auth` + `system` endpoints.
4. **Auth feature** — signup, login, refresh, `<RequireAuth>`, auth store, terms accept.
5. **App shell** — root layout, top bar, mobile bottom nav, providers, empty/loading/
   error boundaries.
6. **Profile** — view/edit profile, home-location picker (map), settings scaffold.
7. **Listings** — search (filters + sort), detail, create/edit with photo upload,
   favourites, my listings.
8. **Wishlists** — CRUD.
9. **Matching** — candidates list, express interest.
10. **Notifications** — list, mark read, preferences, Web Push subscribe + service worker.
11. **Messaging** — conversations, thread, send (realtime polish later).
12. **Transactions** — commit, confirm, complete, dispute, payouts onboarding, detail.
13. **Trust** — leave review, flags, trust-score display on profiles.
14. **Safety** — nearby meet points (map), safe-transit session UI.
15. **Privacy** — data export + account deletion in Settings.
16. **PWA polish** — manifest, service worker, install prompt, offline states.
17. **E2E + a11y + performance pass** — Playwright critical flows, axe audit, Lighthouse.

## Prerequisites already met

- Backend implemented through step 14 (stable `/api/v1`). ✅
- Backend runs locally (`npm run dev`) for the client to develop against. ✅
- Real Cognito / S3 / Stripe / SES arrive with backend step 17 (CDK infra); until then
  the client develops against the dummy-backed flows, and the API contracts don't change.
