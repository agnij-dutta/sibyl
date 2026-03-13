################################################################################
# Sibyl Ingest Service - Multi-stage Docker Build
################################################################################
# Build context: repo root
################################################################################

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies and build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for all workspace packages we need
COPY services/ingest/package.json ./services/ingest/
COPY packages/db/package.json ./packages/db/

# Install all dependencies (workspace-aware)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY services/ingest/ ./services/ingest/
COPY packages/db/ ./packages/db/

# Build the db package first (it's a dependency), then ingest
RUN pnpm --filter @sibyl/db build 2>/dev/null || true
RUN pnpm --filter @sibyl/ingest build

# ---------------------------------------------------------------------------
# Stage 2: Production image
# ---------------------------------------------------------------------------
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN addgroup -S sibyl && adduser -S sibyl -G sibyl

WORKDIR /app

# Copy the entire workspace so pnpm workspace links work
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/ingest ./services/ingest
COPY --from=builder /app/packages/db ./packages/db

LABEL org.opencontainers.image.title="sibyl-ingest"

USER sibyl

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/healthz || exit 1

WORKDIR /app/services/ingest
CMD ["node", "dist/index.js"]
