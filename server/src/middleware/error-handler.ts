import type { NextFunction, Request, Response } from 'express';

/**
 * An error with an intended HTTP status. Throw this from a controller instead
 * of hand-writing `res.status(...).json(...)` in every branch.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export const badRequest = (message: string, code?: string) => new HttpError(400, message, { code });
export const notFound = (message = 'Not found') => new HttpError(404, message);
export const serviceUnavailable = (message: string, code?: string) =>
  new HttpError(503, message, { code });

/** JSON 404 for unmatched /api routes, so the SPA fallback never swallows them. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `No API route matches ${req.method} ${req.path}`,
    requestId: req.requestId,
  });
}

function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    typeof (err as { type: unknown }).type === 'string' &&
    (err as { type: string }).type.startsWith('entity.')
  );
}

/**
 * Terminal error handler.
 *
 * Client errors (4xx) return their message, because the caller can act on it.
 * Server errors return a fixed string and log the detail — an internal message
 * can name a table, a file path or a library version, and none of that belongs
 * in a public response. The request ID bridges the two.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details !== undefined ? { details: err.details } : {}),
      requestId: req.requestId,
    });
    return;
  }

  // express.json() rejecting an oversized or malformed body.
  if (isBodyParserError(err)) {
    const status = typeof err.status === 'number' ? err.status : 400;
    res.status(status).json({
      success: false,
      error:
        err.type === 'entity.too.large'
          ? 'Request body is too large.'
          : 'Request body could not be parsed as JSON.',
      requestId: req.requestId,
    });
    return;
  }

  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'unhandled error',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );

  res.status(500).json({
    success: false,
    error: 'Something went wrong on our end.',
    requestId: req.requestId,
  });
}
