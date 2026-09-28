import type { CarSpecs } from '../types/car.types';
import { efficiencyOf } from './efficiency';
import { formatMoneyShort } from './money';

export interface QuizAnswers {
  priority: 'mpg' | 'power' | 'safety' | 'space' | null;
  usage: 'commute' | 'family' | 'fun' | 'work' | null;
  minPrice: number;
  maxPrice: number;
}

/** No upper limit: the quiz's "$100k+" answer. */
const OPEN_ENDED = 999999;

const PRIORITY_LABEL: Record<NonNullable<QuizAnswers['priority']>, string> = {
  mpg: 'fuel economy matters most',
  power: 'performance matters most',
  safety: 'safety matters most',
  space: 'space matters most',
};

const USAGE_LABEL: Record<NonNullable<QuizAnswers['usage']>, string> = {
  commute: 'a daily commute',
  family: 'a family',
  fun: 'weekend fun',
  work: 'work',
};

/** The answers, as a reader would say them: "For a daily commute · fuel economy matters most · $20k–$35k". */
export function describeAnswers(answers: QuizAnswers): string {
  const budget =
    answers.maxPrice >= OPEN_ENDED
      ? answers.minPrice > 0
        ? `${formatMoneyShort(answers.minPrice)} and up`
        : 'any budget'
      : answers.minPrice > 0
        ? `${formatMoneyShort(answers.minPrice)}–${formatMoneyShort(answers.maxPrice)}`
        : `under ${formatMoneyShort(answers.maxPrice)}`;
  const parts = [
    answers.usage ? `For ${USAGE_LABEL[answers.usage]}` : null,
    answers.priority ? PRIORITY_LABEL[answers.priority] : null,
    budget,
  ].filter((part): part is string => !!part);
  const line = parts.join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}

function bodyReason(car: CarSpecs): string | null {
  switch (car.bodyStyle) {
    case 'minivan':
      return 'A minivan: the most room for people and cargo';
    case 'suv':
      return 'An SUV: room for a family and their gear';
    case 'wagon':
      return 'A wagon: car-like to drive, with cargo room';
    case 'truck':
      return 'A pickup, for hauling and towing';
    default:
      return null;
  }
}

/**
 * Why a quiz pick fits the answers given, in the answers' own terms: the
 * picks used to lead with how they differed from each other, which put "FWD —
 * usually simpler and more efficient than AWD" above the reason to buy them.
 */
export function quizReasons(car: CarSpecs, answers: QuizAnswers): string[] {
  const reasons: string[] = [];
  const efficiency = efficiencyOf(car);
  const hp = car.engine.horsepower;
  const stars = car.safetyRating?.overall ?? 0;

  const wantsEfficiency = answers.priority === 'mpg' || answers.usage === 'commute';
  const wantsPower = answers.priority === 'power' || answers.usage === 'fun';
  const wantsSpace =
    answers.priority === 'space' || answers.usage === 'family' || answers.usage === 'work';

  if (answers.priority === 'safety') {
    reasons.push(stars > 0 ? `${stars}/5 in NHTSA crash tests` : 'Not yet crash-tested by NHTSA');
  }
  if (wantsEfficiency && efficiency) {
    const verb = efficiency.unit === 'kWh/100 km' ? 'charge' : 'fuel';
    reasons.push(
      `${efficiency.text}: cheap to ${verb}${answers.usage === 'commute' ? ' every day' : ''}`,
    );
  }
  if (wantsPower && hp) reasons.push(`${hp} hp`);
  if (wantsSpace) {
    const body = bodyReason(car);
    if (body) reasons.push(body);
  }

  const price = car.price?.msrp;
  if (price && price > 0) {
    const inBudget =
      price >= answers.minPrice && (answers.maxPrice >= OPEN_ENDED || price <= answers.maxPrice);
    if (inBudget && answers.maxPrice < OPEN_ENDED) {
      reasons.push(`About ${formatMoneyShort(price)}, inside your budget`);
    }
  }

  return reasons.slice(0, 3);
}
