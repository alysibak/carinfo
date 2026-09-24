/**
 * A small JSON client over fetch.
 *
 * It replaced axios, which put ~14 KB (gzip) on every page's critical path to
 * provide a base URL, a timeout and JSON bodies. Every endpoint answers
 * `{ success, data }`, so requests resolve to `data`; failures reject with an
 * HttpError carrying the status and the parsed body — everything callers
 * inspect ("was it a 404?", "what did the server say?").
 */

export class HttpError extends Error {
  override readonly name = 'HttpError';

  constructor(
    message: string,
    /** HTTP status; 0 when no response arrived (network failure or timeout). */
    readonly status: number,
    /** The parsed response body, when there was one. */
    readonly body: unknown = null,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export interface RequestOptions {
  /** Cancels the request. The promise then rejects with the signal's reason. */
  signal?: AbortSignal;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs: number;
  /** Headers resolved per request, e.g. a fresh auth token. */
  headers?: () => Promise<Record<string, string>>;
}

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // A proxy's HTML error page, say. Keep it for debugging.
    return text;
  }
}

function serverMessage(body: unknown): string | null {
  const error = (body as { error?: unknown } | null)?.error;
  return typeof error === 'string' && error.trim() ? error : null;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const base = config.baseUrl.replace(/\/+$/, '');

  async function request<T>(
    method: string,
    path: string,
    body: unknown,
    { signal }: RequestOptions = {},
  ): Promise<T> {
    // One controller aborts on either the caller's signal or the timeout.
    // (AbortSignal.any would do this, but only in browsers from 2024 on.)
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, config.timeoutMs);
    const forwardAbort = () => controller.abort(signal?.reason);
    if (signal?.aborted) forwardAbort();
    else signal?.addEventListener('abort', forwardAbort, { once: true });

    const fail = (error: unknown): never => {
      if (timedOut) {
        throw new HttpError(`Request timed out after ${config.timeoutMs} ms`, 0, null, {
          cause: error,
        });
      }
      if (signal?.aborted) throw signal.reason ?? error;
      if (error instanceof HttpError) throw error;
      throw new HttpError('Network request failed', 0, null, { cause: error });
    };

    try {
      if (signal?.aborted) throw signal.reason;
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(await config.headers?.()),
      };
      let payload: string | undefined;
      if (body !== undefined) {
        // Only requests with a body declare one: a JSON Content-Type on a GET
        // would force a CORS preflight whenever the API is on another origin.
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }

      const res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: payload,
        signal: controller.signal,
      });
      const data = await readBody(res);
      if (!res.ok) {
        throw new HttpError(
          serverMessage(data) ?? `Request failed with status ${res.status}`,
          res.status,
          data,
        );
      }
      return (data as { data: T } | null)?.data as T;
    } catch (error) {
      return fail(error);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }

  return {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
    put: (path, body, options) => request('PUT', path, body, options),
    delete: (path, options) => request('DELETE', path, undefined, options),
  };
}

/** The API origin: same-origin `/api` unless the build points elsewhere. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 60_000;
