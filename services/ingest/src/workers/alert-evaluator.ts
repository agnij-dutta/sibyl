// ---------------------------------------------------------------------------
// Alert Evaluator Worker
// ---------------------------------------------------------------------------
// Background worker that periodically evaluates all enabled alert rules
// against live telemetry in ClickHouse. When a threshold is breached the
// worker fires notifications to configured channels (webhook / Slack).
// Runs on a 2-minute interval.
// ---------------------------------------------------------------------------

import { getDb } from '@sibyl/db';
import { alertRules } from '@sibyl/db';
import { eq } from 'drizzle-orm';
import { queryClickHouse } from '../lib/clickhouse.js';
import { config } from '../config.js';

const INTERVAL_MS = 120_000; // 2 minutes

interface AlertCondition {
  metric: string; // 'error_count' | 'error_rate' | 'latency_p99'
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  window_minutes: number;
  service?: string;
}

interface AlertChannel {
  type: 'webhook' | 'slack';
  url: string;
}

/**
 * Evaluate all enabled alert rules against current telemetry data and fire
 * notifications for any breached thresholds.
 *
 * @returns The number of alerts that were triggered.
 */
export async function evaluateAlerts(): Promise<number> {
  const db = getDb(config.database.url);

  // Get all enabled alert rules
  const rules = await db
    .select()
    .from(alertRules)
    .where(eq(alertRules.enabled, true));

  if (rules.length === 0) return 0;

  let triggered = 0;

  for (const rule of rules) {
    try {
      const condition = rule.condition as unknown as AlertCondition;
      if (!condition?.metric || !condition?.threshold) continue;

      const windowMinutes = condition.window_minutes || 15;

      let value: number | null = null;

      // Query the appropriate metric from ClickHouse
      if (condition.metric === 'error_count') {
        const serviceFilter = condition.service ? `AND service = '${condition.service}'` : '';
        const result = await queryClickHouse(`
          SELECT count() as val
          FROM events
          WHERE project_id = '${rule.projectId}'
            AND level = 'error'
            AND timestamp > now() - INTERVAL ${windowMinutes} MINUTE
            ${serviceFilter}
        `);
        value = result?.[0]?.val ? Number(result[0].val) : 0;
      } else if (condition.metric === 'error_rate') {
        const serviceFilter = condition.service ? `AND service = '${condition.service}'` : '';
        const result = await queryClickHouse(`
          SELECT
            countIf(status = 'error') / greatest(count(), 1) * 100 as val
          FROM spans
          WHERE project_id = '${rule.projectId}'
            AND start_time > now() - INTERVAL ${windowMinutes} MINUTE
            ${serviceFilter}
        `);
        value = result?.[0]?.val ? Number(result[0].val) : 0;
      } else if (condition.metric === 'latency_p99') {
        const serviceFilter = condition.service ? `AND service = '${condition.service}'` : '';
        const result = await queryClickHouse(`
          SELECT quantile(0.99)(duration_us) / 1000 as val
          FROM spans
          WHERE project_id = '${rule.projectId}'
            AND start_time > now() - INTERVAL ${windowMinutes} MINUTE
            ${serviceFilter}
        `);
        value = result?.[0]?.val ? Number(result[0].val) : 0;
      }

      if (value === null) continue;

      // Check if threshold is breached
      const breached = checkThreshold(value, condition.operator, condition.threshold);

      if (breached) {
        triggered++;
        console.log(`[alert-evaluator] Alert "${rule.name}" triggered: ${condition.metric}=${value} ${condition.operator} ${condition.threshold}`);

        // Send notifications
        const channels = (rule.channels || []) as unknown as AlertChannel[];
        for (const channel of channels) {
          await sendNotification(channel, {
            alertName: rule.name,
            metric: condition.metric,
            value,
            threshold: condition.threshold,
            projectId: rule.projectId,
          });
        }
      }
    } catch (err) {
      console.error(`[alert-evaluator] Failed for rule ${rule.id}:`, err);
    }
  }

  return triggered;
}

/**
 * Compare a numeric value against a threshold using the given operator.
 */
function checkThreshold(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'eq': return value === threshold;
    default: return false;
  }
}

/**
 * Fire an HTTP POST to the configured alert channel with the alert payload.
 */
async function sendNotification(channel: AlertChannel, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(channel.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[Sibyl Alert] ${payload.alertName}: ${payload.metric} = ${payload.value} (threshold: ${payload.threshold})`,
        ...payload,
      }),
    });
  } catch (err) {
    console.error(`[alert-evaluator] Failed to send to ${channel.type}:`, err);
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the alert evaluator on a recurring 2-minute interval.
 */
export function startAlertEvaluator(): void {
  console.log('[alert-evaluator] Starting (interval: 120s)');

  timer = setInterval(async () => {
    try {
      await evaluateAlerts();
    } catch (err) {
      console.error('[alert-evaluator] Tick error:', err);
    }
  }, INTERVAL_MS);

  if (timer && 'unref' in timer) timer.unref();
}

/**
 * Stop the alert evaluator and clear its interval timer.
 */
export function stopAlertEvaluator(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
