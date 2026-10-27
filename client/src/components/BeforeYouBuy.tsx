import { Link } from 'react-router-dom';
import type { CarDashboard } from '../types/car.types';
import { beforeYouBuy, type BeforeYouBuyItem } from '../utils/beforeYouBuy';
import RatingStars from './RatingStars';

const TONE = {
  good: {
    box: 'border-accent/40 bg-accent/10 text-accent',
    said: 'Clear: ',
    path: 'M4.5 10.5l3.5 3.5 7.5-8',
  },
  check: {
    box: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    said: 'Worth checking: ',
    path: 'M10 4.5v7M10 15v.5',
  },
  info: {
    box: 'border-zinc-700 text-zinc-400',
    said: '',
    path: 'M10 9v6.5M10 5v.5',
  },
} as const;

/** A check's mark: a tick, an exclamation mark or an "i", each in its colour, so the shape says it too. */
function Mark({ tone }: { tone: BeforeYouBuyItem['tone'] }) {
  return (
    <span
      className={`mt-0.5 w-5 h-5 shrink-0 border flex items-center justify-center ${TONE[tone].box}`}
      aria-hidden
    >
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor">
        <path d={TONE[tone].path} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * What to check before buying, at a glance: a few words a check, marked
 * clear, worth checking or for information, each linking to its section
 * further down. Four paragraphs said the same and were read as a wall.
 */
export default function BeforeYouBuy({ dashboard }: { dashboard: CarDashboard }) {
  const items = beforeYouBuy(dashboard);
  if (!items.length) return null;
  const toCheck = items.filter((item) => item.tone === 'check').length;
  const cols =
    items.length === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : items.length >= 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : items.length === 2
          ? 'sm:grid-cols-2'
          : '';
  return (
    <section aria-labelledby="before-you-buy" className="border-b border-zinc-900">
      <div className="page-wrap-wide py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
          <h2 id="before-you-buy" className="eyebrow">
            Before you buy
            {toCheck > 0 && (
              <span className="ml-2 normal-case tracking-normal font-medium text-amber-300">
                · {toCheck} to check
              </span>
            )}
          </h2>
          <Link
            to={`/car/${encodeURIComponent(dashboard.car.id)}/checklist`}
            className="inline-block py-1.5 text-xs text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500"
          >
            Checklist to take to the car
          </Link>
        </div>
        <ul className={`grid grid-cols-1 gap-2 ${cols}`}>
          {items.map((item) => (
            <li key={item.key} className="min-w-0">
              <a
                href={item.href}
                className="spotlight group flex items-start gap-3 h-full p-3.5 border border-zinc-800 bg-zinc-950/60 hover:border-zinc-600 hover:bg-zinc-950 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <Mark tone={item.tone} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[15px] font-semibold text-white leading-snug">
                    <span>
                      <span className="sr-only">{TONE[item.tone].said}</span>
                      {item.headline}
                    </span>
                    {item.stars != null && <RatingStars stars={item.stars} className="w-3 h-3" />}
                  </span>
                  <span className="block mt-1 text-[13px] text-zinc-400 group-hover:text-zinc-300 leading-snug">
                    {item.detail}
                  </span>
                </span>
                <span className="text-zinc-600 group-hover:text-white text-sm" aria-hidden>
                  ↓
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
