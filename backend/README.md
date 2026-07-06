# LetsCycle — backend

Local decluttering marketplace. Modular monolith: Node.js + TypeScript (strict) + Express + Prisma + PostgreSQL 16/PostGIS.

Product and build specs live in [../PRDs/](../PRDs/) — read `general-prd.md`, then `backend-prd.md`.

## Requirements

- Node.js 20+ (CI and the production image pin Node 20; newer local versions work)
- Docker (for Postgres/PostGIS — from build step 2 onwards)

## Commands

| Command             | What it does                             |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | tsx watch, hot reload                    |
| `npm run test`      | Vitest (watch locally, single run in CI) |
| `npm run lint`      | ESLint + Prettier check                  |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run build`     | Compile to `dist/`                       |
| `npm run migrate`   | Prisma migrate                           |

## Local setup

1. Copy `.env.example` to `.env`
2. `docker compose up -d` — Postgres 16 + PostGIS on `localhost:5432`
3. `npm install && npx prisma generate`
4. `npm run migrate` — apply migrations
5. `npm run dev`

Secrets are never committed — AWS Secrets Manager only.
