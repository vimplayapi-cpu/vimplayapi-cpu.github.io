# Live Miracle — production image.
#
# Deliberately NOT a Next.js "standalone" build: this app uses two native
# modules (better-sqlite3, sharp) and reads its SQL migrations from disk at
# runtime, both of which standalone's file tracing handles poorly. A full
# node_modules image is a little larger and considerably more predictable.

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# --------------------------------------------------------------------------
# Dependencies — needs a toolchain because better-sqlite3 compiles natively.
# --------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------------------
# Build — `prebuild` generates the image derivatives and brand assets, so the
# source photography must be present here.
# --------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# A build-time placeholder only. The real secret is injected at runtime; the
# build never reads or bakes it in.
ENV LM_APP_SECRET=build-time-placeholder-not-used-at-runtime-000000
ENV NODE_ENV=production
RUN npm run build

# --------------------------------------------------------------------------
# Runtime
# --------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Run unprivileged.
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
# Migrations are read from disk at boot; scripts/ powers seeding and the
# smoke suite.
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# /app/data holds ALL mutable state — the SQLite database and uploaded media
# (data/uploads) — so a single persistent volume mounted here covers both.
# Without that volume, every CMS edit, uploaded asset and inquiry is lost on
# each redeploy.
RUN mkdir -p /app/data/uploads \
 && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

# Fails the container if the app stops serving.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
