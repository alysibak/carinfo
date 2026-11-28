import type { CarDashboard } from '../types/car.types';
import { complaintPart, recallDate } from './recalls';
import { powertrainNames, splitInvestigations, splitRecalls } from '@carinfo/shared/recall-scope';
import { investigationPart, investigationText } from './investigations';
import { ordinal, theftPlace } from '@carinfo/shared/theft';
import { t, tp } from '../i18n';
import { fmtNumber } from '../i18n/format';

/**
 * A part's name in a sentence of several: "the electrical system,
 * transmission and engine", not "…, transmission and drivetrain and engine
 * and cooling". The list under it names each in full.
 */
const SHORT_PARTS: Record<string, string> = {
  'transmission and drivetrain': 'transmission',
  'engine and cooling': 'engine',
  'fuel and propulsion system': 'fuel system',
  'accelerator and cruise control': 'accelerator',
  'body and frame': 'body',
  'visibility and wipers': 'wipers',
  'latches, locks and linkages': 'locks',
};

export interface BeforeYouBuyItem {
  key: 'recalls' | 'complaints' | 'investigation' | 'fixes' | 'safety' | 'theft';
  text: string;
  headline: string;
  detail: string;
  tone: 'good' | 'check' | 'info';
  stars?: number;
  href: '#recalls' | '#fixes' | '#safety' | '#theft';
}

const FCW_WORDS = {
  standard: () => t(', with forward collision warning standard'),
  some: () => t(', with forward collision warning standard on some versions'),
  optional: () => t(', with forward collision warning optional'),
  none: () => '',
} as const;

const FCW_DETAIL = {
  standard: () => t(' Forward collision warning standard.'),
  some: () => t(' Forward collision warning standard on some versions.'),
  optional: () => t(' Forward collision warning optional.'),
} as const;

function namedPart(component: string): string | null {
  const part = investigationPart(component);
  return part === 'Other' || /^equipment$/i.test(part) ? null : part.toLowerCase();
}

function list(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return t('{head} and {tail}', {
    head: words.slice(0, -1).join(', '),
    tail: words.at(-1)!,
  });
}

export function beforeYouBuy(dashboard: CarDashboard): BeforeYouBuyItem[] {
  const { car, recalls, complaints, complaintRank, investigations, bulletins, modelPage, theft } =
    dashboard;
  const name = `${car.year} ${modelPage?.label ?? `${car.make} ${car.model}`}`;
  const items: BeforeYouBuyItem[] = [];

  if (recalls) {
    const { applies, other } = splitRecalls(recalls, {
      fuelType: car.engine.fuelType,
      mildHybrid: car.engine.mildHybrid,
    });
    const powertrains = [...new Set(other.map((o) => powertrainNames(o.powertrains)))].join(' or ');
    const others = other.length
      ? tp(
          other.length,
          ' ({count} more is for {powertrains} alone)',
          ' ({count} more are for {powertrains} alone)',
          { powertrains },
        )
      : '';
    const elsewhere = other.length
      ? t('{count} more for {powertrains} only.', { count: other.length, powertrains })
      : '';
    items.push({
      key: 'recalls',
      href: '#recalls',
      text: applies.length
        ? tp(
            applies.length,
            '{count} recall in Canada for the {name}{others}: ask for proof the work was done, or check the VIN with the maker or Transport Canada.',
            '{count} recalls in Canada for the {name}{others}: ask for proof the work was done, or check the VIN with the maker or Transport Canada.',
            { name, others },
          )
        : other.length
          ? t('No recalls in Canada listed for this version of the {name}{others}.', {
              name,
              others,
            })
          : t('No recalls in Canada listed for the {name}.', { name }),
      headline: applies.length
        ? tp(applies.length, '{count} recall in Canada', '{count} recalls in Canada')
        : t('No recalls in Canada'),
      detail: applies.length
        ? tp(
            applies.length,
            'Ask for proof it was fixed, or check the VIN with the maker.{elsewhere}',
            'Ask for proof they were fixed, or check the VIN with the maker.{elsewhere}',
            { elsewhere: elsewhere ? ` ${elsewhere}` : '' },
          )
        : elsewhere
          ? t('None for this version. {elsewhere}', { elsewhere })
          : t('None listed for the {name}.', { name }),
      tone: applies.length ? 'check' : 'good',
    });
  }

  if (complaints && complaints.complaints > 0 && complaints.parts.length) {
    const parts = complaints.parts
      .slice(0, 3)
      .map(([part]) => complaintPart(part).toLowerCase())
      .map((part) => SHORT_PARTS[part] ?? part);
    const most =
      complaintRank?.position === 1 && modelPage
        ? t(', the most of any {model} year on file', { model: modelPage.label })
        : '';
    const mostDetail =
      complaintRank?.position === 1 && modelPage
        ? t(', the most of any {model} year', { model: modelPage.label })
        : '';
    const countNum = complaints.complaints;
    const countFormatted = fmtNumber(countNum);
    items.push({
      key: 'complaints',
      href: '#recalls',
      text: tp(
        countNum,
        'Owners complained to NHTSA most about the {parts} ({count} complaint{most}): worth a look on a test drive.',
        'Owners complained to NHTSA most about the {parts} ({count} complaints{most}): worth a look on a test drive.',
        { parts: list(parts), count: countFormatted, most },
      ),
      headline: tp(countNum, '{count} owner complaint', '{count} owner complaints', {
        count: countFormatted,
      }),
      detail: t('Most about the {parts}{most}. Worth a look on a test drive.', {
        parts: list(parts),
        most: mostDetail,
      }),
      tone: complaintRank?.position === 1 ? 'check' : 'info',
    });
  }

  const open = splitInvestigations(investigations ?? [], {
    fuelType: car.engine.fuelType,
    mildHybrid: car.engine.mildHybrid,
  }).applies.find((inv) => !inv.closed);
  if (open) {
    const part = namedPart(open.component);
    const subject = investigationText(open.subject).replace(/\.$/, '');
    const opened = recallDate(open.opened);
    items.push({
      key: 'investigation',
      href: '#recalls',
      text: part
        ? t(
            'NHTSA (U.S.) has had an investigation open since {opened} into its {part}: {subject}. A recall may follow.',
            { opened, part, subject },
          )
        : t(
            'NHTSA (U.S.) has had an investigation open since {opened}: {subject}. A recall may follow.',
            { opened, subject },
          ),
      headline: t('Open NHTSA investigation'),
      detail: part
        ? t('Into its {part}, since {opened}: {subject}. A recall may follow.', {
            part,
            opened,
            subject,
          })
        : t('Since {opened}: {subject}. A recall may follow.', { opened, subject }),
      tone: 'check',
    });
  }

  // A warranty extension or free repair the maker announced: U.S. programs,
  // which a Canadian dealer can say whether it runs here too.
  const programs = bulletins?.shown.filter((b) => b.kind) ?? [];
  if (programs.length) {
    const parts = [
      ...new Set(
        programs
          .map((b) => complaintPart(b.parts[0] ?? 'UNKNOWN OR OTHER').toLowerCase())
          .map((part) => SHORT_PARTS[part] ?? part)
          .filter((part) => part !== 'other'),
      ),
    ].slice(0, 3);
    const extended = programs.some((b) => b.kind === 'warranty');
    items.push({
      key: 'fixes',
      href: '#fixes',
      text: parts.length
        ? t(
            'In the U.S., the maker extended a warranty or offers a free repair on the {parts}: ask a Canadian dealer whether it applies here, and whether this car has had the work.',
            { parts: list(parts) },
          )
        : t(
            'In the U.S., the maker extended a warranty or offers a free repair: ask a Canadian dealer whether it applies here, and whether this car has had the work.',
          ),
      headline: extended ? t('Warranty extended by the maker') : t('Free repair from the maker'),
      detail: parts.length
        ? t('On the {parts}, in the U.S. Ask a dealer if it applies in Canada.', {
            parts: list(parts),
          })
        : t('In the U.S. Ask a dealer if it applies in Canada.'),
      tone: 'check',
    });
  }

  const overall = car.safetyRating?.overall;
  if (overall) {
    const fcw = car.safetyTech?.fcw;
    items.push({
      key: 'safety',
      href: '#safety',
      text: t('NHTSA crash rating {overall}/5 overall{fcw}.', {
        overall,
        fcw: FCW_WORDS[fcw ?? 'none'](),
      }),
      headline: t('{overall}-star crash rating', { overall }),
      detail: t('NHTSA’s overall rating.{fcw}', { fcw: fcw ? FCW_DETAIL[fcw]() : '' }),
      tone: overall >= 5 ? 'good' : overall >= 4 ? 'info' : 'check',
      stars: overall,
    });
  } else if (car.safetyRating?.nhtsaIds?.length) {
    items.push({
      key: 'safety',
      href: '#safety',
      text: t('NHTSA lists this version but has not given it star ratings.'),
      headline: t('No crash rating yet'),
      detail: t('NHTSA lists this version but has not given it stars.'),
      tone: 'info',
    });
  }

  if (theft) {
    items.push({
      key: 'theft',
      href: '#theft',
      text: t(
        'The {model} was {place}: ask your insurer what it would cost to insure and whether it requires an anti-theft device.',
        { model: theft.model, place: theftPlace(theft) },
      ),
      headline:
        theft.rank === 1
          ? t('Most stolen in Canada')
          : t('{ordinal} most stolen in Canada', { ordinal: ordinal(theft.rank) }),
      detail: t(
        'In {year}. Ask your insurer what it costs to insure and whether it needs an anti-theft device.',
        { year: theft.year },
      ),
      tone: 'check',
    });
  }
  return items;
}
