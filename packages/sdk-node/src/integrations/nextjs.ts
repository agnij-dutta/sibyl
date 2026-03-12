import { Sibyl } from '../index.js';
import type { SibylConfig } from '../types.js';

export function withSibyl(config: SibylConfig) {
  Sibyl.init(config);

  return function wrapHandler<T extends (...args: any[]) => any>(handler: T): T {
    return (async (...args: any[]) => {
      try {
        return await handler(...args);
      } catch (error) {
        if (error instanceof Error) {
          Sibyl.captureException(error, { mechanism: 'nextjs' });
        }
        throw error;
      }
    }) as T;
  };
}
