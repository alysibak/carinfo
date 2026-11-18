import { createHash } from 'crypto';
import { isEmailConfigured, sendEmail, type EmailMessage } from '../auth/email.js';
import { ensureSchema, getPool, isDatabaseConfigured } from '../db/pool.js';
import { siteUrl } from '../seo/site.js';
import type { ClientErrorLog } from '../utils/client-error.js';

/**
 * Browser crash reports, where the site's owner sees them. Each report
 * (POST /api/client-errors) is counted against its kind of crash in the
 * database, and a daily email (the cron's /api/cron/crash-digest, to
 * CRASH_REPORTS_TO) lists the kinds that came in since the last one. The log
 * line each report already writes stays, but a host keeps those only
 * briefly, and nobody reads them.
 *
 * Kept is what that log line holds and no more: the crash's message, stack,
 * page and browser, never an IP address or an account. A kind not seen for
 * four weeks is deleted: the privacy policy's "a few weeks at most".
 */
export const KEEP_DAYS = 28;
/** Kinds listed in one email, the most frequent first; the rest are counted. */
export const DIGEST_LIMIT = 20;

/**
 * One kind of crash: its source and message, less what changes from build to
 * build or visit to visit (addresses, hashed file names, numbers), so the
 * same bug counts once across deploys.
 */
export function crashFingerprint(report: Pick<ClientErrorLog, 'source' | 'message'>): string {
  const message = report.message
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/\b[0-9a-f]{6,}\b/gi, '<id>')
    .replace(/\d+/g, '<n>');
  return createHash('sha256').update(`${report.source}\n${message}`).digest('hex').slice(0, 24);
}

/** Counts a report against its kind; nothing where no database is set up. */
export async function recordClientError(report: ClientErrorLog): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await ensureSchema();
  await getPool().query(
    `INSERT INTO client_errors (fingerprint, source, message, path, stack, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (fingerprint) DO UPDATE SET
       count = client_errors.count + 1,
       last_seen = NOW(),
       path = EXCLUDED.path,
       stack = COALESCE(EXCLUDED.stack, client_errors.stack),
       user_agent = COALESCE(EXCLUDED.user_agent, client_errors.user_agent)`,
    [
      crashFingerprint(report),
      report.source,
      report.message,
      report.path,
      report.stack ?? null,
      report.userAgent ?? null,
    ],
  );
}

interface CrashRow {
  fingerprint: string;
  source: string;
  message: string;
  path: string;
  stack: string | null;
  user_agent: string | null;
  count: number;
  reported: number;
  first_seen: Date;
  last_seen: Date;
}

/** A kind of crash as the digest shows it. */
export interface CrashKind {
  source: string;
  message: string;
  /** The page it last happened on. */
  path: string;
  stack: string | null;
  userAgent: string | null;
  /** Reports since the last digest. */
  fresh: number;
  total: number;
  firstSeen: Date;
  lastSeen: Date;
}

const SOURCE_LABELS: Record<string, string> = {
  boundary: 'the error screen showed',
  window: 'uncaught error',
  promise: 'unhandled rejection',
};

const BROWSERS: [RegExp, string][] = [
  [/Edg(?:A|iOS)?\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
  [/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'],
  [/(?:CriOS|Chrome)\/(\d+)/, 'Chrome'],
  [/Version\/(\d+)[\d.]*.*Safari/, 'Safari'],
];

/** "Chrome 131 on Android": enough to try it again, from the browser's own description. */
export function browserName(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const system = /iPhone|iPad/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Windows/.test(userAgent)
        ? 'Windows'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;
  const found = BROWSERS.map(([pattern, name]) => {
    const match = userAgent.match(pattern);
    return match ? `${name} ${match[1]}` : null;
  }).find(Boolean);
  if (!found) return system;
  return system ? `${found} on ${system}` : found;
}

/** The stack's first frame, without the site's address: where to look first. */
function firstFrame(stack: string | null): string | null {
  const frame = stack
    ?.split('\n')
    .map((line) => line.trim())
    .find((line) => /^at\s|@/.test(line));
  return frame ? frame.replace(/https?:\/\/[^/\s)]+/g, '').slice(0, 200) : null;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const day = (date: Date) => date.toISOString().slice(0, 10);

/** The digest email for these kinds, the most frequent first. */
export function renderCrashDigest(
  kinds: CrashKind[],
  origin: string | null,
): Omit<EmailMessage, 'to'> {
  const reports = kinds.reduce((sum, kind) => sum + kind.fresh, 0);
  const listed = kinds.slice(0, DIGEST_LIMIT);
  const more = kinds.length - listed.length;
  const subject = `CarInfo: ${count(reports, 'browser crash report')}, ${count(kinds.length, 'kind')}`;
  const intro = `Visitors' browsers sent ${count(reports, 'crash report')} since the last digest, of ${count(kinds.length, 'kind')}:`;
  const footer =
    'Kept without IP addresses or accounts, and deleted after four weeks unseen. ' +
    'Sent because CRASH_REPORTS_TO is set on the server.';

  const parts = (kind: CrashKind) => ({
    head: `${kind.fresh}× ${kind.message}`,
    where: [kind.path, browserName(kind.userAgent)].filter(Boolean).join(' · '),
    seen:
      `${kind.total} in all, ${SOURCE_LABELS[kind.source] ?? kind.source}; ` +
      `first seen ${day(kind.firstSeen)}, last ${day(kind.lastSeen)}`,
    frame: firstFrame(kind.stack),
  });

  const text = [
    intro,
    ...listed.map((kind) => {
      const { head, where, seen, frame } = parts(kind);
      return [head, `   ${where}`, `   ${seen}`, frame ? `   ${frame}` : null]
        .filter(Boolean)
        .join('\n');
    }),
    more ? `And ${count(more, 'more kind')}.` : null,
    footer,
  ]
    .filter(Boolean)
    .join('\n\n');

  const items = listed.map((kind) => {
    const { where, seen, frame } = parts(kind);
    const page = origin
      ? `<a href="${escapeHtml(origin + kind.path)}">${escapeHtml(kind.path)}</a>`
      : escapeHtml(kind.path);
    const rest = escapeHtml(where.slice(kind.path.length));
    return (
      `<li><p><strong>${kind.fresh}×</strong> ${escapeHtml(kind.message)}<br>` +
      `<span style="color:#555">${page}${rest}<br>${escapeHtml(seen)}</span>` +
      (frame ? `<br><code style="font-size:12px">${escapeHtml(frame)}</code>` : '') +
      '</p></li>'
    );
  });
  const html =
    `<p>${escapeHtml(intro)}</p><ol>${items.join('')}</ol>` +
    (more ? `<p>And ${escapeHtml(count(more, 'more kind'))}.</p>` : '') +
    `<p style="color:#555">${escapeHtml(footer)}</p>`;

  return { subject, text, html };
}

export interface CrashDigestRun {
  kinds: number;
  reports: number;
  sent: boolean;
  reason?: string;
  /** The most frequent, for the run's log line where no email went. */
  top?: { message: string; reports: number }[];
}

/**
 * The daily digest: forgets kinds unseen for four weeks, then emails the
 * kinds with reports since the last digest and marks them sent. Where no
 * email can go, the run says why, and the reports wait for the next.
 */
export async function runCrashDigest(): Promise<CrashDigestRun> {
  if (!isDatabaseConfigured())
    return { kinds: 0, reports: 0, sent: false, reason: 'DATABASE_URL is not set' };
  await ensureSchema();
  const pool = getPool();
  await pool.query(
    `DELETE FROM client_errors WHERE last_seen < NOW() - make_interval(days => $1)`,
    [KEEP_DAYS],
  );
  const { rows } = await pool.query<CrashRow>(
    `SELECT * FROM client_errors WHERE count > reported ORDER BY count - reported DESC, last_seen DESC`,
  );
  if (rows.length === 0) return { kinds: 0, reports: 0, sent: false, reason: 'no new reports' };

  const kinds: CrashKind[] = rows.map((row) => ({
    source: row.source,
    message: row.message,
    path: row.path,
    stack: row.stack,
    userAgent: row.user_agent,
    fresh: row.count - row.reported,
    total: row.count,
    firstSeen: new Date(row.first_seen),
    lastSeen: new Date(row.last_seen),
  }));
  const base = {
    kinds: kinds.length,
    reports: kinds.reduce((sum, kind) => sum + kind.fresh, 0),
    top: kinds.slice(0, 5).map((kind) => ({ message: kind.message, reports: kind.fresh })),
  };
  const to = process.env.CRASH_REPORTS_TO?.trim();
  if (!to) return { ...base, sent: false, reason: 'CRASH_REPORTS_TO is not set' };
  if (!isEmailConfigured())
    return { ...base, sent: false, reason: 'email is not set up (RESEND_API_KEY, EMAIL_FROM)' };

  await sendEmail({ to, ...renderCrashDigest(kinds, siteUrl()) });
  // Marked as of what was read: reports that came in meanwhile wait for the next digest.
  await pool.query(
    `UPDATE client_errors AS c SET reported = v.count
       FROM unnest($1::text[], $2::int[]) AS v(fingerprint, count)
      WHERE c.fingerprint = v.fingerprint`,
    [rows.map((row) => row.fingerprint), rows.map((row) => row.count)],
  );
  return { ...base, sent: true };
}
