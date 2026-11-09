import type { CanadianRecall, Car } from '../types/car.types.js';
import * as carService from './car.service.js';
import { canadianRecallsFor } from './safety-records.service.js';
import { splitRecalls } from '../shared/recall-scope.js';
import { displayVehicleTitle } from '../shared/vehicle-labels.js';
import { isEmailConfigured, sendEmail, type EmailMessage } from '../auth/email.js';
import { isDatabaseConfigured } from '../db/pool.js';
import {
  getGarageIds,
  getRecallNoticeNumbers,
  getWatchedCarIds,
  listRecallAlertRecipients,
  recordRecallNotices,
  watchCars,
  withRecallAlertLock,
} from '../db/user-store.js';
import { siteUrl } from '../seo/site.js';
import { unsubscribeToken } from '../utils/unsubscribe-token.js';

/**
 * Recall alerts: an email when Transport Canada lists a new recall for a car
 * in someone's garage, for those who turned them on at a confirmed address.
 *
 * "New" means new to the site's data since the car was first watched. The
 * recalls listed when watching starts are noted without an email (the garage
 * page already shows them), so turning alerts on never sends a backlog. Each
 * recall is noted once it is sent, and a run holds a database lock, so a
 * retried or overlapping run cannot send it twice.
 */

export interface WatchedRecall {
  carId: string;
  car: Car;
  recall: CanadianRecall;
}

/** The recalls in Canada that can cover the car's powertrain; none where its model is unmatched. */
export function recallsForCar(carId: string): { car: Car; recalls: CanadianRecall[] } | null {
  const car = carService.getCarById(carId);
  if (!car) return null;
  const listed = canadianRecallsFor(carService.modelLineKey(car), car.year) ?? [];
  const { applies } = splitRecalls(listed, {
    fuelType: car.engine.fuelType,
    mildHybrid: car.engine.mildHybrid,
  });
  return { car, recalls: applies };
}

/**
 * Starts watching cars, noting the recalls they have now as known. Cars
 * already watched keep their notes, so a recall since is still sent.
 */
export async function startWatching(
  userId: string,
  carIds: string[],
  options: { reset?: boolean } = {},
): Promise<string[]> {
  const fresh = await watchCars(userId, carIds, options);
  const notices = fresh.flatMap((carId) =>
    (recallsForCar(carId)?.recalls ?? []).map((recall) => ({ carId, recallNumber: recall.number })),
  );
  await recordRecallNotices(userId, notices, false);
  return fresh;
}

/** Recalls listed now for these cars that are not yet noted, in garage order. */
export function newRecalls(carIds: string[], noted: Map<string, Set<string>>): WatchedRecall[] {
  const found: WatchedRecall[] = [];
  for (const carId of carIds) {
    const listed = recallsForCar(carId);
    if (!listed) continue;
    const seen = noted.get(carId);
    for (const recall of listed.recalls) {
      if (!seen?.has(recall.number)) found.push({ carId, car: listed.car, recall });
    }
  }
  return found;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A recall summary cut at a word, for an email that links to the full notice. */
function clip(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 0)).replace(/[\s,;:.]+$/, '')}…`;
}

const TRANSPORT_CANADA = 'https://recalls-rappels.canada.ca/en';

/** The alert for one person: every new recall across their garage, by car. */
export function renderRecallAlert({
  to,
  items,
  origin,
  token,
}: {
  to: string;
  items: WatchedRecall[];
  origin: string;
  token: string;
}): EmailMessage {
  const cars = new Map<string, { car: Car; recalls: CanadianRecall[] }>();
  for (const item of items) {
    const entry = cars.get(item.carId) ?? { car: item.car, recalls: [] };
    entry.recalls.push(item.recall);
    cars.set(item.carId, entry);
  }
  const titles = new Map([...cars].map(([id, { car }]) => [id, displayVehicleTitle(car)]));
  const [firstTitle] = titles.values();
  const subject =
    cars.size > 1
      ? `New recalls for ${cars.size} cars in your garage`
      : items.length === 1
        ? `A new recall for your ${firstTitle}`
        : `${items.length} new recalls for your ${firstTitle}`;
  const intro =
    items.length === 1
      ? 'Transport Canada has listed a new recall for a car in your CarInfo garage.'
      : `Transport Canada has listed ${items.length} new recalls for cars in your CarInfo garage.`;
  const unsubscribePage = `${origin}/unsubscribe?token=${encodeURIComponent(token)}`;
  const oneClick = `${origin}/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`;
  const check =
    'Whether a recall covers your own car depends on its VIN: check with the maker, a dealer or Transport Canada';
  const why = 'You get these emails because you turned on recall alerts at CarInfo.';

  const textBlocks = [...cars].map(([id, { recalls }]) => {
    const lines = recalls.map(
      (r) => `- Recall ${r.number} (${r.system}), ${r.date}: ${clip(r.summary)}`,
    );
    return `${titles.get(id)}\n${lines.join('\n')}\n${origin}/car/${encodeURIComponent(id)}#recalls`;
  });
  const text =
    `${intro}\n\n${textBlocks.join('\n\n')}\n\n${check} (${TRANSPORT_CANADA}).\n\n` +
    `${why} To stop them: ${unsubscribePage}`;

  const htmlBlocks = [...cars].map(([id, { recalls }]) => {
    const href = escapeHtml(`${origin}/car/${encodeURIComponent(id)}#recalls`);
    const list = recalls
      .map(
        (r) =>
          `<li><strong>Recall ${escapeHtml(r.number)}</strong> (${escapeHtml(r.system)}), ` +
          `${escapeHtml(r.date)}: ${escapeHtml(clip(r.summary))}</li>`,
      )
      .join('');
    return (
      `<h2 style="font-size:16px;margin:24px 0 8px">${escapeHtml(titles.get(id) ?? '')}</h2>` +
      `<ul style="padding-left:18px;margin:0 0 8px">${list}</ul>` +
      `<p style="margin:0"><a href="${href}">See the recalls on CarInfo</a></p>`
    );
  });
  const html =
    `<p>${escapeHtml(intro)}</p>${htmlBlocks.join('')}` +
    `<p style="margin-top:24px">${escapeHtml(check)} (<a href="${TRANSPORT_CANADA}">recalls-rappels.canada.ca</a>).</p>` +
    `<p style="color:#666;font-size:13px">${escapeHtml(why)} ` +
    `<a href="${escapeHtml(unsubscribePage)}">Turn recall alerts off</a>.</p>`;

  return {
    to,
    subject,
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

export interface RecallAlertRun {
  ran: boolean;
  /** Why it did not run, when it did not. */
  reason?: string;
  dryRun: boolean;
  recipients: number;
  emailed: number;
  recalls: number;
  /** Saved cars seen for the first time, whose current recalls were noted without an email. */
  newlyWatched: number;
  /** Recipients left for the next run when this one ran out of time. */
  unfinished: number;
  failed: number;
  /** A dry run's would-be emails. */
  preview?: Array<{ to: string; subject: string; recalls: number }>;
}

/**
 * One run: every recipient's new recalls, one email each. Stops starting new
 * recipients after `budgetMs` (the serverless function's limit is 60 s); the
 * next run carries on where it left off, since only what was sent is noted.
 */
export async function runRecallAlerts(
  options: { dryRun?: boolean; budgetMs?: number; now?: () => number } = {},
): Promise<RecallAlertRun> {
  const { dryRun = false, budgetMs = 45_000, now = Date.now } = options;
  const started = now();
  const base: RecallAlertRun = {
    ran: false,
    dryRun,
    recipients: 0,
    emailed: 0,
    recalls: 0,
    newlyWatched: 0,
    unfinished: 0,
    failed: 0,
  };
  if (!isDatabaseConfigured()) return { ...base, reason: 'DATABASE_URL is not set' };
  if (!dryRun && !isEmailConfigured()) return { ...base, reason: 'Email is not configured' };
  const origin = siteUrl();
  if (!origin) return { ...base, reason: 'SITE_URL is not set, so emails could not link back' };
  if (!unsubscribeToken('probe')) {
    return { ...base, reason: 'BETTER_AUTH_SECRET is not set, so no unsubscribe link' };
  }

  const run = await withRecallAlertLock(async () => {
    const result: RecallAlertRun = { ...base, ran: true, ...(dryRun ? { preview: [] } : {}) };
    const recipients = await listRecallAlertRecipients();
    result.recipients = recipients.length;
    for (const [index, recipient] of recipients.entries()) {
      if (now() - started > budgetMs) {
        result.unfinished = recipients.length - index;
        break;
      }
      try {
        const garage = await getGarageIds(recipient.userId);
        const watched = await getWatchedCarIds(recipient.userId);
        const unwatched = garage.filter((id) => !watched.has(id));
        if (unwatched.length && !dryRun) {
          result.newlyWatched += (await startWatching(recipient.userId, unwatched)).length;
        }
        const noted = await getRecallNoticeNumbers(recipient.userId);
        const items = newRecalls(
          garage.filter((id) => watched.has(id)),
          noted,
        );
        if (!items.length) continue;
        const message = renderRecallAlert({
          to: recipient.email,
          items,
          origin,
          token: unsubscribeToken(recipient.userId)!,
        });
        if (dryRun) {
          result.recalls += items.length;
          result.preview!.push({
            to: recipient.email,
            subject: message.subject,
            recalls: items.length,
          });
          continue;
        }
        await sendEmail(message);
        await recordRecallNotices(
          recipient.userId,
          items.map((item) => ({ carId: item.carId, recallNumber: item.recall.number })),
          true,
        );
        result.emailed += 1;
        result.recalls += items.length;
      } catch (error) {
        result.failed += 1;
        console.error(
          JSON.stringify({
            level: 'error',
            msg: 'recall alert failed',
            userId: recipient.userId,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }
    return result;
  });
  return run ?? { ...base, reason: 'Another run is in progress' };
}
