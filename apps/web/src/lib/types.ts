/* ─────────────────────────────────────────────────
   Shared frontend types for the Sibyl web app
   ───────────────────────────────────────────────── */

// ── Enums / Unions ──────────────────────────────

export type InvestigationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type IncidentLevel =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type IncidentStatus =
  | "open"
  | "acknowledged"
  | "investigating"
  | "resolved"
  | "closed";

// ── Core Interfaces ─────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  organizationId: string;
  role: "owner" | "admin" | "member" | "viewer";
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  apiKey?: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Investigation {
  id: string;
  projectId: string;
  incidentId?: string | null;
  title: string;
  query: string;
  status: InvestigationStatus;
  summary?: string | null;
  rootCause?: string | null;
  timeline?: InvestigationTimelineEntry[] | null;
  suggestions?: string[] | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface InvestigationTimelineEntry {
  timestamp: string;
  description: string;
  source: "log" | "trace" | "metric" | "alert" | "deploy";
  severity?: IncidentLevel;
  metadata?: Record<string, unknown>;
}

export interface Incident {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  level: IncidentLevel;
  status: IncidentStatus;
  source: string;
  fingerprint?: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string | null;
  assigneeId?: string | null;
  investigationId?: string | null;
  eventCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRule {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  condition: AlertCondition;
  channels: AlertChannel[];
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  type: "threshold" | "anomaly" | "pattern" | "absence";
  metric?: string;
  operator?: "gt" | "gte" | "lt" | "lte" | "eq";
  value?: number;
  window?: string;
  query?: string;
}

export interface AlertChannel {
  type: "email" | "slack" | "webhook" | "pagerduty";
  target: string;
  config?: Record<string, unknown>;
}

export interface Deploy {
  id: string;
  projectId: string;
  version: string;
  environment: "production" | "staging" | "development";
  status: "started" | "completed" | "failed" | "rolled_back";
  commitSha?: string | null;
  commitMessage?: string | null;
  author?: string | null;
  deployedAt: string;
  completedAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
