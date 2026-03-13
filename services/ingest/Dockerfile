################################################################################
# Sibyl Ingest Service - Multi-stage Docker Build
################################################################################
# Build context: repo root (set dockerfilePath in render.yaml)
################################################################################

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies and build TypeScript
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

RUN corepack enable

WORKDIR /app

# Copy workspace root files for dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the ingest service package.json and shared packages
COPY services/ingest/package.json ./services/ingest/
COPY packages/db/package.json ./packages/db/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY services/ingest/ ./services/ingest/
COPY packages/db/ ./packages/db/

# Build the ingest service
RUN pnpm --filter @sibyl/ingest build

# ---------------------------------------------------------------------------
# Stage 2: Production image (minimal footprint)
# ---------------------------------------------------------------------------
FROM node:20-alpine

RUN addgroup -S sibyl && adduser -S sibyl -G sibyl

WORKDIR /app

# Copy compiled output and dependencies
COPY --from=builder /app/services/ingest/dist ./dist
COPY --from=builder /app/services/ingest/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/services/ingest/package.json ./

LABEL org.opencontainers.image.title="sibyl-ingest" \
      org.opencontainers.image.description="Sibyl telemetry ingestion and AI investigation service"

USER sibyl

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/healthz || exit 1

CMD ["node", "dist/index.js"]
