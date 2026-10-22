import { Link } from 'react-router-dom';
import type { CarDashboard } from '../types/car.types';
import { beforeYouBuy, type BeforeYouBuyItem } from '../utils/beforeYouBuy';

const LABELS: Record<BeforeYouBuyItem['key'], string> = {
  recalls: 'Recalls',
  complaints: 'Complaints',
  investigation: 'Investigation',
  safety: 'Crash rating',
  theft: 'Theft',
};

/**
 * The car page's checklist for a buyer: the model year's recalls to verify,
 * what owners complained of most and NHTSA's crash rating, each linking to
 * its section further down.
 */
export default function BeforeYouBuy({ dashboard }: { dashboard: CarDashboard }) {
  const items = beforeYouBuy(dashboard);
  if (!items.length) return null;
  return (
    <section aria-labelledby="before-you-buy" className="border-b border-zinc-900">
      <div className="page-wrap-wide py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-2">
          <h2 id="before-you-buy" className="eyebrow">
            Before you buy
          </h2>
          <Link
            to={`/car/${encodeURIComponent(dashboard.car.id)}/checklist`}
            className="inline-block py-1.5 text-xs text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500"
          >
            Checklist to take to the car
          </Link>
        </div>
        <ul className="border-t border-zinc-900">
          {items.map((item) => (
            <li key={item.key} className="border-b border-zinc-900 last:border-b-0">
              {/* A row per check, labelled, linking to its section: four
                  underlined paragraphs read as a wall of links. */}
              <a
                href={item.href}
                className="group grid grid-cols-1 sm:grid-cols-[8.5rem_1fr_auto] gap-x-4 gap-y-0.5 py-2.5 sm:items-baseline hover:bg-zinc-950 -mx-2 px-2"
              >
                <span className="text-xs text-zinc-500">{LABELS[item.key]}</span>
                <span className="text-sm text-zinc-200 group-hover:text-white leading-relaxed">
                  {item.text}
                </span>
                <span
                  className="hidden sm:inline text-zinc-600 group-hover:text-white text-sm"
                  aria-hidden
                >
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
