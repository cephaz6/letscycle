# Backend PRD — Declutter Marketplace

Read `general-prd.md` first for product context. This document is the concrete build spec for the backend.

## Stack

- **Runtime:** Node.js 20 LTS
- **Language:** TypeScript (strict mode)
- **Framework:** Express
- **Database:** PostgreSQL 16 with PostGIS extension
- **ORM / migrations:** Prisma
- **Validation:** Zod
- **Logging:** Pino (with redaction)
- **Auth:** AWS Cognito (JWT verification via `jose`)
- **Payments:** Stripe Connect (Express accounts)
- **File storage:** AWS S3 with presigned upload URLs
- **Email:** AWS SES
- **Push:** Web Push Protocol (`web-push` library)
- **Testing:** Vitest (unit + integration), Playwright (e2e later)
- **In-process event bus:** typed EventEmitter wrapper
- **Container:** Docker; deployed to AWS Fargate behind ALB
- **IaC:** AWS CDK (TypeScript)
- **CI/CD:** GitHub Actions

## Folder structure

```
src/
  api/
    routes/                # thin route handlers, delegate to services
    middleware/            # auth, validation, error, request-id, rate-limit
    app.ts                 # Express app factory
  services/
    users/
      index.ts             # public interface (exports only what other modules use)
      user.service.ts
      user.repository.ts
      user.types.ts
      user.events.ts       # event schemas this module publishes
      user.test.ts
    auth/
    listings/
    wishlists/
    matching/              # extractable — event-only integration
      handlers.ts          # event subscribers (worker mode)
      scorer.ts            # scoring logic (pure functions)
      matching.service.ts
      matching.repository.ts
      matching.events.ts
      matching.test.ts
    messaging/
    transactions/
    trust/
    safety/
    notifications/         # extractable — event-only integration
      handlers.ts
      dispatchers/
        webPush.ts
        email.ts
        inApp.ts
      notifications.service.ts
      notifications.repository.ts
      notifications.events.ts
      notifications.test.ts
    system/
    ops/
    external/
  shared/
    db/
      client.ts            # Prisma client singleton
      transaction.ts       # transaction helper
    events/
      bus.ts               # in-process typed event bus (swappable)
      schemas.ts           # all event schema types (source of truth)
      publish.ts           # publish helper (writes to outbox + emits)
    logging/
      logger.ts            # Pino instance with redaction config
    config/
      env.ts               # env var loading + validation (Zod)
      secrets.ts           # Secrets Manager wrapper
    errors/
      appError.ts          # base error class
      httpErrors.ts        # 4xx/5xx typed errors
    types/
      common.ts
  workers/
    matchingWorker.ts      # runs matching handlers from event bus
    notificationsWorker.ts # runs notifications handlers
    outboxPublisher.ts     # reads outbox table, publishes events
  server.ts                # entrypoint

prisma/
  schema.prisma
  migrations/

tests/
  e2e/
  fixtures/

infra/                     # CDK stacks
  lib/
  bin/

.github/
  workflows/
    ci.yml
    deploy.yml
```

**Module boundary rule:** nothing outside a module folder may import from anywhere except that module's `index.ts`. Enforced by ESLint rule (`no-restricted-imports`).

## Naming conventions

- Tables: camelCase singular — `user`, `listingPhoto`, `matchCandidate`
- Columns: camelCase — `createdAt`, `sellerId`, `pricePence`
- Enums: string values, camelCase — `"active"`, `"pendingReview"`
- Primary keys: `id` (UUID v4)
- Foreign keys: `<referencedTable>Id` — `userId`, `listingId`
- Timestamps: `timestamptz`, columns `createdAt` and `updatedAt` on every table
- Money: `<name>Pence` as `integer`, never floats
- Locations: `geography(Point, 4326)`, paired with `<name>AccuracyMetres` where relevant

## Data model — 35 tables

All tables have `id` (uuid), `createdAt`, `updatedAt` unless noted. Foreign keys have indexes. All timestamps `timestamptz`.

### users module

**user**
- `id`, `email` (unique), `phone` (nullable), `displayName`, `avatarUrl` (nullable)
- `homeLocation` (geography Point, nullable), `homeLocationAccuracyMetres` (int, nullable)
- `accountStatus` — `"active" | "suspended" | "deleted"`
- `emailVerifiedAt` (timestamptz, nullable), `phoneVerifiedAt` (timestamptz, nullable)
- `cognitoSub` (unique, indexed)
- `preferences` (jsonb) — notification defaults, distance defaults

**userVerification**
- `userId` (fk), `verificationType` — `"idDocument" | "phone" | "email"`
- `status` — `"pending" | "verified" | "failed"`
- `verifiedAt` (nullable), `providerReference` (nullable — e.g. Stripe Identity session ID)

**blockedUser**
- `blockerUserId` (fk), `blockedUserId` (fk), `reason` (nullable)
- Unique on (`blockerUserId`, `blockedUserId`)

### auth module

**refreshToken**
- `userId` (fk), `tokenHash` (unique), `expiresAt`, `revokedAt` (nullable), `userAgent`, `ipAddress`

### listings module

**listing**
- `id`, `sellerId` (fk user), `title`, `description` (text)
- `categoryId` (fk category)
- `condition` — `"new" | "likeNew" | "good" | "fair" | "poor"`
- `listingType` — `"sell" | "giveaway"`
- `pricePence` (int, nullable — null for giveaway), `currency` (default `"GBP"`)
- `location` (geography Point), `locationAccuracyMetres` (int)
- `status` — `"draft" | "active" | "reserved" | "completed" | "expired" | "removed"`
- `deadlineAt` (nullable), `publishedAt` (nullable), `expiresAt` (nullable)
- `attributes` (jsonb) — flexible per-category fields
- `searchText` (generated column: `title || ' ' || description`)
- Indexes: `sellerId`, `categoryId`, `status`, `location` (GIST), full-text on `searchText`

**listingPhoto**
- `listingId` (fk), `s3ObjectId` (fk s3Object), `displayOrder` (int)
- `width` (int), `height` (int)

**category**
- `id`, `slug` (unique), `name`, `parentId` (fk category, nullable)
- `typicalDistanceKm` (int) — default matching radius for items in this category
- `iconName`

**favourite**
- `userId` (fk), `listingId` (fk)
- Unique on (`userId`, `listingId`)

**listingView**
- `listingId` (fk), `viewerUserId` (fk, nullable — anonymous views allowed)
- `viewedAt` (timestamptz), `source` — `"search" | "match" | "direct" | "profile"`

### wishlists module

**wishlistItem**
- `userId` (fk), `categoryId` (fk, nullable)
- `keywords` (text array), `maxPricePence` (int, nullable)
- `maxDistanceKm` (int), `listingTypePreference` — `"sell" | "giveaway" | "both"`
- `status` — `"active" | "paused" | "fulfilled" | "expired"`
- `searchText` (generated from keywords)
- `expiresAt` (nullable), `fulfilledAt` (nullable)

### matching module (extractable)

**matchCandidate**
- `listingId` (fk), `wishlistItemId` (fk), `userId` (fk)
- `compositeScore` (float), `proximityScore` (float), `keywordScore` (float)
- `trustScoreAtMatch` (float), `urgencyScore` (float)
- `rank` (int) — position in candidate list
- `status` — `"notified" | "interested" | "expired" | "superseded" | "won"`
- `notifiedAt` (nullable), `expressedInterestAt` (nullable)

**matchEvent**
- `listingId` (fk), `eventType` — `"candidatesComputed" | "notificationsSent" | "interestExpressed" | "winnerSelected"`
- `payload` (jsonb)
- No `updatedAt` — append-only

### messaging module

**conversation**
- `listingId` (fk, nullable), `buyerId` (fk user), `sellerId` (fk user)
- `status` — `"active" | "archived"`, `lastMessageAt` (timestamptz, nullable)

**message**
- `conversationId` (fk), `senderId` (fk user), `body` (text)
- `attachments` (jsonb — array of s3ObjectIds)
- `readAt` (timestamptz, nullable)

### transactions module

**transaction**
- `listingId` (fk), `buyerId` (fk), `sellerId` (fk)
- `amountPence` (int), `commissionPence` (int), `currency` (default `"GBP"`)
- `status` — `"initiated" | "paymentAuthorised" | "paymentCaptured" | "inEscrow" | "completed" | "disputed" | "refunded" | "cancelled"`
- `meetPointId` (fk, nullable), `agreedPickupAt` (timestamptz, nullable)
- `completedAt` (nullable), `stripePaymentIntentId`, `stripeTransferId` (nullable)

**transactionEvent**
- `transactionId` (fk), `eventType`, `actorId` (fk user, nullable — null for system)
- `notes`, `payload` (jsonb)
- Append-only

**payoutAccount**
- `userId` (fk, unique), `stripeConnectAccountId` (unique)
- `onboardingStatus` — `"pending" | "complete" | "restricted"`
- `payoutsEnabled` (bool)

**dispute**
- `transactionId` (fk), `openedByUserId` (fk), `reason`, `description`
- `status` — `"open" | "underReview" | "resolvedBuyer" | "resolvedSeller" | "closed"`
- `resolutionNotes` (nullable), `resolvedAt` (nullable)

### trust module

**trustScore**
- `userId` (fk, unique), `currentScore` (float 0-1)
- `scoreComponents` (jsonb) — breakdown by factor
- `lastCalculatedAt` (timestamptz)

**trustEvent**
- `userId` (fk), `eventType` — `"successfulTransaction" | "noShow" | "disputeLost" | "idVerified" | "positiveReview" | "negativeReview" | "flagged"`
- `impact` (float — positive or negative)
- `payload` (jsonb) — reference IDs (transactionId, reviewId, etc.)
- Append-only

**review**
- `transactionId` (fk), `reviewerUserId` (fk), `revieweeUserId` (fk)
- `rating` (int 1-5), `comment` (text, nullable)

**flag**
- `targetType` — `"user" | "listing" | "message"`, `targetId` (uuid)
- `reporterUserId` (fk), `reason`, `description` (nullable)
- `status` — `"open" | "reviewed" | "actioned" | "dismissed"`
- `resolvedAt` (nullable), `resolutionNotes` (nullable)

### safety module

**meetPoint**
- `name`, `location` (geography Point), `address`, `category` — `"policeStation" | "supermarket" | "library" | "communityCentre"`
- `verifiedAt` (nullable), `openingHours` (jsonb), `notes` (nullable), `active` (bool)
- Index: `location` (GIST)

**safeTransitSession**
- `transactionId` (fk), `userId` (fk)
- `startedAt`, `endedAt` (nullable)
- `liveLocationShareEnabled` (bool), `trustedContactNotified` (bool)
- `arrivalConfirmedAt` (nullable), `duressTriggeredAt` (nullable)

### notifications module (extractable)

**notification**
- `userId` (fk), `type` — `"matchFound" | "messageReceived" | "transactionUpdate" | "reviewReceived" | "system"`
- `payload` (jsonb), `readAt` (nullable)
- `deliveredChannels` (text array) — e.g. `["webPush", "inApp"]`

**pushSubscription**
- `userId` (fk), `endpoint` (unique), `keys` (jsonb), `userAgent`
- `revokedAt` (nullable)

**notificationPreference**
- `userId` (fk), `notificationType`
- `channels` (text array) — enabled channels for this type
- Unique on (`userId`, `notificationType`)

### system module

**siteSetting**
- `key` (unique), `value` (jsonb), `description`

**termsAcceptance**
- `userId` (fk), `termsVersion` (string — matches repo tag), `acceptedAt`
- Unique on (`userId`, `termsVersion`)

**s3Object**
- `bucket`, `key` (unique), `contentType`, `sizeBytes` (int)
- `ownerUserId` (fk, nullable)
- `lifecycleStatus` — `"pending" | "confirmed" | "orphaned" | "deleted"`

**outbox**
- `eventType`, `payload` (jsonb), `aggregateType`, `aggregateId` (uuid)
- `status` — `"pending" | "published" | "failed"`
- `publishedAt` (nullable), `attempts` (int, default 0), `lastError` (nullable)
- Index: `status`, `createdAt` (for publisher polling)
- Append-only for handlers; only publisher updates `status`

**auditLog**
- `actorUserId` (fk, nullable), `action`, `targetType`, `targetId` (uuid, nullable)
- `ipAddress`, `userAgent`, `payload` (jsonb)
- Append-only

### ops module

**job**
- `jobType`, `payload` (jsonb)
- `status` — `"pending" | "running" | "succeeded" | "failed" | "retrying"`
- `attempts` (int), `maxAttempts` (int), `nextRunAt` (nullable), `lastError` (nullable)

### external module

**externalWebhookEvent**
- `provider` — `"stripe" | "ses" | ...`, `externalEventId` (unique per provider)
- `eventType`, `payload` (jsonb)
- `status` — `"received" | "processed" | "failed" | "duplicate"`
- `processedAt` (nullable), `error` (nullable)

**emailDelivery**
- `messageId` (unique), `toEmail`, `emailType`
- `status` — `"sent" | "delivered" | "bounced" | "complained" | "rejected"`
- `payload` (jsonb — SES event data)

## Event schemas (source of truth for module contracts)

All events defined in `shared/events/schemas.ts` as TypeScript types with Zod validators. Every event carries: `eventId` (uuid), `occurredAt` (timestamptz), `aggregateType`, `aggregateId`, `payload`.

Core events for MVP:

- `user.created` — new signup
- `user.verified` — verification completed
- `listing.created` — new listing published
- `listing.updated` — significant fields changed
- `listing.reserved` — matched buyer committed
- `listing.completed` — transaction complete
- `listing.removed` — seller withdrew
- `wishlistItem.created`, `wishlistItem.updated`
- `match.candidatesFound` — matching produced candidates for a listing
- `match.interestExpressed` — buyer tapped "interested"
- `match.winnerSelected` — first-to-commit-with-approval resolved
- `message.sent`
- `transaction.initiated`, `transaction.paymentCaptured`, `transaction.completed`, `transaction.disputed`
- `review.submitted`
- `flag.raised`
- `notification.dispatched`

## Module interfaces (public surface exported from `index.ts`)

Only these functions may be imported by other modules. Everything else is internal.

Example — `users/index.ts`:
```ts
export { getUserById, getUserPublicProfile, verifyUserExists } from './user.service';
export type { UserId, UserPublicProfile } from './user.types';
```

Example — `matching/index.ts` (extractable module — event-only integration):
```ts
// Nothing exported. Matching is invoked only via events.
// Other modules don't call matching directly — they publish events.
```

Example — `notifications/index.ts` (extractable):
```ts
// Nothing exported. Notifications is invoked only via events.
```

## API surface (Express routes)

Prefix all with `/api/v1`. All request/response bodies validated with Zod. Auth via Bearer JWT (Cognito).

### auth
- `POST /auth/signup` → creates user, initiates Cognito signup
- `POST /auth/login` → exchanges Cognito tokens for session
- `POST /auth/refresh` → rotates refresh token
- `POST /auth/logout` → revokes refresh token

### users
- `GET /users/me` → current user
- `PATCH /users/me` → update profile, preferences
- `GET /users/:userId` → public profile
- `POST /users/me/verifications/:type` → start verification
- `POST /users/me/blocks` → block a user
- `DELETE /users/me/blocks/:userId` → unblock

### listings
- `POST /listings` → create listing (draft or active)
- `GET /listings` → search (filters: category, distance, price, keyword, listingType)
- `GET /listings/:id` → single listing (records `listingView`)
- `PATCH /listings/:id` → update (owner only)
- `DELETE /listings/:id` → soft delete (owner only)
- `POST /listings/:id/photos` → request presigned S3 upload URL
- `POST /listings/:id/favourite` / `DELETE /listings/:id/favourite`

### wishlists
- `GET /wishlists` → current user's wishlist items
- `POST /wishlists` → create item
- `PATCH /wishlists/:id`, `DELETE /wishlists/:id`

### messaging
- `GET /conversations` → list current user's conversations
- `GET /conversations/:id/messages` → paginated
- `POST /conversations/:id/messages` → send message
- `POST /conversations` → start (requires listingId + participants)

### matching (buyer-facing endpoints only; matching itself is event-driven)
- `POST /matches/:candidateId/interest` → express interest in a candidate
- `POST /matches/:candidateId/commit` → commit to terms (triggers seller approval)

### transactions
- `POST /transactions` → create from an accepted match
- `GET /transactions/:id`
- `POST /transactions/:id/confirm` → seller approves the buyer
- `POST /transactions/:id/complete` → both parties confirm pickup
- `POST /transactions/:id/dispute` → open a dispute
- `GET /transactions/me` → user's transactions
- `POST /payouts/onboard` → start Stripe Connect onboarding
- `GET /payouts/status`

### trust
- `POST /reviews` → submit review for a completed transaction
- `POST /flags` → raise a flag

### safety
- `GET /meet-points` → nearby verified meet points for a location
- `POST /transactions/:id/safe-transit` → start a safe transit session
- `PATCH /safe-transit/:id` → update (arrival, end)

### notifications
- `GET /notifications` → paginated
- `PATCH /notifications/:id/read`
- `POST /notifications/subscribe` → register web push subscription
- `GET /notifications/preferences`, `PATCH /notifications/preferences`

### system
- `GET /health` → liveness + readiness
- `GET /site-settings/public` → public site settings only

### webhooks
- `POST /webhooks/stripe` → Stripe events (signature verified, idempotent via `externalWebhookEvent`)
- `POST /webhooks/ses` → SES delivery events

## Matching algorithm — v1

Triggered by `listing.created` event.

1. Fetch active `wishlistItem` rows where:
   - `categoryId` matches or is null
   - `maxPricePence >= listing.pricePence` (or listing is giveaway)
   - `listingTypePreference` matches
   - User's location is within `wishlistItem.maxDistanceKm` of `listing.location`
2. For each candidate:
   - `proximityScore` = `1 - (distanceKm / maxDistanceKm)`
   - `keywordScore` = Postgres `ts_rank` of `wishlistItem.keywords` against `listing.searchText`
   - `trustScoreAtMatch` = cached buyer trust score
   - `urgencyScore` = if listing has `deadlineAt`, higher as deadline approaches; else 0
   - `compositeScore` = weighted sum (weights in `siteSetting`)
3. Sort by `compositeScore` desc, take top N (default 10 from `siteSetting`)
4. Insert `matchCandidate` rows
5. Publish `match.candidatesFound` event

**Extension point for AI (later):**
- Add `semanticScore` component computed from `pgvector` cosine similarity between listing and wishlist embeddings
- Weight added to `compositeScore` via `siteSetting`
- No changes to the interface

## Transaction flow — Stripe Connect

1. Buyer commits to terms → `transaction` created with status `"initiated"`
2. Seller confirms → status `"paymentAuthorised"`; Stripe PaymentIntent created with buyer's payment method; funds authorised (not captured)
3. On pickup, both parties confirm → status `"paymentCaptured" → "inEscrow"`; Stripe captures funds
4. After a hold period (from `siteSetting`) → funds transferred to seller's Connect account minus commission; status `"completed"`
5. Dispute at any stage → status `"disputed"`; funds held; manual resolution

Every state change writes a `transactionEvent` row.

## Outbox pattern for reliable event publishing

- When a service commits a DB change that must produce an event, it writes the event to the `outbox` table in the same transaction
- `outboxPublisher` worker polls `outbox` for `status = "pending"` rows, publishes to the event bus, marks `"published"`
- Guarantees exactly-once semantics: DB commit ⇒ event will be published

## Auth and authorisation

- **Authentication:** Cognito JWT verified on every request (middleware). Token attaches `req.user` with `id`, `email`, `roles`
- **Authorisation:** each service function that mutates user-owned data verifies ownership. Helper: `assertOwnership(userId, entity)` throws `ForbiddenError`
- **Roles:** `"user"` (default), `"admin"`. Admin endpoints check role in middleware

## Testing strategy

- **Unit tests** (Vitest) for pure functions — scoring, formatters, validators — in the same folder as the code
- **Integration tests** for services — spin up Postgres in Docker, seed fixtures, run through service methods
- **API tests** — Supertest against Express app with test DB
- **E2E** (Playwright) — for critical flows: signup → list → match → transaction. Deferred until frontend exists.
- **Coverage:** target 80% for service and repository code; 100% for scoring and money handling
- **CI:** all tests run on every push; must pass before merge

## CI/CD

- **GitHub Actions** workflow on push:
  1. `lint` — ESLint + Prettier check
  2. `typecheck` — `tsc --noEmit`
  3. `test` — Vitest unit + integration (Postgres service in workflow)
  4. `build` — Docker image build
  5. `deploy` (on main only) — CDK deploy to staging, smoke tests, promote to prod on approval

## Observability

- **Logs:** Pino structured JSON, correlation ID per request (via middleware), redaction for PII fields (email, phone, addresses, payment IDs)
- **Metrics:** CloudWatch — request rate, error rate, p50/p95/p99 latency per route
- **Tracing:** X-Ray on outbox publisher and worker Lambdas (added at extraction time)
- **Alarms:** on 5xx rate, DB connection saturation, outbox backlog, disputed transactions

## Security requirements

- All API responses over HTTPS only
- HTTP Strict-Transport-Security header set
- CORS restricted to known frontend origins
- Rate limiting per user + per IP (via API Gateway if fronted, or `express-rate-limit`)
- Input validation on every request with Zod
- Parameterised queries only (Prisma enforces this)
- Content-Security-Policy headers on any HTML responses
- All secrets in AWS Secrets Manager; loaded on startup, cached in memory, never logged
- User passwords never stored (Cognito handles); no other password storage
- PII redaction in logs
- S3 buckets private; access via presigned URLs only
- Presigned upload URLs expire in 15 minutes, scoped to specific key + content type + max size
- Regular dependency scans (Dependabot, npm audit in CI)

## Build order for Claude Code

Follow this sequence. Do not skip ahead. Each step is a working, tested increment.

1. **Repo scaffold** — TypeScript, ESLint, Prettier, Vitest, Prisma, Pino, Zod, Express skeleton. `/health` endpoint. CI runs lint + typecheck + tests.
2. **Database + Prisma schema** — all 35 tables in `schema.prisma`. Initial migration runs cleanly. PostGIS extension enabled.
3. **Shared infrastructure** — logger, config, error classes, DB client, in-process event bus, outbox publisher (basic).
4. **Auth module** — Cognito JWT middleware, `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`.
5. **Users module** — `GET/PATCH /users/me`, `GET /users/:id`, publishes `user.created`.
6. **System module** — `siteSetting` seed, `termsAcceptance`, `s3Object`, presigned upload endpoint.
7. **Listings module** — full CRUD, photo upload flow, category seed, favourites, listingView; publishes `listing.*` events.
8. **Wishlists module** — full CRUD; publishes `wishlistItem.*` events.
9. **Matching module (extractable)** — scoring logic, `match.candidatesFound` handler for `listing.created`, `POST /matches/:id/interest`.
10. **Notifications module (extractable)** — web push, in-app; subscribes to `match.candidatesFound` and other events.
11. **Messaging module** — conversations, messages, `message.sent` events.
12. **Transactions module** — Stripe Connect integration, transaction state machine, dispute stub.
13. **Trust module** — reviews, trust score calculation (triggered by `transaction.completed` and `review.submitted`), flags.
14. **Safety module** — meet points seed for Liverpool, safe transit sessions.
15. **External module** — Stripe webhook handler with idempotency, SES event handler.
16. **E2E flow test** — full seller-to-buyer transaction via API.
17. **CDK infrastructure** — Fargate, RDS, ALB, ECR, Secrets Manager, S3. Deploy to staging.

## Environment variables

Loaded via `shared/config/env.ts` with Zod validation on startup.

```
NODE_ENV
PORT
DATABASE_URL
AWS_REGION
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
S3_BUCKET_UPLOADS
STRIPE_SECRET_KEY_SECRET_ARN     # ARN, actual value fetched from Secrets Manager
STRIPE_WEBHOOK_SECRET_SECRET_ARN
SES_FROM_EMAIL
WEB_PUSH_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY_SECRET_ARN
LOG_LEVEL
FRONTEND_ORIGIN
```

## Local development

- `docker-compose.yml` runs Postgres with PostGIS, LocalStack for S3/SES emulation
- `npm run dev` — nodemon + ts-node, hot reload
- `npm run test` — Vitest watch mode
- `npm run migrate` — Prisma migrate
- `npm run seed` — seed categories, meet points, site settings for Liverpool
