import { withoutQueries } from '../shared/without-queries.js';

/**
 * A crash report from the browser (client/src/utils/errorReporting.ts),
 * checked and trimmed before it is logged. It carries no account details and
 * the log line no IP address: the privacy policy says so.
 */
export interface ClientErrorLog {
  source: 'window' | 'promise' | 'boundary';
  message: string;
  path: string;
  stack?: string;
  componentStack?: string;
  userAgent?: string;
}

const SOURCES = new Set(['window', 'promise', 'boundary']);

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = withoutQueries(value.trim()).slice(0, max);
  return trimmed || undefined;
}

/** The report as logged, or null when it is not one. */
export function parseClientError(body: unknown, userAgent?: string): ClientErrorLog | null {
  let raw = body;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') return null;
  const report = raw as Record<string, unknown>;
  const source =
    typeof report.source === 'string' && SOURCES.has(report.source) ? report.source : null;
  const message = text(report.message, 500);
  const path = text(report.path, 300);
  if (!source || !message || !path?.startsWith('/')) return null;
  const stack = text(report.stack, 4000);
  const componentStack = text(report.componentStack, 2000);
  const agent = text(userAgent, 300);
  return {
    source: source as ClientErrorLog['source'],
    message,
    path,
    ...(stack ? { stack } : {}),
    ...(componentStack ? { componentStack } : {}),
    ...(agent ? { userAgent: agent } : {}),
  };
}
