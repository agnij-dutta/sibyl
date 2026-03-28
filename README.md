# Sibyl

**AI-Native Incident Investigation Platform**

Sibyl is an investigation-first observability platform that uses AI as the primary interaction model. It combines streaming telemetry ingestion, vector search (RAG), and LLM reasoning to automatically analyze production failures, identify root causes, and suggest fixes with confidence scores.

## What Makes Sibyl Different

- **AI-native from day one** - Investigation-first, not dashboard-first. Ask questions in plain English.
- **Automatic cross-signal correlation** - Logs + traces + deploys + metrics correlated automatically.
- **Structured root cause analysis** - Every investigation produces a root cause, confidence score (0-100), and actionable fix suggestions.
- **RAG over past incidents** - Semantic search with Gemini reranking finds similar past incidents to inform analysis.
- **Auto-triggered investigations** - New high-severity incidents automatically get investigated by AI.
- **Feedback loop** - Rate investigation accuracy to continuously improve RAG quality.

## Architecture

```
sibyl/
├── apps/web/              # Next.js 15 (App Router) - auth, CRUD, dashboard, search, exploration
├── services/ingest/       # Hono (Node.js) - telemetry ingestion, AI streaming, background workers
├── packages/db/           # Shared Drizzle ORM schema (PostgreSQL) + ClickHouse DDL
├── packages/sdk-node/     # @sibyl/node SDK (npm)
└── packages/sdk-python/   # sibyl-sdk (PyPI)
```

**Hybrid split**: Next.js handles ~80% of the backend (auth, CRUD, dashboard). The Hono ingest service handles the hot path (telemetry, AI streaming, background workers) as a separate always-on process.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui |
| Ingest Service | Hono (Node.js), SSE streaming |
| Database | PostgreSQL (Neon) via Drizzle ORM |
| Telemetry Store | ClickHouse (events + spans, MergeTree, 30-day TTL) |
| Vector Search | Qdrant (768-dim embeddings via Gemini text-embedding-004) |
| Cache | Redis / Upstash |
| AI | Google Gemini 2.0 Flash (reasoning, embeddings, reranking, structured extraction) |
| Auth | JWT (jose, HS256, httpOnly cookies) |
| Monorepo | Turborepo + pnpm workspaces |

## AI Investigation Pipeline

```
User query (or auto-trigger from incident detector)
  |
  v
Context Builder (parallel queries):
  1. Recent errors (ClickHouse, last 2h)
  2. Error/slow spans (ClickHouse, last 2h)
  3. Semantically similar past events (Qdrant + Gemini reranking)
  4. Recent deploys (PostgreSQL)
  5. Open incidents (PostgreSQL)
  6. Cross-signal correlations (deploy<->error, service cascade, z-score spike)
  |
  v
Gemini 2.0 Flash streaming response (SSE)
  |
  v
Structured extraction (second Gemini call):
  -> rootCause (string)
  -> confidence (0-100)
  -> suggestedFixes (string[])
  |
  v
Persisted to PostgreSQL + streamed to frontend
```

## Background Workers

| Worker | Interval | Purpose |
|--------|----------|---------|
| Embedding Worker | 30s | Polls ClickHouse for new events, generates Gemini embeddings, upserts to Qdrant |
| Incident Detector | 60s | Groups errors by fingerprint, creates/updates incidents, auto-triggers AI investigations |
| Alert Evaluator | 120s | Evaluates threshold rules against ClickHouse metrics, fires webhook/Slack notifications |

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm 9.x
- Docker (for local infrastructure)

### Setup

```bash
# Clone
git clone https://github.com/agnij-dutta/sibyl.git
cd sibyl

# Install dependencies
pnpm install

# Start local infrastructure (ClickHouse, Qdrant, Redis)
docker compose up -d

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Push database schema
pnpm db:push

# Run everything
pnpm dev
```

### Environment Variables

```env
DATABASE_URL=            # Neon PostgreSQL connection string
JWT_SECRET=              # Secret for JWT signing
CLICKHOUSE_URL=          # ClickHouse HTTP endpoint
CLICKHOUSE_USERNAME=     # ClickHouse user
CLICKHOUSE_PASSWORD=     # ClickHouse password
REDIS_URL=               # Redis/Upstash connection string
QDRANT_URL=              # Qdrant REST endpoint
QDRANT_API_KEY=          # Qdrant API key (optional for local)
GEMINI_API_KEY=          # Google Gemini API key
```

## SDK Integration

### Node.js

```bash
npm install @sibyl/node
```

```typescript
import { Sibyl } from '@sibyl/node';

Sibyl.init({
  dsn: 'https://<key>@sibyl.dev/<project>',
  autoInstrument: true, // auto-captures uncaught exceptions, HTTP spans
});
```

### Python

```bash
pip install sibyl-sdk
```

```python
import sibyl

sibyl.init(dsn="https://<key>@sibyl.dev/<project>")
```

## API Endpoints

### Ingest Service

| Route | Method | Purpose |
|-------|--------|---------|
| `/v1/ingest` | POST | Batch ingest events and spans |
| `/v1/investigate` | POST | AI investigation (SSE stream) |
| `/healthz` | GET | Health check |

### Web App API (15 routes)

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth/signup` | POST | Create org + user |
| `/api/auth/login` | POST | JWT authentication |
| `/api/auth/me` | GET, DELETE | Current user, logout |
| `/api/projects` | GET, POST | Project CRUD + DSN generation |
| `/api/explore/logs` | GET | Query ClickHouse logs |
| `/api/explore/traces` | GET | List distributed traces |
| `/api/explore/traces/[traceId]` | GET | Full trace waterfall |
| `/api/search` | POST | Hybrid semantic + keyword search |
| `/api/incidents` | GET | List incidents |
| `/api/incidents/[id]` | GET, PATCH | Incident detail + status update |
| `/api/alerts` | GET, POST, PATCH, DELETE | Alert rule CRUD |
| `/api/services` | GET | Auto-discover services from spans |
| `/api/dashboard` | GET | Dashboard aggregations |
| `/api/investigations/feedback` | GET, POST | Investigation feedback + accuracy stats |
| `/api/health` | GET | Health check |

## Dashboard Pages

- **Overview** - StatusCards with sparklines, error charts, investigation timeline
- **Investigate** - Natural language query input with AI-powered streaming analysis
- **Incidents** - Auto-detected incidents grouped by fingerprint, with status management
- **Logs** - Filterable log explorer (level, service, time range, search)
- **Traces** - Distributed trace list with waterfall visualization
- **Services** - Health grid + SVG dependency map
- **Alerts** - Threshold-based alert rules with webhook/Slack channels
- **Settings** - Project management, DSN display, SDK setup instructions

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch
```

47 tests across 5 suites:
- `packages/db` - ID generation
- `packages/sdk-node` - Client DSN parsing, config, capture, breadcrumbs, flush
- `services/ingest` - Error fingerprinting and normalization
- `apps/web` - JWT auth token lifecycle

## Deployment

| Component | Service |
|-----------|---------|
| Web (frontend + API) | Vercel |
| Ingest service | Render (Docker) |
| PostgreSQL | Neon |
| ClickHouse | ClickHouse Cloud |
| Redis | Upstash |
| Qdrant | Qdrant Cloud |

CI/CD via GitHub Actions:
- `ci.yml` - typecheck + test + lint on push/PR
- `deploy-ingest.yml` - auto-deploy to Render on ingest/db changes

## License

MIT
