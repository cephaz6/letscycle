# Demo deployment PRD — LetsCycle

Read `general-prd.md`, `backend-prd.md` and `frontend-prd.md` first. This covers
putting LetsCycle online as a **free public demo**, and the code changes that
have to land before it will work.

## Goal and scope

A shareable, working demo at zero hosting cost. Real people can sign up, list,
browse, message and walk an order through its states.

**Explicitly out of scope:** real money and real personal data. Payments, auth
and (today) image storage are dummy seams. The demo must say so in-app so nobody
believes a card was charged.

## Stack (decided)

| Piece | Host | Why |
|---|---|---|
| Client (Next.js) | **Vercel** free | Native fit; free for non-commercial use |
| Backend (Express) | **Render** free Docker | Needs a long-lived process — see below |
| Database | **Supabase** free | Postgres with **PostGIS**, which the app hard-requires |
| Listing images | **Cloudinary** free | No free host offers a persistent disk |

**Railway was rejected** — it has no free tier (~$5/month minimum).

### Why the backend cannot be serverless

`OutboxPublisher.start()` (`backend/src/workers/outboxPublisher.ts`) is a
one-second poll loop inside a long-lived process. Matching, notifications and
trust scoring all flow outbox → in-process bus → handlers. On Vercel or Lambda the
function freezes after each response, nothing drains the outbox, and **wishlist
match alerts, message/order notifications and trust scores silently stop**.

Two further blockers on serverless: uploads write to a filesystem that is
read-only apart from an ephemeral `/tmp`, and `express-rate-limit`'s in-memory
store gives every instance its own counter.

This becomes viable later, once uploads move to object storage and the in-process
bus becomes SQS — the direction the "extractable modules" design already points.

### Why PostGIS constrains the database

The init migration runs `CREATE EXTENSION postgis`, and the code depends on
`geography(Point, 4326)` columns plus `ST_DWithin`, `ST_Distance`, `ST_MakePoint`,
`ST_X`/`ST_Y`. These power distance sorting, the home feed, meet points and the
matching radius.

On a Postgres without PostGIS the first migration fails, no tables are created and
the backend never starts. **Railway's default Postgres template has no PostGIS
binaries** — one of the reasons it was dropped.

## Code changes required before deploying

### 1. Set `trust proxy` — rate limiting is currently broken behind a proxy

`backend/src/api/middleware/security.ts` rate-limits on `req.ip`, and
`auth.route.ts` / `user.route.ts` write `req.ip` into audit logs. Behind Render's
proxy `req.ip` resolves to the proxy, so **every user shares a single bucket** —
the 21st auth request per minute from anyone on earth is blocked — and audit
records for sign-in, data export and account deletion log the wrong address.

Add `app.set('trust proxy', 1)` in `backend/src/api/app.ts`, before
`applySecurity`.

### 2. Implement Cloudinary behind the existing storage seam

`backend/src/api/routes/devMedia.route.ts` writes uploads to local disk. Free
hosts wipe the filesystem on restart, so member photos disappear — the same bug we
hit locally when the `uploaddata` volume was missing. Seeded demo listings use
remote URLs and are unaffected.

The `StorageClient` seam in `backend/src/services/system/storage.types.ts` exists
for exactly this. One mismatch: it models an S3-style presigned `PUT`, while
Cloudinary needs a multipart `POST`. Extending the seam with optional form fields
also matches the S3 plan already documented in that file ("presigned POST with a
content-length-range condition"), so this is not a Cloudinary-shaped hack.

- `storage.types.ts` — extend `PresignedUpload` to
  `{ uploadUrl; method?: 'PUT' | 'POST'; fields?: Record<string, string> }`.
- **New** `backend/src/services/system/storage.cloudinary.ts` —
  `createCloudinaryStorage(config)` implementing `StorageClient`. Derive
  Cloudinary's `public_id` from the `key` that `StorageService.createUpload`
  already generates (strip the extension; Cloudinary appends format), add a
  `timestamp`, and sign with SHA-1 over the sorted params plus the api secret.
- `backend/src/server.ts` — use Cloudinary when configured, otherwise keep
  `createDummyStorage` so local development is untouched.
- `backend/src/shared/config/env.ts` — add optional `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `client/packages/api-client/src/endpoints/listings.ts` — `PhotoUploadTicket`
  gains `method`/`fields`; `uploadToPresignedUrl` builds `FormData` and POSTs when
  fields are present, otherwise keeps the existing PUT path.
- `resolveImageUrl` (same file) and `client/packages/api-client/src/config.ts` —
  serve from a media base URL when set (the Cloudinary CDN), falling back to the
  API `/media` endpoint locally. Keys already starting with `http` still pass
  through, so seeded demo data keeps working.

Leave `StorageService.createUpload` key generation and the pending/confirm
lifecycle unchanged.

### 3. Give Prisma a direct connection for migrations

Supabase exposes a pooled connection (pgBouncer, transaction mode) and a direct
one. Prisma migrations cannot run through the pooler.

- `backend/Dockerfile` `CMD` — run `migrate deploy` against `DIRECT_DATABASE_URL`,
  then serve with the pooled `DATABASE_URL`.
- The app uses `@prisma/adapter-pg`; disable prepared statements on the pooled
  connection.

### 4. Leave `NODE_ENV=development` — do not "fix" it

`backend/src/server.ts` throws if `NODE_ENV=production` without
`COGNITO_USER_POOL_ID`, and throws again if that variable *is* set ("Real Cognito
client is not implemented yet"). The guard is deliberate — it stops dummy auth
reaching production. The Dockerfile already sets `development`. Record why in a
comment so nobody flips it later.

### 5. Optional — allow Vercel preview origins

`security.ts` permits a single `FRONTEND_ORIGIN`. Preview deploys get unique URLs
and will be blocked by CORS. Only needed if previews must reach the API: accept a
comma-separated list.

## Platform configuration

**Supabase** — new project, London region. Enable PostGIS
(`CREATE EXTENSION postgis`). Copy both the pooled and direct connection strings.
Free projects pause after roughly a week idle and need a manual resume.

**Render** — Web Service from the repo, Docker runtime, root directory `backend/`,
health check path `/api/v1/health`. Environment: `DATABASE_URL` (pooled),
`DIRECT_DATABASE_URL`, `FRONTEND_ORIGIN` (the Vercel URL), `PUBLIC_API_ORIGIN`
(the Render URL), `AUTH_DEV_TOKEN_SECRET`, `GOOGLE_CLIENT_ID`, `CLOUDINARY_*`.
The free tier sleeps after 15 minutes idle with a ~50 second cold start; the
outbox worker pauses while asleep and drains its backlog on wake, so match and
notification delivery is delayed rather than lost.

**Vercel** — Root Directory `client/apps/web`, with "include files outside root"
enabled for the pnpm workspace. Environment: `NEXT_PUBLIC_API_BASE_URL` (Render
URL plus `/api/v1`), `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_MEDIA_BASE_URL`
(Cloudinary delivery URL).

**Google OAuth** — add the Vercel domain to the client's authorised JavaScript
origins, or "Continue with Google" breaks in production.

## Security and environment management

- `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time and are
  therefore public. Only the Google client ID belongs there (public by design).
  Never put a secret in one.
- **`AUTH_DEV_TOKEN_SECRET` is load-bearing.** It is the HMAC key for stored
  passwords in `backend/src/services/auth/devCredential.store.ts` *and* signs the
  JWTs. Rotating it locks every existing user out permanently. Generate it once,
  store it safely, and never rotate it casually.
- Secrets live only in the Render and Vercel environment stores. `.env` stays
  gitignored; extend the committed `backend/.env.example` and
  `client/apps/web/.env.example` with the new variable names and comments — never
  values.
- Label the demo in-app: payments are simulated.

## Version control

- Merge `feat/fe-client-docker` into `main` (PR #18) and deploy from `main` only.
- Branch protection on `main` requiring `backend-ci` and `frontend-ci` to pass.
  CI already provisions `postgis/postgis:16-3.5`, matching production.
- Keep Render at a single instance: `migrate deploy` runs at container start, and
  concurrent replicas would race on migrations.
- Tag the release commit once it is live.

## Verification

Locally first — none of this should regress:

1. `cd backend && npm run lint && npm run typecheck && npx vitest run` — all green.
2. `docker compose up -d --build` on both sides; register, sign in, create a
   listing with a photo, confirm it renders. Exercises the modified upload path
   against the dummy storage.

Then against the deployed stack:

3. `curl https://<render>/api/v1/health` returns 200.
4. Register on the Vercel URL, sign in, then sign in again after a redeploy —
   confirms Supabase-backed credentials survive restarts.
5. Upload a listing photo, **redeploy the backend, reload the listing** — the image
   must still render. This is the entire point of the Cloudinary work.
6. Set a home location, add a wish, then publish a matching listing from a second
   account — a match notification should arrive. Confirms the outbox worker runs.
7. `/safety` lists meet points with distances — confirms PostGIS is live.
8. A request with a foreign `Origin` header is rejected by CORS; one from the
   Vercel origin succeeds.
9. Hit `/api/v1/auth/login` 25 times quickly from one machine and confirm it is
   limited, then confirm a second machine is *not* — proves `trust proxy` is right.
10. Load the Vercel URL on a phone: installable, with manifest and icons serving.

## Before this could take real users or money

Not part of this deployment, listed so the gap stays visible:

- Real payments (Stripe Connect) replacing the dummy gateway.
- Real authentication replacing the dummy Cognito and its database-backed
  passwords.
- A host without cold starts, and a database plan with backups and point-in-time
  restore.
- Web push, which needs VAPID keys and the notification sender wired up.
