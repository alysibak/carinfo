import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCarDashboard, searchCars, type VinDecodeResult } from '../services/api';
import type { CarDashboard } from '../types/car.types';
import { vinCatalogCar } from '../utils/vinMatch';
import { beforeYouBuy } from '../utils/beforeYouBuy';

const CANADA_RECALLS = 'https://recalls-rappels.canada.ca/en';

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

/**
 * What the catalog has on the model year a VIN decodes to: its recalls in
 * Canada, owner complaints to NHTSA and NHTSA's crash rating for its drive,
 * with the car's page. A recall can cover only some cars of a model year, so
 * the VIN itself is to be checked with the maker or Transport Canada.
 */
export default function VinCatalogMatch({ decoded }: { decoded: VinDecodeResult }) {
  const [dashboard, setDashboard] = useState<CarDashboard | null>(null);
  const [state, setState] = useState<'loading' | 'found' | 'none'>('loading');

  useEffect(() => {
    if (!decoded.year || !decoded.make || !decoded.model) {
      setState('none');
      return;
    }
    const controller = new AbortController();
    setState('loading');
    setDashboard(null);
    searchCars(
      {
        query: `${decoded.year} ${decoded.make} ${decoded.model}`,
        sort: { field: 'relevance', order: 'desc' },
        collapseByModel: false,
        limit: 40,
      },
      { signal: controller.signal },
    )
      .then((found) => {
        const car = vinCatalogCar(decoded, found.results);
        if (!car) throw new Error('no match');
        return getCarDashboard(car.id);
      })
      .then((data) => {
        setDashboard(data);
        setState('found');
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('none');
      });
    return () => controller.abort();
  }, [decoded]);

  if (state === 'loading') {
    return (
      <p className="mt-6 text-xs text-zinc-500">Looking for this model year in the catalog…</p>
    );
  }
  if (state === 'none' || !dashboard) return null;

  const { car, recalls, modelPage } = dashboard;
  const name = `${car.year} ${modelPage?.label ?? `${car.make} ${car.model}`}`;
  const items = beforeYouBuy(dashboard);
  const carPath = `/car/${encodeURIComponent(car.id)}`;

  return (
    <div className="mt-6 border border-zinc-800 bg-zinc-950 px-5 py-4">
      <p className="text-sm font-semibold text-white">Before you buy: the {name}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item.key} className="text-sm text-zinc-300 leading-relaxed">
              <Link to={`${carPath}${item.href}`} className={linkClass}>
                {item.text}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-zinc-400">
          No recalls, complaints or crash ratings on file for this model year.
        </p>
      )}
      {recalls && recalls.length > 0 && (
        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
          A recall can cover only some cars of a model year. Enter this VIN on{' '}
          <a href={CANADA_RECALLS} target="_blank" rel="noreferrer" className={linkClass}>
            Transport Canada’s recall site
          </a>{' '}
          or the maker’s to see whether it is affected and fixed.
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
        <Link to={carPath} className={linkClass}>
          Open the {name}
        </Link>
        <Link to={`${carPath}/checklist`} className={linkClass}>
          Checklist to take to the car
        </Link>
        {modelPage && (
          <Link to={modelPage.path} className={linkClass}>
            Every year of the {modelPage.label}
          </Link>
        )}
      </div>
    </div>
  );
}
