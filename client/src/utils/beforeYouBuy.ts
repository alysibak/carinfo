import type { CarDashboard } from '../types/car.types';
import { complaintPart } from './recalls';
import { theftPlace } from '@carinfo/shared/theft';

export interface BeforeYouBuyItem {
  key: 'recalls' | 'complaints' | 'safety' | 'theft';
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

function list(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/**
 * What to check before buying the car, from the records on its page: the
 * model year's recalls in Canada (to verify by VIN), what owners complained
 * of most to NHTSA, NHTSA's crash rating, and whether thieves favour the
 * model. Only what is on file is said.
 */
export function beforeYouBuy(dashboard: CarDashboard): BeforeYouBuyItem[] {
  const { car, recalls, complaints, complaintRank, modelPage, theft } = dashboard;
  const name = `${car.year} ${modelPage?.label ?? `${car.make} ${car.model}`}`;
  const items: BeforeYouBuyItem[] = [];

  if (recalls) {
    items.push({
      key: 'recalls',
      href: '#recalls',
      text: recalls.length
        ? `${recalls.length} ${recalls.length === 1 ? 'recall' : 'recalls'} in Canada for the ${name}: ask for proof the work was done, or check the VIN with the maker or Transport Canada.`
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
