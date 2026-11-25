import { useEffect, useState } from 'react';
import { searchCars } from '../services/api';
import type { CarSpecs } from '../types/car.types';
import CarCard, { CARD_GRID } from './CarCard';
import { modelFamily } from '../utils/nearPrice';
import { msg, t } from '../i18n';

/** "Other sedans", not "Other sedan". */
const BODY_PLURALS: Record<string, string> = {
  sedan: msg('sedans'),
  suv: msg('SUVs'),
  truck: msg('pickups'),
  hatchback: msg('hatchbacks'),
  coupe: msg('coupes'),
  convertible: msg('convertibles'),
  wagon: msg('wagons'),
  minivan: msg('minivans'),
  van: msg('vans'),
};

/**
 * Other cars of the same kind and age a shopper could have for about the same
 * money: within a tenth of this one's estimated price, one per model.
 */
export default function NearPrice({ car }: { car: CarSpecs }) {
  const [cars, setCars] = useState<CarSpecs[] | null>(null);
  const price = car.price?.msrp;
  useEffect(() => {
    setCars(null);
    if (!price || !car.bodyStyle) return;
    const controller = new AbortController();
    searchCars(
      {
        filters: {
          bodyStyle: [car.bodyStyle],
          year: { min: car.year - 1, max: car.year + 1 },
          price: { min: Math.round(price * 0.9), max: Math.round(price * 1.1) },
        },
        sort: { field: 'price', order: 'asc' },
        collapseByModel: true,
        limit: 12,
      },
      { signal: controller.signal },
    )
      .then((found) => {
        const own = modelFamily(car);
        setCars(found.results.filter((other) => modelFamily(other) !== own).slice(0, 3));
      })
      .catch(() => setCars([]));
    return () => controller.abort();
  }, [car, price]);

  if (!cars || cars.length === 0) return null;
  return (
    <section
      aria-labelledby="near-price"
      className="page-wrap-wide section-y border-t border-zinc-900"
    >
      <h2 id="near-price" className="block-title mb-1">
        {t('Near this price')}
      </h2>
      <p className="text-sm text-zinc-400 mb-4 max-w-2xl">
        {t('Other {body} from {from} to {to} within a tenth of this one’s estimated price.', {
          body: t(BODY_PLURALS[car.bodyStyle ?? ''] ?? 'cars'),
          from: car.year - 1,
          to: car.year + 1,
        })}
      </p>
      <ul className={CARD_GRID}>
        {cars.map((other) => (
          <li key={other.id}>
            <CarCard car={other} aligned />
          </li>
        ))}
      </ul>
    </section>
  );
}
