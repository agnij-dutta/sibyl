'use client';

import { useState, useCallback, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Evidence {
  type: 'log' | 'trace' | 'deploy' | 'metric' | 'incident' | 'correlation';
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  severity?: 'error' | 'warning' | 'info';
  metadata?: Record<string, unknown>;
}

interface Investigation {
  id: string;
  query: string;
  status: 'running' | 'completed' | 'failed';
  messages: Message[];
  evidence: Evidence[];
  correlations: string[];
  rootCause?: string;
  confidence?: number;
}

const INGEST_URL = process.env.NEXT_PUBLIC_INGEST_URL || 'http://localhost:3001';

export function useInvestigation(projectId: string) {
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startInvestigation = useCallback(async (query: string) => {
    setError(null);
    setIsStreaming(true);

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setInvestigation(prev => ({
      id: prev?.id || '',
      query,
      status: 'running',
      messages: [...(prev?.messages || []), userMessage],
      evidence: prev?.evidence || [],
      correlations: prev?.correlations || [],
    }));

    try {
      abortRef.current = new AbortController();

      const response = await fetch(`${INGEST_URL}/v1/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, projectId }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Investigation failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let currentEventType: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          // Track event type from SSE event: lines
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              currentEventType = null;
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              switch (currentEventType) {
                case 'investigation_start': {
                  // Contains investigationId, evidence, and correlations
                  setInvestigation(prev => prev ? {
                    ...prev,
                    id: parsed.investigationId || prev.id,
                    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : prev.evidence,
                    correlations: Array.isArray(parsed.correlations) ? parsed.correlations : prev.correlations,
                  } : prev);
                  break;
                }

                case 'chunk': {
                  // Streaming text chunk
                  if (parsed.text) {
                    assistantContent += parsed.text;
                    setInvestigation(prev => {
                      if (!prev) return prev;
                      const messages = [...prev.messages];
                      const lastMsg = messages[messages.length - 1];

                      if (lastMsg?.role === 'assistant') {
                        messages[messages.length - 1] = { ...lastMsg, content: assistantContent };
                      } else {
                        messages.push({
                          role: 'assistant',
                          content: assistantContent,
                          timestamp: new Date(),
                        });
                      }

                      return { ...prev, messages };
                    });
                  }
                  break;
                }

                case 'investigation_complete': {
                  setInvestigation(prev => prev ? {
                    ...prev,
                    id: parsed.investigationId || prev.id,
                    status: 'completed' as const,
                    rootCause: parsed.rootCause || prev.rootCause,
                    confidence: parsed.confidence || prev.confidence,
                  } : prev);
                  break;
                }

                case 'error': {
                  setError(parsed.error || 'Investigation failed');
                  setInvestigation(prev => prev ? {
                    ...prev,
                    id: parsed.investigationId || prev.id,
                    status: 'failed' as const,
                  } : prev);
                  break;
                }

                default: {
                  // Fallback for events without an explicit event type
                  // (backward compatibility with the previous parsing logic)
                  if (parsed.investigationId && !currentEventType) {
                    setInvestigation(prev => prev ? { ...prev, id: parsed.investigationId } : prev);
                  }

                  if (parsed.text && !currentEventType) {
                    assistantContent += parsed.text;
                    setInvestigation(prev => {
                      if (!prev) return prev;
                      const messages = [...prev.messages];
                      const lastMsg = messages[messages.length - 1];

                      if (lastMsg?.role === 'assistant') {
                        messages[messages.length - 1] = { ...lastMsg, content: assistantContent };
                      } else {
                        messages.push({
                          role: 'assistant',
                          content: assistantContent,
                          timestamp: new Date(),
                        });
                      }

                      return { ...prev, messages };
                    });
                  }

                  if (parsed.rootCause && !currentEventType) {
                    setInvestigation(prev => prev ? {
                      ...prev,
                      rootCause: parsed.rootCause,
                      confidence: parsed.confidence,
                      status: 'completed' as const,
                    } : prev);
                  }
                  break;
                }
              }

              // Reset event type after processing the data line
              currentEventType = null;
            } catch {
              // Non-JSON line, skip
              currentEventType = null;
            }
          }
        }
      }

      setInvestigation(prev => prev ? { ...prev, status: 'completed' } : prev);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Investigation failed');
      setInvestigation(prev => prev ? { ...prev, status: 'failed' } : prev);
    } finally {
      setIsStreaming(false);
    }
  }, [projectId]);

  const stopInvestigation = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    investigation,
    isStreaming,
    error,
    startInvestigation,
    stopInvestigation,
  };
}
