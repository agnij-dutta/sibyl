'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSSEOptions {
  url: string;
  enabled?: boolean;
  onMessage?: (data: string) => void;
  onError?: (error: Event) => void;
}

export function useSSE({ url, enabled = true, onMessage, onError }: UseSSEOptions) {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<string[]>([]);
  const sourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    const source = new EventSource(url, { withCredentials: true });
    sourceRef.current = source;

    source.onopen = () => setConnected(true);

    source.onmessage = (event) => {
      setData(prev => [...prev, event.data]);
      onMessage?.(event.data);
    };

    source.onerror = (event) => {
      setConnected(false);
      onError?.(event);
    };

    return source;
  }, [url, onMessage, onError]);

  const disconnect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const source = connect();
    return () => source.close();
  }, [enabled, connect]);

  return { connected, data, disconnect, reconnect: connect };
}
