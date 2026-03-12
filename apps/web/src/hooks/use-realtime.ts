'use client';

import { useState, useEffect, useCallback } from 'react';

interface RealtimeEvent {
  type: string;
  data: unknown;
  timestamp: string;
}

export function useRealtime(channel: string) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // SSE connection for real-time updates
    // Will connect to ingest service's SSE endpoint in Phase 6
    const url = `${process.env.NEXT_PUBLIC_INGEST_URL || 'http://localhost:3001'}/v1/stream?channel=${channel}`;

    let source: EventSource;
    try {
      source = new EventSource(url);

      source.onopen = () => setConnected(true);

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents(prev => [...prev.slice(-99), {
            type: data.type,
            data: data.payload,
            timestamp: data.timestamp || new Date().toISOString(),
          }]);
        } catch {
          // Skip malformed events
        }
      };

      source.onerror = () => {
        setConnected(false);
      };
    } catch {
      // SSE not available
    }

    return () => {
      source?.close();
    };
  }, [channel]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents };
}
