import { Link } from 'react-router-dom';
import type { CarDashboard } from '../types/car.types';
import { beforeYouBuy } from '../utils/beforeYouBuy';

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
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.key} className="text-sm text-zinc-300 leading-relaxed">
              <a
                href={item.href}
                className="inline-block py-1 hover:text-white underline underline-offset-4 decoration-zinc-800 hover:decoration-zinc-500"
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
