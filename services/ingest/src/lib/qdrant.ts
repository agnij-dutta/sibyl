// ---------------------------------------------------------------------------
// Qdrant Vector Database Client
// ---------------------------------------------------------------------------
// Uses the Qdrant REST API directly via fetch -- no additional dependencies.
// Manages the sibyl_events collection for semantic search over error events.
// ---------------------------------------------------------------------------

import { config } from '../config.js';

/** text-embedding-004 produces 768-dimensional vectors. */
const VECTOR_SIZE = 768;

/** Build headers including API key if configured. */
function headers(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  if (config.qdrant.apiKey) {
    h['api-key'] = config.qdrant.apiKey;
  }
  return h;
}

// ---------------------------------------------------------------------------
// Collection lifecycle
// ---------------------------------------------------------------------------

export async function ensureCollection(): Promise<void> {
  const url = `${config.qdrant.url}/collections/${config.qdrant.collection}`;

  try {
    const res = await fetch(url, { method: 'GET', headers: headers() });

    if (res.status === 404) {
      const createRes = await fetch(url, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
          optimizers_config: { indexing_threshold: 20000 },
        }),
      });

      if (!createRes.ok) {
        const body = await createRes.text();
        console.error(`[qdrant] Failed to create collection: ${createRes.status} ${body}`);
      } else {
        console.log(`[qdrant] Created collection "${config.qdrant.collection}"`);
      }
    }
  } catch (err) {
    console.error('[qdrant] Failed to ensure collection exists:', err);
  }
}

// ---------------------------------------------------------------------------
// Point operations
// ---------------------------------------------------------------------------

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export async function upsertVectors(points: QdrantPoint[]): Promise<void> {
  if (points.length === 0) return;

  const url = `${config.qdrant.url}/collections/${config.qdrant.collection}/points`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ points }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[qdrant] upsert failed: ${res.status} ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface QdrantSearchResult {
  id: string;
  version: number;
  score: number;
  payload: Record<string, unknown>;
}

export async function searchVectors(
  vector: number[],
  limit = 50,
  filter?: Record<string, unknown>,
): Promise<QdrantSearchResult[]> {
  const url = `${config.qdrant.url}/collections/${config.qdrant.collection}/points/search`;

  const body: Record<string, unknown> = {
    vector,
    limit,
    with_payload: true,
  };
  if (filter) {
    body.filter = filter;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[qdrant] search failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { result?: QdrantSearchResult[] };
  return data.result || [];
}
