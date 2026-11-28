import type { BulletinSummary, ServiceBulletin } from '../types/car.types';
import { bulletinText } from '@carinfo/shared/bulletins';

/**
 * A bulletin as read on the page: its first sentence as the line to scan,
 * the rest a tap away. NHTSA's capitals are put in sentence case, with the
 * car's own names (make, model) spelled as the site spells them.
 */
export function bulletinReading(
  bulletin: Pick<ServiceBulletin, 'summary'>,
  names: string[] = [],
): { headline: string; rest: string } {
  const text = bulletinText(bulletin.summary, names);
  const first = /^(.{12,}?[.!?])\s+(\S.*)$/.exec(text);
  if (first && first[1].length <= 140) return { headline: first[1], rest: first[2] };
  if (text.length <= 140) return { headline: text, rest: '' };
  const cut = text.slice(0, 130);
  return { headline: `${cut.slice(0, cut.lastIndexOf(' '))}…`, rest: text };
}

export interface BulletinGroups {
  /** Warranty extensions and free repair programs, newest first. */
  programs: ServiceBulletin[];
  /** Whether the parts below are those owners complain about most. */
  fromComplaints: boolean;
  /** The bulletins on each of those parts, with how many the part has in all. */
  byPart: Array<{ part: string; count: number; items: ServiceBulletin[] }>;
  /** The year's other parts with bulletins, most first: named, not listed. */
  otherParts: Array<[string, number]>;
}

/**
 * A year's bulletins as the page lists them: the programs first, then the
 * parts owners complain about most (in their order), each bulletin once,
 * under the first of its parts listed.
 */
export function bulletinGroups(
  bulletins: BulletinSummary,
  complainedParts: string[] = [],
): BulletinGroups {
  const programs = bulletins.shown.filter((b) => b.kind);
  const rest = bulletins.shown.filter((b) => !b.kind);
  const counts = new Map(bulletins.parts);
  const fromComplaints = complainedParts.some((part) => rest.some((b) => b.parts.includes(part)));
  const order = fromComplaints ? complainedParts : bulletins.parts.map(([part]) => part);
  const placed = new Set<string>();
  const byPart: BulletinGroups['byPart'] = [];
  for (const part of order) {
    const items = rest.filter((b) => !placed.has(b.id) && b.parts.includes(part));
    if (!items.length) continue;
    for (const b of items) placed.add(b.id);
    byPart.push({ part, count: counts.get(part) ?? items.length, items });
  }
  const listed = new Set(byPart.map((g) => g.part));
  const otherParts = bulletins.parts.filter(
    ([part]) => !listed.has(part) && !/^UNKNOWN/i.test(part),
  );
  return { programs, fromComplaints, byPart, otherParts };
}
