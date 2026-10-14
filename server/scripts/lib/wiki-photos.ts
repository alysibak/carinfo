import type { PhotoGeneration, PhotoImage } from '../../src/utils/car-photos.js';
import { fetchJson, HttpError } from './fetch.js';

/**
 * Wikipedia's API, for build-car-photos.ts: resolving titles, reading
 * articles' wikitext, searching, and asking Commons whose a photo is. And the
 * parsing of {{Infobox automobile}}, which gives a car article's photo and
 * the years the article covers.
 */

const API = 'https://en.wikipedia.org/w/api.php';
const TIMEOUT_MS = 60_000;
/** Wikipedia asks API clients to go one request at a time; a short pause is courteous. */
const PAUSE_MS = 150;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ApiGet = (params: Record<string, string>) => Promise<WikiResponse>;

export interface WikiResponse {
  error?: { code?: string; info?: string };
  continue?: Record<string, string>;
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string; tofragment?: string }[];
    pages?: WikiPage[];
    search?: { title: string }[];
    allpages?: { title: string }[];
  };
}

export interface WikiPage {
  title: string;
  missing?: boolean;
  invalid?: boolean;
  imagerepository?: string;
  revisions?: { slots?: { main?: { content?: string } } }[];
  imageinfo?: {
    url?: string;
    thumburl?: string;
    descriptionurl?: string;
    mime?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

/** One request at a time, paused between, retried when Wikipedia is busy. */
export function wikiClient(pauseMs = PAUSE_MS, retryMs = [5_000, 30_000, 60_000]): ApiGet {
  let last = 0;
  return async (params) => {
    const query = new URLSearchParams({
      format: 'json',
      formatversion: '2',
      maxlag: '5',
      ...params,
    });
    for (let attempt = 0; ; attempt++) {
      const gap = last + pauseMs - Date.now();
      if (gap > 0) await wait(gap);
      last = Date.now();
      try {
        const body = await fetchJson<WikiResponse>(`${API}?${query}`, TIMEOUT_MS);
        if (body.error?.code !== 'maxlag') return body;
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 0;
        if (attempt >= retryMs.length || (status && status < 429 && status !== 408)) throw error;
      }
      if (attempt >= retryMs.length) throw new Error('Wikipedia stayed busy (maxlag)');
      await wait(retryMs[attempt]);
    }
  };
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface Resolved {
  title: string;
  /** Reached through a redirect, which editors made: it needs no further check of the make. */
  redirected: boolean;
}

/**
 * Each title to the page it lands on after normalising and redirects, or
 * null if none. A redirect to a section of another article ("Subaru
 * Impreza Outback Sport" to a part of "Subaru Outback") is no match: the
 * article is about something else.
 */
export async function resolveTitles(
  get: ApiGet,
  titles: string[],
): Promise<Map<string, Resolved | null>> {
  const out = new Map<string, Resolved | null>();
  for (const batch of chunks([...new Set(titles)], 50)) {
    const { query } = await get({ action: 'query', titles: batch.join('|'), redirects: '1' });
    const step = new Map<string, { to: string; redirect: boolean; fragment: boolean }>();
    for (const { from, to } of query?.normalized ?? []) {
      step.set(from, { to, redirect: false, fragment: false });
    }
    for (const { from, to, tofragment } of query?.redirects ?? []) {
      step.set(from, { to, redirect: true, fragment: Boolean(tofragment) });
    }
    const existing = new Set(
      (query?.pages ?? []).filter((p) => !p.missing && !p.invalid).map((p) => p.title),
    );
    for (const title of batch) {
      let at = title;
      let redirected = false;
      let fragment = false;
      for (let hops = 0; hops < 5 && step.has(at); hops++) {
        const next = step.get(at)!;
        redirected ||= next.redirect;
        fragment ||= next.fragment;
        at = next.to;
      }
      out.set(title, existing.has(at) && !fragment ? { title: at, redirected } : null);
    }
  }
  return out;
}

/** Articles whose titles begin with the prefix: "Porsche 911 (" lists its generations. */
export async function prefixTitles(get: ApiGet, prefix: string): Promise<string[]> {
  const { query } = await get({
    action: 'query',
    list: 'allpages',
    apprefix: prefix,
    apfilterredir: 'nonredirects',
    aplimit: '50',
  });
  return (query?.allpages ?? []).map((p) => p.title);
}

/** Each existing article's wikitext, by its title (after redirects). */
export async function fetchWikitext(
  get: ApiGet,
  titles: string[],
  batchSize = 8,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const batch of chunks([...new Set(titles)], batchSize)) {
    let cont: Record<string, string> = {};
    for (let round = 0; round < 20; round++) {
      const body = await get({
        action: 'query',
        titles: batch.join('|'),
        redirects: '1',
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        ...cont,
      });
      for (const page of body.query?.pages ?? []) {
        const text = page.revisions?.[0]?.slots?.main?.content;
        if (text) out.set(page.title, text);
      }
      if (!body.continue) break;
      cont = body.continue;
    }
  }
  return out;
}

export async function searchTitles(get: ApiGet, query: string): Promise<string[]> {
  const { query: q } = await get({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '5',
    srnamespace: '0',
  });
  return (q?.search ?? []).map((r) => r.title);
}

/** Plain text from a bit of HTML (Commons' Artist field). */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Where each file is and whose it is: only files on Commons, which are free
 * to use with credit. A file Wikipedia holds itself is non-free, shown under
 * fair use, and left out.
 */
export async function fetchImages(get: ApiGet, files: string[]): Promise<Map<string, PhotoImage>> {
  const out = new Map<string, PhotoImage>();
  for (const batch of chunks([...new Set(files)], 50)) {
    const { query } = await get({
      action: 'query',
      titles: batch.map((f) => `File:${f}`).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|mime|extmetadata',
      iiurlwidth: '500',
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
    });
    const renamed = new Map((query?.normalized ?? []).map(({ from, to }) => [to, from]));
    for (const page of query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (page.imagerepository !== 'shared' || !info?.url || !info.descriptionurl) continue;
      if (!/^image\/(?:jpeg|png|webp)$/.test(info.mime ?? '')) continue;
      // Without the tracking query Wikimedia appends ("?utm_source=...").
      const src = (info.thumburl ?? info.url).replace(/\?.*$/, '');
      const meta = info.extmetadata ?? {};
      const license = plainText(meta.LicenseShortName?.value ?? '');
      if (!license) continue;
      const name = (renamed.get(page.title) ?? page.title).replace(/^File:/, '');
      out.set(name, {
        src,
        page: info.descriptionurl,
        artist: plainText(meta.Artist?.value ?? '').slice(0, 100),
        license,
        ...(meta.LicenseUrl?.value ? { licenseUrl: meta.LicenseUrl.value } : {}),
      });
    }
  }
  return out;
}

// --- Wikitext ---

/** Every {{Infobox automobile}} (or {{Infobox car}}) in the text, as its parameters. */
export function infoboxes(wikitext: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const opener = /\{\{\s*Infobox[ _](?:automobile|car)\s*(?=[\s|}<])/gi;
  for (let m = opener.exec(wikitext); m; m = opener.exec(wikitext)) {
    let depth = 0;
    let end = -1;
    for (let i = m.index; i < wikitext.length - 1; i++) {
      const pair = wikitext.slice(i, i + 2);
      if (pair === '{{' || pair === '[[') {
        depth++;
        i++;
      } else if (pair === '}}' || pair === ']]') {
        depth--;
        i++;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end === -1) break;
    out.push(templateParams(wikitext.slice(m.index + 2, end - 2)));
    opener.lastIndex = end;
  }
  return out;
}

/** A template's named parameters, split at its own pipes only. */
function templateParams(body: string): Record<string, string> {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const pair = body.slice(i, i + 2);
    if (pair === '{{' || pair === '[[') {
      depth++;
      i++;
    } else if (pair === '}}' || pair === ']]') {
      depth--;
      i++;
    } else if (body[i] === '|' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  const params: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase().replace(/\s+/g, '_');
    if (key) params[key] = part.slice(eq + 1).trim();
  }
  return params;
}

/** A parameter's value without comments and references. */
function stripNotes(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<ref[^>]*\/>/gi, ' ')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
    .replace(/\{\{\s*(?:efn|refn|sfn|citation needed|cn)[^{}]*\}\}/gi, ' ');
}

/** Readable text from wikitext: links to their labels, templates and markup gone. */
export function wikiPlain(value: string): string {
  let text = stripNotes(value)
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  // Templates, innermost first; their last positional value is usually the text.
  for (let i = 0; i < 5 && /\{\{/.test(text); i++) {
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_, inner: string) => {
      const parts = inner.split('|').filter((p) => !p.includes('='));
      return parts.length > 1 ? parts.slice(1).join(' ') : '';
    });
  }
  return plainText(text);
}

/** The first image file a parameter names: "File:Foo.jpg", "Foo.jpg", or inside a template. */
export function imageName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const m = /(?:^|[=|[:\s])((?:[^|[\]{}=\n:]+?)\.(?:jpe?g|png|webp))\b/i.exec(stripNotes(value));
  if (!m) return undefined;
  const name = m[1]
    .trim()
    .replace(/_/g, ' ')
    .replace(/^(?:File|Image)\s*:\s*/i, '');
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : undefined;
}

/** The first and last year a parameter gives; "present" is next year. */
export function yearRange(
  value: string | undefined,
  thisYear = new Date().getUTCFullYear(),
): [number, number] | undefined {
  if (!value) return undefined;
  const text = stripNotes(value);
  const years = [...text.matchAll(/\b(19[0-9]{2}|20[0-9]{2})\b/g)].map((m) => Number(m[1]));
  if (/\bpresent\b|\bcurrent\b|[–-]\s*(?:$|\n|\()/i.test(text)) years.push(thisYear + 1);
  if (!years.length) return undefined;
  return [Math.min(...years), Math.max(...years)];
}

/** The photo and years an infobox gives, if it gives both. */
export function infoboxGeneration(
  params: Record<string, string>,
  title: string,
  thisYear?: number,
): PhotoGeneration | undefined {
  const image = imageName(params.image);
  if (!image) return undefined;
  const modelYears = yearRange(params.model_years ?? params.model_year, thisYear);
  const production = yearRange(params.production, thisYear);
  const years = modelYears ?? production;
  if (!years) return undefined;
  const caption = params.caption ? wikiPlain(params.caption).slice(0, 140) : '';
  const body = params.body_style ? wikiPlain(params.body_style).slice(0, 140) : '';
  return {
    title,
    years,
    basis: modelYears ? 'model_years' : 'production',
    image,
    ...(caption ? { caption } : {}),
    ...(body ? { body } : {}),
  };
}

/** Articles the text links to that are generations of this one: "Honda Civic (tenth generation)". */
export function generationLinks(wikitext: string, title: string): string[] {
  const prefix = `${title} (`.toLowerCase();
  const found = new Set<string>();
  const links = /\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|[^\]]*)?\]\]/g;
  const mains = /\{\{\s*(?:main|main article|further|see also)\s*\|([^}]*)\}\}/gi;
  const consider = (target: string) => {
    const t = target.trim().replace(/_/g, ' ');
    if (t.toLowerCase().startsWith(prefix)) found.add(t.charAt(0).toUpperCase() + t.slice(1));
  };
  for (const m of wikitext.matchAll(links)) consider(m[1]);
  for (const m of wikitext.matchAll(mains)) {
    for (const part of m[1].split('|')) if (!part.includes('=')) consider(part);
  }
  return [...found];
}

/** Make names as letters and digits: "Mercedes-Benz" is "mercedesbenz". */
export const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Whether an article's title or infobox names the make. */
export function namesMake(title: string, params: Record<string, string>, make: string): boolean {
  const keys = [compact(make), compact(make.split(/\s+/)[0])].filter((k) => k.length >= 3);
  const haystack = compact(
    [title, params.manufacturer, params.brand, params.parent_company, params.marque]
      .filter(Boolean)
      .join(' '),
  );
  return keys.some((k) => haystack.includes(k));
}

/** Titles to try for a make's model, most likely first. */
export function titleCandidates(make: string, query: string): string[] {
  const out = [`${make} ${query}`];
  if (/\s/.test(query)) out.push(`${make} ${query.replace(/\s+/g, '-')}`);
  // "Ram 1500" is the article's own name.
  if (compact(query).startsWith(compact(make))) out.push(query);
  return [...new Set(out)];
}

/** Whether a search result is the model asked for, not merely about it. */
export function searchMatches(result: string, make: string, query: string): boolean {
  const name = compact(result.replace(/\s*\([^)]*\)\s*$/, ''));
  return name === compact(`${make} ${query}`) || name === compact(query);
}

/**
 * An infobox in a model's article that is not one of its generations: a
 * police or military version, a concept, or another make's twin (the
 * Infiniti QX4 in the Nissan Pathfinder's article).
 */
export function isSideBox(name: string, make: string, makes: string[]): boolean {
  if (
    /\b(?:LSSV|police|military|concept|prototype|racing|race car|rally|pace car|show car)\b/i.test(
      name,
    )
  ) {
    return true;
  }
  const own = make.toLowerCase();
  return makes.some((other) => {
    const o = other.toLowerCase();
    if (o === own || o.length < 4 || own.includes(o) || o.includes(own)) return false;
    return new RegExp(
      `(?:^|[^a-z])${o.replace(/[^a-z0-9]+/g, '[^a-z0-9]*')}(?:$|[^a-z])`,
      'i',
    ).test(name);
  });
}

/** The years a generation's box spans; an article's own box spanning more covers several. */
export const yearsSpanned = (g: PhotoGeneration) => g.years[1] - g.years[0];
