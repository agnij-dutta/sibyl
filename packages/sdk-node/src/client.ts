import { randomUUID } from 'crypto';
import type { SibylConfig, SibylEvent, SibylSpan, ParsedDSN, Breadcrumb } from './types.js';

const SDK_NAME = '@sibyl/node';
const SDK_VERSION = '0.1.0';
const MAX_BREADCRUMBS = 100;

export class SibylClient {
  private config: SibylConfig;
  private dsn: ParsedDSN;
  private eventBuffer: SibylEvent[] = [];
  private spanBuffer: SibylSpan[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: SibylConfig) {
    this.config = {
      maxBatchSize: 50,
      flushInterval: 5000,
      sampleRate: 1.0,
      ...config,
    };
    this.dsn = this.parseDSN(config.dsn);
    this.startFlushTimer();
  }

  private parseDSN(dsn: string): ParsedDSN {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.slice(1);
    return {
      protocol: url.protocol,
      publicKey,
      host: url.host,
      projectId,
    };
  }

  private getIngestUrl(): string {
    return `${this.dsn.protocol}//${this.dsn.host}/v1/ingest`;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        if (this.config.debug) {
          console.error('[Sibyl] Flush error:', err);
        }
      });
    }, this.config.flushInterval);

    // Unref so it doesn't prevent process exit
    if (this.flushTimer && typeof this.flushTimer === 'object' && 'unref' in this.flushTimer) {
      this.flushTimer.unref();
    }
  }

  captureException(error: Error, context?: Record<string, unknown>): string {
    const eventId = randomUUID().replace(/-/g, '');

    const event: SibylEvent = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      service: context?.service as string || undefined,
      environment: this.config.environment,
      user_id: context?.userId as string || undefined,
      metadata: {
        ...context,
        stack: error.stack,
        name: error.name,
        breadcrumbs: this.breadcrumbs.slice(),
      },
      sdk_name: SDK_NAME,
      sdk_version: SDK_VERSION,
    };

    this.addEvent(event);
    return eventId;
  }

  captureMessage(message: string, level: SibylEvent['level'] = 'info', context?: Record<string, unknown>): string {
    const eventId = randomUUID().replace(/-/g, '');

    const event: SibylEvent = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      level,
      message,
      service: context?.service as string || undefined,
      environment: this.config.environment,
      user_id: context?.userId as string || undefined,
      metadata: {
        ...context,
        breadcrumbs: this.breadcrumbs.slice(),
      },
      sdk_name: SDK_NAME,
      sdk_version: SDK_VERSION,
    };

    this.addEvent(event);
    return eventId;
  }

  addSpan(span: Omit<SibylSpan, 'service'> & { service?: string }): void {
    this.spanBuffer.push({
      ...span,
      service: span.service || 'unknown',
    });

    if (this.spanBuffer.length >= (this.config.maxBatchSize || 50)) {
      this.flush().catch(() => {});
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb);
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs.shift();
    }
  }

  getBreadcrumbs(): ReadonlyArray<Breadcrumb> {
    return this.breadcrumbs;
  }

  getIngestEndpoint(): string {
    return this.getIngestUrl();
  }

  getDSN(): ParsedDSN {
    return this.dsn;
  }

  getConfig(): SibylConfig {
    return this.config;
  }

  private addEvent(event: SibylEvent): void {
    // Sample rate check
    if (Math.random() > (this.config.sampleRate || 1)) return;

    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= (this.config.maxBatchSize || 50)) {
      this.flush().catch(() => {});
    }
  }

  async flush(): Promise<void> {
    const events = this.eventBuffer.splice(0);
    const spans = this.spanBuffer.splice(0);

    if (events.length === 0 && spans.length === 0) return;

    try {
      const response = await fetch(this.getIngestUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.dsn.publicKey}`,
          'X-Sibyl-Project': this.dsn.projectId,
        },
        body: JSON.stringify({ events, spans }),
      });

      if (!response.ok && this.config.debug) {
        console.error(`[Sibyl] Ingest failed: ${response.status}`);
      }
    } catch (err) {
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...events);
      this.spanBuffer.unshift(...spans);

      if (this.config.debug) {
        console.error('[Sibyl] Send error:', err);
      }
    }
  }

  close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    return this.flush();
  }
}
