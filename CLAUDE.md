# Sibyl — AI-Native Incident Investigation Platform

## Architecture
- **Monorepo**: Turborepo + pnpm workspaces
- **Web app** (`apps/web`): Next.js 15 (App Router) — handles auth, CRUD, dashboard, search, exploration
- **Ingest service** (`services/ingest`): Always-on Hono (Node.js) — telemetry ingestion, AI streaming, background workers
- **Database** (`packages/db`): Shared Drizzle ORM schema (PostgreSQL/Neon) + ClickHouse DDL
- **SDKs**: `packages/sdk-node` (@sibyl/node), `packages/sdk-python` (sibyl-sdk)

## Tech Stack
- TypeScript end-to-end
- Next.js 15 (App Router) + React 19 + Tailwind CSS + shadcn/ui
- Hono (ingest service)
- Drizzle ORM (PostgreSQL/Neon)
- ClickHouse (telemetry storage)
- Qdrant (vector search)
- Redis/Upstash (caching, pub/sub)
- Google Gemini 2.0 Flash (AI reasoning + embeddings)

## Design System
- Fonts: Outfit (sans-serif) + Space Mono (monospace)
- Brand color: Indigo-violet (`#6366f1`)
- Full light + dark mode via next-themes
- FLIP-style glassmorphism, premium cards, gradient mesh
- shadcn/ui + Radix primitives + framer-motion

## Commands
- `pnpm dev` — run all apps in development
- `pnpm dev:web` — run web app only
- `pnpm dev:ingest` — run ingest service only
- `pnpm build` — build everything
- `pnpm db:generate` — generate Drizzle migrations
- `pnpm db:push` — push schema to database
- `docker compose up -d` — start local infrastructure

## Key Conventions
- All API routes in `apps/web/src/app/api/`
- Auth via JWT (jose library)
- Ingest API at `services/ingest/src/routes/`
- Shared types in `packages/db`
- Environment variables in `.env.local` (never committed)
