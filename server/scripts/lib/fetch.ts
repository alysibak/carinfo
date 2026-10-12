/**
 * fetch helpers for the offline data scripts. Node 20+ ships fetch, so the
 * pipeline needs no HTTP library; these add the two things fetch leaves out:
 * a timeout, and treating an error status as a failure.
 */

/** Who is asking, so the hosts these scripts read can tell. */
const HEADERS = {
  'User-Agent': 'CarInfo data refresh (+https://github.com/alysibak/carinfo)',
  Accept: 'application/json, text/csv, */*',
};

/** An answer with an error status, which callers may treat by status. */
export class HttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`GET ${url} answered ${status}`);
  }
}

async function fetchOk(url: string, timeoutMs: number): Promise<Response> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new HttpError(url, res.status);
  return res;
}

export async function fetchJson<T>(url: string, timeoutMs = 60_000): Promise<T> {
  return (await (await fetchOk(url, timeoutMs)).json()) as T;
}

export async function fetchText(url: string, timeoutMs = 60_000): Promise<string> {
  return (await fetchOk(url, timeoutMs)).text();
}

export async function fetchBuffer(url: string, timeoutMs = 60_000): Promise<Buffer> {
  return Buffer.from(await (await fetchOk(url, timeoutMs)).arrayBuffer());
}
