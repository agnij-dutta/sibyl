################################################################################
# Sibyl Ingest Service - Multi-stage Docker Build
################################################################################
# Build context: repo root
################################################################################

FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json for all needed workspace packages
COPY services/ingest/package.json ./services/ingest/
COPY packages/db/package.json ./packages/db/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/db/ ./packages/db/
COPY services/ingest/ ./services/ingest/

# Build @sibyl/db first (dependency), then ingest service
RUN pnpm --filter @sibyl/db build
RUN pnpm --filter @sibyl/ingest build

# ---------------------------------------------------------------------------
# Production image
# ---------------------------------------------------------------------------
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN addgroup -S sibyl && adduser -S sibyl -G sibyl

WORKDIR /app

# Copy workspace structure with compiled output
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled packages
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules

COPY --from=builder /app/services/ingest/package.json ./services/ingest/
COPY --from=builder /app/services/ingest/dist ./services/ingest/dist
COPY --from=builder /app/services/ingest/node_modules ./services/ingest/node_modules

USER sibyl
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/healthz || exit 1

WORKDIR /app/services/ingest
CMD ["node", "dist/index.js"]
