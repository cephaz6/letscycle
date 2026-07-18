# syntax=docker/dockerfile:1
#
# LetsCycle backend API (Express + Prisma). Runs the dummy service seams, so it
# needs only a database — no AWS credentials — for a local/demo stack.
#
#   docker build -t letscycle-backend .
#
# At container start it applies pending migrations, then serves on :3000.

FROM node:20-alpine AS base
# Prisma's query engine needs OpenSSL at build and runtime.
RUN apk add --no-cache openssl
WORKDIR /app

# --- deps: install against the lockfile (cached layer) ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: generate the Prisma client and compile TS → dist ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runner: run migrations then the compiled server ---
FROM base AS runner
ENV NODE_ENV=development
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nodejs

# Full node_modules (incl. Prisma CLI + generated client) so `migrate deploy`
# can run at startup. dist + prisma schema/config for runtime.
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Writable dir for the dev media store (dummy S3 stand-in).
RUN mkdir uploads && chown nodejs:nodejs uploads

USER nodejs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
