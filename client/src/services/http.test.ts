import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient, HttpError, isHttpError } from './http';

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** A fetch that never answers on its own, but rejects when its signal aborts (as fetch does). */
function hangingFetch(): typeof fetch {
  return (_input, init) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal;
      const abort = () => reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort);
    });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the request to reject');
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const client = (extra: Partial<Parameters<typeof createApiClient>[0]> = {}) =>
  createApiClient({ baseUrl: '/api/', timeoutMs: 5_000, ...extra });

describe('createApiClient', () => {
  it('resolves to the data inside the API envelope', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true, data: ['Honda', 'Toyota'] }));
    await expect(client().get('/cars/makes')).resolves.toEqual(['Honda', 'Toyota']);
    // The trailing slash on the base does not double up.
    expect(fetchMock.mock.calls[0][0]).toBe('/api/cars/makes');
  });

  it('sends JSON bodies, and declares a Content-Type only when there is one', async () => {
    fetchMock.mockImplementation(async () => json({ success: true, data: null }));
    await client().post('/cars/compare', { ids: ['a', 'b'] });
    await client().get('/cars/makes');

    const [, post] = fetchMock.mock.calls[0];
    expect(post?.method).toBe('POST');
    expect(post?.body).toBe('{"ids":["a","b"]}');
    expect(post?.headers).toMatchObject({ 'Content-Type': 'application/json' });

    // A JSON Content-Type on a GET would force a CORS preflight cross-origin.
    const [, get] = fetchMock.mock.calls[1];
    expect(get?.body).toBeUndefined();
    expect(get?.headers).not.toHaveProperty('Content-Type');
  });

  it('rejects an error status with the server’s message, status and body', async () => {
    const body = { success: false, error: 'That doesn’t look like a valid VIN.' };
    fetchMock.mockResolvedValueOnce(json(body, 400));

    const error = await rejection(client().get('/vin/nope'));
    expect(isHttpError(error)).toBe(true);
    expect(error).toMatchObject({ status: 400, body, message: body.error });
  });

  it('keeps a non-JSON error body instead of failing to parse it', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
    const error = await rejection(client().get('/cars/makes'));
    expect(error).toMatchObject({
      status: 502,
      body: '<html>Bad gateway</html>',
      message: 'Request failed with status 502',
    });
  });

  it('reports a network failure as status 0, keeping the cause', async () => {
    const cause = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValueOnce(cause);
    const error = await rejection(client().get('/cars/makes'));
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 0, message: 'Network request failed', cause });
  });

  it('times out a request that never answers', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(hangingFetch());
    const pending = rejection(client({ timeoutMs: 1_000 }).get('/cars/makes'));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await pending).toMatchObject({
      status: 0,
      message: 'Request timed out after 1000 ms',
    });
  });

  it('cancels on the caller’s signal, rejecting with its reason rather than an HttpError', async () => {
    fetchMock.mockImplementationOnce(hangingFetch());
    const controller = new AbortController();
    const pending = rejection(client().get('/cars/search', { signal: controller.signal }));
    const reason = new DOMException('superseded', 'AbortError');
    controller.abort(reason);
    expect(await pending).toBe(reason);
  });

  it('never sends a request whose signal has already aborted', async () => {
    const headers = vi.fn(async () => ({}));
    const error = await rejection(client({ headers }).get('/x', { signal: AbortSignal.abort() }));
    expect(isHttpError(error)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    // Nor asks for an auth token it will not use.
    expect(headers).not.toHaveBeenCalled();
  });

  it('resolves per-request headers on every call', async () => {
    let token = 'first';
    const api = client({ headers: async () => ({ Authorization: `Bearer ${token}` }) });
    fetchMock.mockImplementation(async () => json({ success: true, data: {} }));

    await api.get('/me');
    token = 'second';
    await api.delete('/me/garage/items/a');

    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer first' });
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer second' });
    expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
  });
});
