import { useId, useMemo, useState } from 'react';
import { getRegionalAssumptions } from '@carinfo/config/regional-assumptions';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import { regionName, useRegionStore } from '../stores/regionStore';
import { listingVerdict } from '../utils/listingCheck';
import { formatCurrency } from '../utils/dataValue';
import { locale, t } from '../i18n';

const inputClass =
  'w-full bg-zinc-900 border border-zinc-700 px-3 py-2 text-base text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none';

function digits(text: string): number | null {
  const n = Number(text.replace(/[^\d]/g, ''));
  return text.trim() && Number.isFinite(n) ? n : null;
}

/**
 * The driveway check: the listing's asking price and odometer against our
 * estimated value for the region and the region's typical yearly distance.
 * Two fields, two plain sentences, and a reminder that an inspection beats
 * any number here.
 */
export default function ListingCheck({
  car,
  dashboard,
}: {
  car: CarSpecs;
  dashboard: CarDashboard;
}) {
  const region = useRegionStore((s) => s.region);
  const id = useId();
  const [price, setPrice] = useState('');
  const [km, setKm] = useState('');
  const value = dashboard.ownership.unvalued ? null : dashboard.ownership.marketValue;
  const annualKm = getRegionalAssumptions(region).annualKm;
  const verdict = useMemo(
    () =>
      listingVerdict({
        year: car.year,
        askingPrice: digits(price),
        odometerKm: digits(km),
        value,
        annualKm,
      }),
    [car.year, price, km, value, annualKm],
  );
  const number = new Intl.NumberFormat(locale() === 'fr' ? 'fr-CA' : 'en-CA');
  const money = (n: number) => formatCurrency(n);
  const place = regionName(region);

  const priceLine = verdict.price
    ? {
        within: t('Within our estimated value for this car in {region}: {low} to {high}.', {
          region: place,
          low: money(verdict.price.value.low),
          high: money(verdict.price.value.high),
        }),
        above: t('{amount} above our estimated value in {region} ({low} to {high}).', {
          amount: money(verdict.price.diff),
          region: place,
          low: money(verdict.price.value.low),
          high: money(verdict.price.value.high),
        }),
        below: t(
          '{amount} below our estimated value in {region} ({low} to {high}): worth asking why.',
          {
            amount: money(-verdict.price.diff),
            region: place,
            low: money(verdict.price.value.low),
            high: money(verdict.price.value.high),
          },
        ),
      }[verdict.price.band]
    : null;
  const kmLine = verdict.km
    ? {
        typical: t('About {perYear} km a year, close to the {typical} km typical in {region}.', {
          perYear: number.format(verdict.km.perYear),
          typical: number.format(verdict.km.typicalPerYear),
          region: place,
        }),
        high: t(
          'About {perYear} km a year, well above the {typical} km typical in {region}: expect more wear.',
          {
            perYear: number.format(verdict.km.perYear),
            typical: number.format(verdict.km.typicalPerYear),
            region: place,
          },
        ),
        low: t(
          'About {perYear} km a year, well below the {typical} km typical in {region}: ask how it was used.',
          {
            perYear: number.format(verdict.km.perYear),
            typical: number.format(verdict.km.typicalPerYear),
            region: place,
          },
        ),
      }[verdict.km.band]
    : null;

  return (
    <div
      id="check-listing"
      className="mt-6 border border-zinc-800 bg-zinc-950 px-5 py-4 scroll-mt-24"
    >
      <p className="text-sm font-semibold text-white">{t('Check a listing')}</p>
      <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
        {value
          ? t('Its asking price and odometer, against what is on file for this car.')
          : t(
              'Its odometer against the distance typical for its age; no value is estimated for this car.',
            )}
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
        {value && (
          <label className="block text-xs text-zinc-400" htmlFor={`${id}-price`}>
            {t('Asking price')}
            <input
              id={`${id}-price`}
              className={`${inputClass} mt-1`}
              inputMode="numeric"
              placeholder="$"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        )}
        <label className="block text-xs text-zinc-400" htmlFor={`${id}-km`}>
          {t('Odometer')}
          <input
            id={`${id}-km`}
            className={`${inputClass} mt-1`}
            inputMode="numeric"
            placeholder="km"
            value={km}
            onChange={(e) => setKm(e.target.value)}
          />
        </label>
      </div>
      {(priceLine || kmLine) && (
        <ul className="mt-3 space-y-1.5" aria-live="polite">
          {priceLine && <li className="text-sm text-zinc-200 leading-relaxed">{priceLine}</li>}
          {kmLine && <li className="text-sm text-zinc-200 leading-relaxed">{kmLine}</li>}
        </ul>
      )}
      <p className="mt-3 text-xs text-zinc-500 leading-relaxed">
        {t(
          'Estimates from this car’s page, not an appraisal. Have the car inspected before paying.',
        )}
      </p>
    </div>
  );
}
