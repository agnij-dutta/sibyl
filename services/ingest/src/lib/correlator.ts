// ---------------------------------------------------------------------------
// Cross-Signal Correlation Engine
// ---------------------------------------------------------------------------
// Detects relationships between deployments, error spikes, service cascades,
// and trace anomalies. Each correlator returns a typed CorrelationResult with
// a confidence score (0-1), a human-readable description, and raw evidence.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CorrelationType =
  | 'deploy_correlation'
  | 'service_cascade'
  | 'error_spike'
  | 'trace_pattern';

export interface CorrelationResult {
  type: CorrelationType;
  /** Confidence score between 0 and 1. */
  confidence: number;
  /** Human-readable summary of the correlation. */
  description: string;
  /** Raw evidence objects that support the finding. */
  evidence: unknown[];
}

// ---------------------------------------------------------------------------
// Deploy <-> Error correlation
// ---------------------------------------------------------------------------

interface DeployRecord {
  version: string;
  deployedAt: Date;
}

interface ErrorTimelinePoint {
  timestamp: Date;
  count: number;
}

/**
 * Detect whether a deployment was followed by an error spike within a
 * configurable time window (default: 30 minutes).
 *
 * Confidence scales with the total number of errors observed, capped at 0.9.
 */
export function correlateDeployAndErrors(
  deploys: DeployRecord[],
  errorTimeline: ErrorTimelinePoint[],
  windowMs: number = 30 * 60 * 1000,
): CorrelationResult | null {
  for (const deploy of deploys) {
    const deployTime = deploy.deployedAt.getTime();

    const nearbyErrors = errorTimeline.filter((e) => {
      const diff = e.timestamp.getTime() - deployTime;
      return diff > 0 && diff < windowMs && e.count > 0;
    });

    if (nearbyErrors.length > 0) {
      const totalErrors = nearbyErrors.reduce((sum, e) => sum + e.count, 0);
      return {
        type: 'deploy_correlation',
        confidence: Math.min(0.9, totalErrors / 100),
        description:
          `Error spike detected ${nearbyErrors.length} time(s) within ` +
          `${windowMs / 60_000} minutes of deploy ${deploy.version}`,
        evidence: [{ deploy, errors: nearbyErrors }],
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Service cascade detection
// ---------------------------------------------------------------------------

interface SpanRecord {
  service: string;
  status: string;
  start_time: Date;
  duration_us: number;
}

/**
 * Detect errors spanning multiple services, which may indicate a cascading
 * failure. Requires at least 2 distinct services with errors.
 *
 * Confidence scales with the number of affected services, capped at 0.85.
 */
export function detectServiceCascade(
  spans: SpanRecord[],
): CorrelationResult | null {
  const errorsByService = new Map<string, number>();

  for (const span of spans) {
    if (span.status === 'error') {
      errorsByService.set(
        span.service,
        (errorsByService.get(span.service) || 0) + 1,
      );
    }
  }

  if (errorsByService.size >= 2) {
    const services = [...errorsByService.keys()];
    return {
      type: 'service_cascade',
      confidence: Math.min(0.85, errorsByService.size * 0.2),
      description:
        `Errors detected across ${errorsByService.size} services: ` +
        services.join(', '),
      evidence: [...errorsByService.entries()].map(([service, count]) => ({
        service,
        errorCount: count,
      })),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Error spike detection (simple z-score)
// ---------------------------------------------------------------------------

/**
 * Detect whether the most recent error counts are anomalously high compared
 * to the baseline. Uses a simple z-score calculation.
 *
 * @param timeline - Chronologically ordered error counts.
 * @param zThreshold - z-score threshold to flag a spike (default 2.0).
 */
export function detectErrorSpike(
  timeline: ErrorTimelinePoint[],
  zThreshold = 2.0,
): CorrelationResult | null {
  if (timeline.length < 5) return null;

  const counts = timeline.map((t) => t.count);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance =
    counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return null;

  // Check the last data point
  const latest = counts[counts.length - 1]!;
  const zScore = (latest - mean) / stddev;

  if (zScore >= zThreshold) {
    return {
      type: 'error_spike',
      confidence: Math.min(0.95, 0.5 + zScore * 0.1),
      description:
        `Error spike detected: ${latest} errors (z-score ${zScore.toFixed(2)}, ` +
        `baseline mean ${mean.toFixed(1)})`,
      evidence: [{ latest, mean, stddev, zScore, timeline: timeline.slice(-10) }],
    };
  }

  return null;
}
