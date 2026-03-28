// ---------------------------------------------------------------------------
// Google Gemini API Wrapper
// ---------------------------------------------------------------------------
// Provides embedding generation, batch embedding, and streaming AI reasoning
// backed by Gemini 2.0 Flash and text-embedding-004.
// ---------------------------------------------------------------------------

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!config.gemini.apiKey) {
      throw new Error('[gemini] GEMINI_API_KEY is not configured.');
    }
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

/**
 * Generate a single embedding vector for the given text.
 *
 * @returns A 768-dimensional float array (text-embedding-004).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: config.gemini.embeddingModel });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate embeddings for a batch of texts.
 *
 * Processes all texts in parallel. For very large batches the caller should
 * chunk the input to stay within Gemini rate limits.
 */
export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const results = await Promise.all(texts.map((t) => generateEmbedding(t)));
  return results;
}

// ---------------------------------------------------------------------------
// Reasoning (chat / streaming)
// ---------------------------------------------------------------------------

/**
 * Return a Gemini GenerativeModel instance for the configured reasoning model.
 */
export function getReasoningModel() {
  const ai = getGenAI();
  return ai.getGenerativeModel({ model: config.gemini.model });
}

/**
 * Stream a reasoning response from Gemini, yielding text chunks as they
 * arrive. Designed for SSE streaming to the client.
 *
 * @param systemPrompt - System-level instructions for the model.
 * @param userPrompt   - The user/operator query.
 */
export async function* streamReasoning(
  systemPrompt: string,
  userPrompt: string,
): AsyncGenerator<string> {
  const model = getReasoningModel();
  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
  });

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

// ---------------------------------------------------------------------------
// Structured Output Extraction
// ---------------------------------------------------------------------------

export interface StructuredInvestigationResult {
  rootCause: string;
  confidence: number;
  suggestedFixes: string[];
}

/**
 * Extract structured fields from a completed investigation response.
 * Uses Gemini with JSON-mode instructions to parse the free-form analysis
 * into a deterministic { rootCause, confidence, suggestedFixes } object.
 */
export async function extractStructuredResult(
  fullResponse: string,
): Promise<StructuredInvestigationResult> {
  const model = getReasoningModel();

  const extractionPrompt = `You are a structured data extractor. Given the following incident investigation analysis, extract EXACTLY three fields as JSON:

1. "rootCause" — a single concise sentence identifying the root cause
2. "confidence" — an integer 0-100 representing how confident the analysis is
3. "suggestedFixes" — an array of 1-5 concrete remediation steps (short strings)

Respond with ONLY valid JSON, no markdown, no code fences, no explanation.

Example output:
{"rootCause":"Memory leak in connection pool causing OOM kills","confidence":82,"suggestedFixes":["Increase pool max connections from 10 to 50","Add connection timeout of 30s","Deploy canary with fix to staging first"]}

Investigation analysis to extract from:
${fullResponse.slice(0, 8000)}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
  });

  const text = result.response.text().trim();

  // Parse JSON — handle potential markdown fences
  const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      rootCause: typeof parsed.rootCause === 'string' ? parsed.rootCause : 'Unable to determine root cause',
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : 50,
      suggestedFixes: Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes.filter((s: unknown) => typeof s === 'string') : [],
    };
  } catch {
    // Fallback: extract what we can from the raw text
    return {
      rootCause: fullResponse.slice(0, 200),
      confidence: 50,
      suggestedFixes: [],
    };
  }
}

// ---------------------------------------------------------------------------
// RAG Reranking
// ---------------------------------------------------------------------------

export interface RerankResult {
  index: number;
  relevanceScore: number;
}

/**
 * Rerank a set of candidate texts against a query using Gemini.
 * Returns indices sorted by relevance with scores.
 */
export async function rerankWithGemini(
  query: string,
  candidates: string[],
): Promise<RerankResult[]> {
  if (candidates.length === 0) return [];

  const model = getReasoningModel();
  const candidateList = candidates.map((c, i) => `[${i}] ${c.slice(0, 300)}`).join('\n');

  const prompt = `You are a relevance scorer. Given a search query and candidate documents, score each candidate's relevance to the query from 0.0 to 1.0.

Query: "${query}"

Candidates:
${candidateList}

Respond with ONLY a JSON array of objects with "index" (integer) and "score" (float 0-1), sorted by score descending. No markdown, no explanation.
Example: [{"index":2,"score":0.95},{"index":0,"score":0.7},{"index":1,"score":0.3}]`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = result.response.text().trim();
  const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return candidates.map((_, i) => ({ index: i, relevanceScore: 0.5 }));
    return parsed
      .filter((r: any) => typeof r.index === 'number' && typeof r.score === 'number')
      .map((r: any) => ({ index: r.index, relevanceScore: r.score }))
      .sort((a: RerankResult, b: RerankResult) => b.relevanceScore - a.relevanceScore);
  } catch {
    return candidates.map((_, i) => ({ index: i, relevanceScore: 0.5 }));
  }
}
