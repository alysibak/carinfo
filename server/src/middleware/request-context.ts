import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Correlates every log line and error response for one request. */
      requestId?: string;
      /** High-resolution start time, used to log duration on finish. */
      startedAt?: bigint;
    }
  }
}

const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS) || 1000;

/**
 * Assigns a request ID and logs one structured line per request.
 *
 * Serverless logs are a flat stream from many concurrent invocations, so
 * without an ID there is no way to tell which lines belong together. The ID is
 * echoed in the response header and in error bodies, which means a user can
 * paste it into a bug report and it leads straight to the log line.
 *
 * Only slow requests and errors log by default — a line per 200 on a cached
 * read endpoint is noise that costs money to store.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  const requestId = typeof inbound === 'string' && inbound.length <= 128 ? inbound : randomUUID();

  req.requestId = requestId;
  req.startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - (req.startedAt ?? 0n)) / 1e6;
    const slow = durationMs >= SLOW_REQUEST_MS;
    const failed = res.statusCode >= 500;

    if (!slow && !failed) return;

    console.log(
      JSON.stringify({
        level: failed ? 'error' : 'warn',
        msg: failed ? 'request failed' : 'slow request',
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
      }),
    );
  });

  next();
}
