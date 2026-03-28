// ---------------------------------------------------------------------------
// POST /v1/investigate - AI-Powered Incident Investigation (SSE)
// ---------------------------------------------------------------------------
// Accepts a natural-language query and project context, creates an
// investigation record in Postgres, and streams Gemini's reasoning response
// back to the client via Server-Sent Events.
// ---------------------------------------------------------------------------

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getDb } from '@sibyl/db';
import { investigations, projects } from '@sibyl/db';
import { eq } from 'drizzle-orm';
import { streamReasoning, extractStructuredResult } from '../lib/gemini.js';
import { buildInvestigationContext } from '../lib/context-builder.js';
import { config } from '../config.js';

// ---------------------------------------------------------------------------
// Types for structured extraction
// ---------------------------------------------------------------------------

interface InvestigationMessages {
  role: string;
  content: string;
}

const investigate = new Hono();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvestigateBody {
  query: string;
  projectId: string;
  investigationId?: string; // For follow-up queries — re-fetches context
}

// ---------------------------------------------------------------------------
// System prompt for the AI investigator
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Sibyl, an AI-powered incident investigation assistant for software engineering teams.

Your job is to analyze error events, distributed traces, logs, and deployment data to identify the root cause of incidents.

When investigating:
1. State what you observe in the data clearly and concisely.
2. Form hypotheses about the root cause.
3. Explain your reasoning step by step.
4. Provide a confidence level (low / medium / high) for your conclusion.
5. Suggest concrete remediation steps.

Be precise, technical, and actionable. Avoid speculation beyond what the data supports.
Format your response using Markdown for readability.`;

// ---------------------------------------------------------------------------
// POST /investigate
// ---------------------------------------------------------------------------

investigate.post('/investigate', async (c) => {
  // --- Parse and validate body ---
  let body: InvestigateBody;
  try {
    body = await c.req.json<InvestigateBody>();
  } catch {
    return c.json(
      { error: 'Bad Request', message: 'Request body must be valid JSON.' },
      400,
    );
  }

  const { query, projectId, investigationId: existingInvestigationId } = body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return c.json(
      { error: 'Bad Request', message: 'A non-empty "query" string is required.' },
      400,
    );
  }

  if (!projectId || typeof projectId !== 'string') {
    return c.json(
      { error: 'Bad Request', message: 'A valid "projectId" is required.' },
      400,
    );
  }

  // --- Verify project exists ---
  const db = getDb(config.database.url);

  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (projectRows.length === 0) {
    return c.json(
      { error: 'Not Found', message: `Project "${projectId}" does not exist.` },
      404,
    );
  }

  // --- Create or reuse investigation record ---
  let investigationId: string;
  let previousMessages: InvestigationMessages[] = [];

  if (existingInvestigationId) {
    // Follow-up query — reuse existing investigation, re-fetch context
    const existing = await db
      .select()
      .from(investigations)
      .where(eq(investigations.id, existingInvestigationId))
      .limit(1);

    if (existing.length > 0) {
      investigationId = existingInvestigationId;
      previousMessages = (existing[0].messages || []) as InvestigationMessages[];
      await db
        .update(investigations)
        .set({ status: 'running' })
        .where(eq(investigations.id, investigationId));
    } else {
      // Fallback: create new
      const [inv] = await db
        .insert(investigations)
        .values({ projectId, query: query.trim(), status: 'running', messages: [] })
        .returning({ id: investigations.id });
      investigationId = inv!.id;
    }
  } else {
    const [investigation] = await db
      .insert(investigations)
      .values({
        projectId,
        query: query.trim(),
        status: 'running',
        messages: [],
      })
      .returning({ id: investigations.id });

    if (!investigation) {
      return c.json(
        { error: 'Internal Server Error', message: 'Failed to create investigation record.' },
        500,
      );
    }
    investigationId = investigation.id;
  }

  // --- Check if Gemini is configured ---
  if (!config.gemini.apiKey) {
    // Mark as failed and return a non-streaming error
    await db
      .update(investigations)
      .set({ status: 'failed' })
      .where(eq(investigations.id, investigationId));

    return c.json(
      {
        error: 'Service Unavailable',
        message: 'AI reasoning is not available. GEMINI_API_KEY is not configured.',
        investigationId,
      },
      503,
    );
  }

  // --- Build context from telemetry data ---
  let investigationContext;
  try {
    investigationContext = await buildInvestigationContext(projectId, query.trim());
  } catch (err) {
    console.warn('[investigate] Context building failed, proceeding without:', err);
    investigationContext = {
      promptContext: 'No telemetry data available. Reason based on general SRE expertise.',
      evidence: [],
      correlations: [],
    };
  }

  const userPrompt = [
    `# Investigation Query`,
    query.trim(),
    '',
    investigationContext.promptContext,
    '',
    investigationContext.correlations.length > 0
      ? `## Automated Correlations\n${investigationContext.correlations.map(c => `- ${c}`).join('\n')}`
      : '',
    '',
    'Based on the evidence above, identify the root cause. Reference specific events, traces, or deploys as evidence.',
  ].filter(Boolean).join('\n');

  // --- Stream the response via SSE ---
  return streamSSE(c, async (stream) => {
    // Send the investigation ID and evidence as the first event
    await stream.writeSSE({
      event: 'investigation_start',
      data: JSON.stringify({
        investigationId,
        evidence: investigationContext.evidence,
        correlations: investigationContext.correlations,
      }),
    });

    let fullResponse = '';

    try {
      for await (const chunk of streamReasoning(SYSTEM_PROMPT, userPrompt)) {
        fullResponse += chunk;

        await stream.writeSSE({
          event: 'chunk',
          data: JSON.stringify({ text: chunk }),
        });
      }

      // --- Extract structured fields via Gemini ---
      let rootCause: string | undefined;
      let confidence: number | undefined;
      let suggestedFixes: string[] = [];

      try {
        const structured = await extractStructuredResult(fullResponse);
        rootCause = structured.rootCause;
        confidence = structured.confidence;
        suggestedFixes = structured.suggestedFixes;
      } catch (extractErr) {
        console.warn('[investigate] Structured extraction failed:', extractErr);
      }

      // --- Persist the completed investigation ---
      const updatedMessages = [
        ...previousMessages,
        { role: 'user', content: query.trim() },
        { role: 'assistant', content: fullResponse },
      ];

      await db
        .update(investigations)
        .set({
          status: 'completed',
          summary: fullResponse.slice(0, 500),
          rootCause: rootCause || null,
          confidence: confidence ?? null,
          messages: updatedMessages,
        })
        .where(eq(investigations.id, investigationId));

      await stream.writeSSE({
        event: 'investigation_complete',
        data: JSON.stringify({
          investigationId,
          status: 'completed',
          rootCause,
          confidence,
          suggestedFixes,
        }),
      });
    } catch (err) {
      console.error('[investigate] Streaming error:', err);

      // Mark investigation as failed
      await db
        .update(investigations)
        .set({ status: 'failed' })
        .where(eq(investigations.id, investigationId));

      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({
          investigationId,
          error: 'Investigation failed due to an internal error.',
        }),
      });
    }
  });
});

export default investigate;
