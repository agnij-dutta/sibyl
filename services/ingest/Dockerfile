################################################################################
# Sibyl Ingest Service - Multi-stage Docker Build
################################################################################

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies and build TypeScript
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

# pnpm ships with corepack in Node 20
RUN corepack enable

WORKDIR /app

# Copy only the files needed for dependency resolution first (layer caching)
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src

RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 2: Production image (minimal footprint)
# ---------------------------------------------------------------------------
FROM node:20-alpine

# Security: run as non-root
RUN addgroup -S sibyl && adduser -S sibyl -G sibyl

WORKDIR /app

# Copy compiled output and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Metadata
LABEL org.opencontainers.image.title="sibyl-ingest" \
      org.opencontainers.image.description="Sibyl telemetry ingestion and AI investigation service" \
      org.opencontainers.image.source="https://github.com/sibyl-platform/sibyl"

# Switch to non-root user
USER sibyl

EXPOSE 3001

# Health check for orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/healthz || exit 1

CMD ["node", "dist/index.js"]
