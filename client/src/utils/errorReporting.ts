import { withoutQueries } from '@carinfo/shared/without-queries';
import { API_BASE_URL } from '../services/http';

/**
 * Crashes, reported to the site's own server (POST /api/client-errors), which
 * logs them. No third party and no account details: the error, the path
 * without its query (reset and unsubscribe links carry tokens there) and the
 * stack, whose script URLs name the build.
 */

export type ErrorSource = 'window' | 'promise' | 'boundary';

export interface ClientErrorReport {
  source: ErrorSource;
  message: string;
  path: string;
  stack?: string;
  componentStack?: string;
}

/** Noise no fix on this site can remove, or failures handled elsewhere. */
const IGNORED =
  /^Script error\.?$|ResizeObserver loop|dynamically imported module|Importing a module script failed|^Failed to fetch$|^Load failed$|^NetworkError when attempting to fetch resource\.?$/i;
const EXTENSION = /(?:chrome|moz|safari(?:-web)?)-extension:\/\//;
const MAX_REPORTS = 5;

export function buildReport(
  error: unknown,
  source: ErrorSource,
  extra: { componentStack?: string | null; path?: string } = {},
): ClientErrorReport | null {
  // A DOMException is not always an Error, but has a name all the same.
  if ((error as { name?: unknown } | null)?.name === 'AbortError') return null;
  const err = error instanceof Error ? error : null;
  const message = (err?.message || (typeof error === 'string' ? error : String(error))).trim();
  if (!message || IGNORED.test(message)) return null;
  const stack = err?.stack ? withoutQueries(err.stack).slice(0, 4000) : undefined;
  if (stack && EXTENSION.test(stack)) return null;
  const componentStack = extra.componentStack?.trim().slice(0, 2000);
  return {
    source,
    message: withoutQueries(message).slice(0, 500),
    path: (extra.path ?? window.location.pathname).slice(0, 300),
    ...(stack ? { stack } : {}),
    ...(componentStack ? { componentStack } : {}),
  };
}

let enabled = false;
const sent = new Set<string>();

function send(report: ClientErrorReport) {
  const body = JSON.stringify(report);
  const url = `${API_BASE_URL}/client-errors`;
  // text/plain needs no preflight, and sendBeacon survives the page closing.
  const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
  if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url, blob)) return;
  void fetch(url, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    keepalive: true,
  }).catch(() => {});
}

/** Reports one crash, once, and at most five a page load. */
export function reportError(
  error: unknown,
  source: ErrorSource,
  extra?: { componentStack?: string | null },
): void {
  if (!enabled || sent.size >= MAX_REPORTS) return;
  try {
    const report = buildReport(error, source, extra);
    if (!report) return;
    const key = `${report.source}|${report.message}|${report.stack?.split('\n')[1] ?? ''}`;
    if (sent.has(key)) return;
    sent.add(key);
    send(report);
  } catch {
    // Reporting must never be the second failure.
  }
}

/** Listens for what nothing else caught. Production builds only, unless a test asks. */
export function installErrorReporting(
  host: Pick<Window, 'addEventListener'> = window,
  on: boolean = import.meta.env.PROD,
): void {
  if (!on) return;
  enabled = true;
  host.addEventListener('error', (event) => {
    const e = event as ErrorEvent;
    if (e.error || e.message) reportError(e.error ?? e.message, 'window');
  });
  host.addEventListener('unhandledrejection', (event) => {
    reportError((event as PromiseRejectionEvent).reason, 'promise');
  });
}

export function __resetErrorReportingForTests(): void {
  enabled = false;
  sent.clear();
}
