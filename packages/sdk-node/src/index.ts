import { SibylClient } from './client.js';
import type { SibylConfig, SibylEvent } from './types.js';
import { enableHttpInstrumentation, disableHttpInstrumentation } from './integrations/http.js';

let globalClient: SibylClient | null = null;

export const Sibyl = {
  init(config: SibylConfig): SibylClient {
    globalClient = new SibylClient(config);

    // Auto-capture unhandled exceptions
    process.on('uncaughtException', (error) => {
      globalClient?.captureException(error, { mechanism: 'uncaughtException' });
      globalClient?.flush().finally(() => {
        process.exit(1);
      });
    });

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      globalClient?.captureException(error, { mechanism: 'unhandledRejection' });
    });

    // Enable automatic HTTP instrumentation when requested
    if (config.autoInstrument) {
      enableHttpInstrumentation();
    }

    return globalClient;
  },

  captureException(error: Error, context?: Record<string, unknown>): string {
    if (!globalClient) throw new Error('Sibyl.init() must be called first');
    return globalClient.captureException(error, context);
  },

  captureMessage(message: string, level?: SibylEvent['level'], context?: Record<string, unknown>): string {
    if (!globalClient) throw new Error('Sibyl.init() must be called first');
    return globalClient.captureMessage(message, level, context);
  },

  async flush(): Promise<void> {
    if (!globalClient) return;
    return globalClient.flush();
  },

  async close(): Promise<void> {
    if (!globalClient) return;
    disableHttpInstrumentation();
    await globalClient.close();
    globalClient = null;
  },

  getClient(): SibylClient | null {
    return globalClient;
  },
};

export { SibylClient } from './client.js';
export type { SibylConfig, SibylEvent, SibylSpan, Breadcrumb } from './types.js';
export { enableHttpInstrumentation, disableHttpInstrumentation } from './integrations/http.js';
export { SibylSpanExporter } from './integrations/opentelemetry.js';
export type { OTelSpan, OTelAttribute, OTelAttributeValue, OTelSpanEvent, OTelSpanStatus } from './integrations/opentelemetry.js';
