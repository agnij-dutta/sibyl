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
