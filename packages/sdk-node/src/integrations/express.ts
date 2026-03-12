import { Sibyl } from '../index.js';

// Use generic types to avoid requiring @types/express as a dependency
type Req = { url: string; method: string; headers: Record<string, unknown>; query: Record<string, unknown> };
type Res = { statusCode: number; on(event: string, cb: () => void): void };
type Next = (err?: unknown) => void;

export function sibylExpressErrorHandler() {
  return (err: Error, req: Req, _res: Res, next: Next) => {
    Sibyl.captureException(err, {
      mechanism: 'express',
      url: req.url,
      method: req.method,
      headers: req.headers,
      query: req.query,
    });
    next(err);
  };
}

export function sibylExpressMiddleware() {
  return (req: Req, _res: Res, next: Next) => {
    const start = Date.now();

    _res.on('finish', () => {
      const duration = Date.now() - start;
      if (_res.statusCode >= 500) {
        Sibyl.captureMessage(
          `${req.method} ${req.url} responded with ${_res.statusCode}`,
          'error',
          {
            mechanism: 'express',
            url: req.url,
            method: req.method,
            statusCode: _res.statusCode,
            durationMs: duration,
          }
        );
      }
    });

    next();
  };
}
