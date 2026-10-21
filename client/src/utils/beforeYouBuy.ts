import type { CarDashboard } from '../types/car.types';
import { complaintPart, recallDate } from './recalls';
import { powertrainNames, splitInvestigations, splitRecalls } from '@carinfo/shared/recall-scope';
import { investigationPart, investigationText } from './investigations';
import { theftPlace } from '@carinfo/shared/theft';

export interface BeforeYouBuyItem {
  key: 'recalls' | 'complaints' | 'investigation' | 'safety' | 'theft';
  text: string;
  /** The section of the car page it comes from. */
  href: '#recalls' | '#safety' | '#theft';
}

const FCW_WORDS = {
  standard: ', with forward collision warning standard',
  some: ', with forward collision warning standard on some versions',
  optional: ', with forward collision warning optional',
  none: '',
} as const;

/** NHTSA's component in words, or nothing where it names none ("UNKNOWN OR OTHER"). */
function namedPart(component: string): string | null {
  const part = investigationPart(component);
  return part === 'Other' || /^equipment$/i.test(part) ? null : part.toLowerCase();
}

function list(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/**
 * What to check before buying the car, from the records on its page: the
 * model year's recalls in Canada (to verify by VIN), what owners complained
 * of most to NHTSA, an investigation NHTSA still has open, NHTSA's crash
 * rating, and whether thieves favour the model. Only what is on file is said.
 */
export function beforeYouBuy(dashboard: CarDashboard): BeforeYouBuyItem[] {
  const { car, recalls, complaints, complaintRank, investigations, modelPage, theft } = dashboard;
  const name = `${car.year} ${modelPage?.label ?? `${car.make} ${car.model}`}`;
  const items: BeforeYouBuyItem[] = [];

  if (recalls) {
    const { applies, other } = splitRecalls(recalls, {
      fuelType: car.engine.fuelType,
      mildHybrid: car.engine.mildHybrid,
    });
    // The RAV4 Prime's recalls, filed under every 2021 RAV4, are not this version's.
    const others = other.length
      ? ` (${other.length} more ${other.length === 1 ? 'is' : 'are'} for ${[...new Set(other.map((o) => powertrainNames(o.powertrains)))].join(' or ')} alone)`
      : '';
    items.push({
      key: 'recalls',
      href: '#recalls',
      text: applies.length
        ? `${applies.length} ${applies.length === 1 ? 'recall' : 'recalls'} in Canada for the ${name}${others}: ask for proof the work was done, or check the VIN with the maker or Transport Canada.`
        : other.length
          ? `No recalls in Canada listed for this version of the ${name}${others}.`
          : `No recalls in Canada listed for the ${name}.`,
    });
  }

  if (complaints && complaints.complaints > 0 && complaints.parts.length) {
    const parts = complaints.parts.slice(0, 3).map(([part]) => complaintPart(part).toLowerCase());
    const most =
      complaintRank?.position === 1 && modelPage
        ? `, the most of any ${modelPage.label} year on file`
        : '';
    items.push({
      key: 'complaints',
      href: '#recalls',
      text: `Owners complained to NHTSA most about the ${list(parts)} (${complaints.complaints.toLocaleString('en-CA')} ${complaints.complaints === 1 ? 'complaint' : 'complaints'}${most}): worth a look on a test drive.`,
    });
  }

  // The newest still open: a recall may follow it.
  const open = splitInvestigations(investigations ?? [], {
    fuelType: car.engine.fuelType,
    mildHybrid: car.engine.mildHybrid,
  }).applies.find((inv) => !inv.closed);
  if (open) {
    items.push({
      key: 'investigation',
      href: '#recalls',
      text: `NHTSA (U.S.) has had an investigation open since ${recallDate(open.opened)}${namedPart(open.component) ? ` into its ${namedPart(open.component)}` : ''}: ${investigationText(open.subject).replace(/\.$/, '')}. A recall may follow.`,
    });
  }

  const overall = car.safetyRating?.overall;
  if (overall) {
    const fcw = car.safetyTech?.fcw;
    items.push({
      key: 'safety',
      href: '#safety',
      text: `NHTSA crash rating ${overall}/5 overall${FCW_WORDS[fcw ?? 'none']}.`,
    });
  } else if (car.safetyRating?.nhtsaIds?.length) {
    items.push({
      key: 'safety',
      href: '#safety',
      text: 'NHTSA lists this version but has not given it star ratings.',
    });
  }

  if (theft) {
    items.push({
      key: 'theft',
      href: '#theft',
      text: `The ${theft.model} was ${theftPlace(theft)}: ask your insurer what it would cost to insure and whether it requires an anti-theft device.`,
    });
  }
  return items;
}
