import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCarDashboard, type VinDecodeResult } from '../services/api';
import type { CarDashboard } from '../types/car.types';
import CarCard from './CarCard';
import { differentiateCars } from '../utils/differentiateCars';
import { vinChoiceNotes } from '../utils/vinChoices';
import { beforeYouBuy } from '../utils/beforeYouBuy';
import { locale, t } from '../i18n';
import { rich } from '../i18n/rich';

const CANADA_RECALLS = 'https://recalls-rappels.canada.ca/en';
const CANADA_RECALLS_FR = 'https://recalls-rappels.canada.ca/fr';

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

/**
 * The car here a decoded VIN is, first on its result: its card and a way to
 * its page, or, where the VIN fits several versions and does not say which,
 * each of them to pick from (the server matches them, see
 * services/vin-match.service.ts). Then what to check before buying one: the
 * model year's recalls, complaints and investigations.
 */
export default function VinCatalogMatch({ decoded }: { decoded: VinDecodeResult }) {
  const cars = useMemo(() => decoded.catalog?.cars ?? [], [decoded]);
  const lead = cars[0];
  const [dashboard, setDashboard] = useState<CarDashboard | null>(null);

  useEffect(() => {
    setDashboard(null);
    if (!lead) return;
    let live = true;
    getCarDashboard(lead.id)
      .then((data) => {
        if (live) setDashboard(data);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [lead]);

  // What tells the versions apart; the trade-offs between them where nothing on file does.
  const notes = useMemo(() => vinChoiceNotes(cars), [cars]);
  const diff = useMemo(() => (cars.length > 1 ? differentiateCars(cars) : null), [cars]);

  if (!lead) {
    return (
      <p className="mt-6 border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-zinc-300 leading-relaxed">
        {t(
          'No car here matches this VIN closely enough to open its page. The searches below find its model.',
        )}
      </p>
    );
  }

  const one = cars.length === 1;
  const carPath = `/car/${encodeURIComponent(lead.id)}`;
  const modelPage = dashboard?.modelPage;
  const name = `${lead.year} ${modelPage?.label ?? `${lead.make} ${lead.model}`}`;
  // With several versions, only what holds for all of them: the model year's
  // recalls, complaints and investigations, not one version's crash rating.
  const items = dashboard
    ? beforeYouBuy(dashboard).filter((item) => one || item.key !== 'safety')
    : [];

  return (
    <section aria-labelledby="vin-catalog" className="mt-6">
      <h3 id="vin-catalog" className="text-lg font-semibold text-white">
        {one ? t('This car on CarInfo') : t('Which one is it?')}
      </h3>
      <p className="mt-1 mb-3 text-sm text-zinc-400 leading-relaxed max-w-2xl">
        {one
          ? decoded.catalog?.basis === 'year'
            ? t('The only version of this model year on file.')
            : t('The version the VIN’s engine, drive and body match.')
          : decoded.catalog?.basis === 'year'
            ? t(
                'The VIN names the model year but not the version: these are the {count} on file. Pick the one that matches the car.',
                { count: cars.length },
              )
            : t(
                'The VIN fits these {count} versions and does not say which. Pick the one that matches the car.',
                { count: cars.length },
              )}
        {!decoded.decodedClean && <> {t('NHTSA flagged this VIN, so check the car against it.')}</>}
      </p>

      {one ? (
        <>
          <div className="max-w-md">
            <CarCard car={lead} />
          </div>
          <Link to={carPath} className="btn-primary mt-3 w-full sm:w-auto">
            {t('Open this car’s page')}
          </Link>
        </>
      ) : (
        // Two across at most: the result is narrower than a results page.
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cars.map((car) => (
            <li key={car.id}>
              <CarCard
                car={car}
                aligned
                notes={
                  (notes[car.id] ?? diff?.byCarId[car.id]?.edge) ? (
                    <p className="text-sm text-zinc-200 leading-snug">
                      {notes[car.id] ?? diff?.byCarId[car.id]?.edge}
                    </p>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      {dashboard && (
        <div className="mt-6 border border-zinc-800 bg-zinc-950 px-5 py-4">
          <p className="text-sm font-semibold text-white">
            {t('Before you buy: the {name}', { name })}
          </p>
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
              {t('No recalls, complaints or crash ratings on file for this model year.')}
            </p>
          )}
          {dashboard.recalls && dashboard.recalls.length > 0 && (
            <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
              {rich(
                t(
                  'A recall can cover only some cars of a model year. Enter this VIN on <0>Transport Canada’s recall site</0> or the maker’s to see whether it is affected and fixed.',
                ),
                [
                  (children) => (
                    <a
                      href={locale() === 'fr' ? CANADA_RECALLS_FR : CANADA_RECALLS}
                      target="_blank"
                      rel="noreferrer"
                      className={linkClass}
                    >
                      {children}
                    </a>
                  ),
                ],
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
            {one && (
              <Link to={`${carPath}/checklist`} className={linkClass}>
                {t('Checklist to take to the car')}
              </Link>
            )}
            {modelPage && (
              <Link to={modelPage.path} className={linkClass}>
                {t('Every year of the {label}', { label: modelPage.label })}
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
