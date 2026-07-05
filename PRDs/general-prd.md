# General PRD — Declutter Marketplace

## Overview

A local marketplace web app where users list items to **sell** or **give away**, with an **active matching engine** that proactively connects new listings to nearby users who have expressed interest. Launch market is Liverpool, UK. Sell and give-away are treated as equal first-class paths. Listing is free; sales pay a commission via escrowed payments through Stripe Connect.

## Problem

Existing marketplaces (Facebook Marketplace, Gumtree, Vinted, Olio) operate on a **post-and-wait** or **browse-and-search** model. Sellers post and hope buyers find them. Buyers scroll through irrelevant listings. This creates a "waiting gap" — the time between an item being available and the right person finding it. During this gap, items get abandoned, thrown away, or sold at deep discount out of frustration.

## Product principle

Close the waiting gap by **matching the right item to the right person at the right time**, locally. The core intelligence is a matching engine that ranks candidate buyers for each new listing by proximity, semantic match, trust level, urgency, and priority.

## Users

- **Sellers / givers** — individuals decluttering, moving, or upgrading
- **Buyers / recipients** — individuals seeking specific items locally
- **Platform operators** — internal team managing trust, safety, disputes

## MVP scope

Web app (Next.js) launched in Liverpool, UK.

**In scope for MVP:**
- User signup, login, profile, verification (email + optional ID)
- Create, edit, delete listings with photos, category, condition, price or free
- Optional listing deadline (moving-house urgency signal)
- Browse and search listings by category, distance, keyword
- Wishlist: user-declared intent (category, keywords, max price, radius)
- Active matching: on new listing, notify top-N candidates (up to ~10) ranked by composite score
- First-to-commit wins, with seller final approval for higher-value items
- In-app messaging between buyer and seller
- Escrowed payment via Stripe Connect (commission on sales)
- Post-transaction review and rating
- Trust score computed from verified events (reviews, transactions, flags)
- Verified safe meet points (curated database, suggested at transaction time)
- Basic safety affordances at pickup: live location share, arrival confirmation
- Flagging and manual moderation

**Explicitly out of scope for MVP (deferred):**
- Native mobile apps (web is mobile-responsive; PWA-capable)
- AI-powered semantic matching (v1 uses keyword + category + geospatial + trust)
- Logistics partnerships for large items
- Multi-city expansion
- B2B portals (letting agents, councils, charities)
- Automated moderation and fraud detection
- Public API

## Success criteria

- Users can list an item and receive a matched buyer within a defined window
- Buyers can create wishlists and receive relevant notifications
- Transactions can be completed end-to-end via the platform
- Trust and safety operations can handle incidents within SLA
- The system is observable, testable, and deployable through CI/CD

## Architecture summary

**Modular monolith** in Node.js + Express + TypeScript, deployed as a container on AWS Fargate behind an Application Load Balancer. Single PostgreSQL database (with PostGIS) organised into module-owned schemas. Frontend is Next.js (React + TypeScript) deployed on Vercel or AWS Amplify.

**Extraction plan:** two modules (`matching` and `notifications`) are designed from day one for future extraction into standalone AWS Lambda services communicating via SNS + SQS. All other modules stay in the monolith.

**Cross-cutting concerns:**
- **Modularity** — every feature is a module owning its own tables, service, tests, and events
- **Testability** — automated tests at unit, integration, and end-to-end levels; CI runs on every push
- **Scalability** — designed to scale vertically first (Fargate task size); horizontal scaling paths designed but not built
- **Security** — auth via Cognito, authorisation in application layer, secrets in AWS Secrets Manager, TLS everywhere, PII minimisation, GDPR compliance

## Modules

- **users** — accounts, profiles, verification, blocks
- **auth** — sessions, tokens (Cognito integration)
- **listings** — items for sale or giveaway, photos, categories, favourites, views
- **wishlists** — user-declared intent
- **matching** *(extractable)* — candidate ranking and events
- **messaging** — buyer-seller conversations
- **transactions** — Stripe Connect flow, payouts, disputes
- **trust** — reputation scoring, reviews, flags
- **safety** — meet points, safe transit sessions
- **notifications** *(extractable)* — delivery via web push, in-app, email
- **system** — config, terms, S3 objects, outbox, audit
- **ops** — background jobs
- **external** — third-party webhooks, email delivery events

## Extraction principles (matching and notifications)

- Communicate with other modules **only via events**, never direct function calls
- No shared code with other modules beyond types and event schemas
- Handler code is separable from publisher code (worker mode from day one)
- In-process event bus at MVP is a typed EventEmitter; swap for SNS + SQS on extraction with zero handler changes

## Constraints and principles

- **Language:** TypeScript everywhere (frontend + backend)
- **Naming:** camelCase for all identifiers — tables, columns, variables, API fields, TypeScript keys
- **Money:** always stored as integer pence in a `pricePence` (or similar) column, never floats
- **Location:** PostGIS `geography(Point, 4326)` with an accuracy column; approximate locations preferred to protect user privacy
- **IDs:** UUID v4 for all primary keys
- **Timestamps:** every table has `createdAt` and `updatedAt` (both `timestamptz`)
- **Enums:** stored as string values (not integers) for readability
- **Secrets:** never in code, env files, or the database — AWS Secrets Manager or SSM Parameter Store only
- **Content (T&Cs, help):** versioned in the repo, deployed with the app; `termsAcceptance` records which version each user agreed to

## Non-functional requirements

- **Availability:** 99% at MVP; single AZ acceptable
- **Latency:** p95 API response < 400ms for reads, < 800ms for writes
- **Data protection:** GDPR-compliant by design; user deletion within 30 days; data export on request
- **Observability:** structured logs (Pino), CloudWatch metrics, distributed tracing on async workers
- **Testing:** unit, integration, and end-to-end tests; CI must pass before merge

## Out of scope (permanently or long-term)

- Cryptocurrency payments
- Auctions or bidding models
- Public commenting on listings
- User-to-user tipping
- Cross-border transactions

## Related documents

- `backend-prd.md` — data model, module interfaces, event schemas, API surface, backend build order
- `frontend-prd.md` — Next.js structure, routes, user flows, component organisation (written after backend is functional)
