export interface SibylConfig {
  dsn: string;
  environment?: string;
  release?: string;
  debug?: boolean;
  sampleRate?: number;
  maxBatchSize?: number;
  flushInterval?: number;
  autoInstrument?: boolean;
}

export interface Breadcrumb {
  type: string;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface SibylEvent {
  event_id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  service?: string;
  environment?: string;
  fingerprint?: string;
  trace_id?: string;
  span_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
  sdk_name: string;
  sdk_version: string;
}

export interface SibylSpan {
  trace_id: string;
  span_id: string;
  parent_span_id: string;
  service: string;
  operation: string;
  kind: 'client' | 'server' | 'producer' | 'consumer' | 'internal';
  status: 'ok' | 'error' | 'unset';
  start_time: string;
  duration_us: number;
  attributes?: Record<string, unknown>;
  events?: Array<{ name: string; timestamp: string; attributes?: Record<string, unknown> }>;
}

export interface ParsedDSN {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
}
