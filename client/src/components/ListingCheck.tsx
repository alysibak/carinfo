import { useId, useMemo, useRef, useState } from 'react';
import { getRegionalAssumptions } from '@carinfo/config/regional-assumptions';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import { regionName, useRegionStore } from '../stores/regionStore';
import { listingVerdict } from '../utils/listingCheck';
import { formatCurrency } from '../utils/dataValue';
import { DEFAULT_LOAN_RATE, monthlyPayment } from '../utils/tco';
import { intlLocale, locale, t } from '../i18n';

const inputClass =
  'w-full bg-zinc-900 border border-zinc-700 px-3 py-2 text-base text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none';

function digits(text: string): number | null {
  const n = Number(text.replace(/[^\d]/g, ''));
  return text.trim() && Number.isFinite(n) ? n : null;
}

/** "23400" as typed reads back "23,400": a long number checked at a glance. */
function grouped(text: string): string {
  const n = digits(text);
  return n == null ? '' : n.toLocaleString(intlLocale());
}

/** Loan terms a dealer offers; 84 months is common now, and costs the most. */
const LOAN_TERMS = [48, 60, 72, 84];

/**
 * The asking price as a monthly payment, the way a dealer quotes it, with the
 * interest a longer term adds. On the whole price, before tax and fees.
 */
/** "$414": in a sentence, without the currency code the other lines carry. */
function dollars(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('en-CA');
}

function LoanLine({ asking }: { asking: number }) {
  const [months, setMonths] = useState(72);
  const [rateText, setRateText] = useState((DEFAULT_LOAN_RATE * 100).toFixed(2));
  const rateId = useId();
  const rate = Number(rateText.replace(',', '.'));
  const valid = rateText.trim() !== '' && Number.isFinite(rate) && rate >= 0 && rate < 50;
  const payment = valid ? monthlyPayment(asking, rate / 100, months) : 0;
  const interest = Math.max(0, payment * months - asking);
  return (
    <div className="mt-4 border-t border-zinc-900 pt-3">
      <p className="text-sm text-zinc-200 leading-relaxed" aria-live="polite">
        {valid
          ? t('Financed: about {payment} a month for {months} months, {interest} in interest.', {
              payment: dollars(payment),
              months,
              interest: dollars(interest),
            })
          : t('Financed: enter a rate to see the payment.')}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {LOAN_TERMS.map((term) => (
          <button
            key={term}
            type="button"
            aria-pressed={months === term}
            onClick={() => setMonths(term)}
            className={`chip ${months === term ? 'chip-on' : ''}`}
          >
            {t('{months} mo', { months: term })}
          </button>
        ))}
        <label
          htmlFor={rateId}
          className="ml-1 inline-flex items-center gap-1.5 text-xs text-zinc-400"
        >
          {t('Rate')}
          <input
            id={rateId}
            inputMode="decimal"
            autoComplete="off"
            value={rateText}
            onChange={(e) => setRateText(e.target.value)}
            className="w-16 bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm text-white focus:border-zinc-400 focus:outline-none"
          />
          %
        </label>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        {t('On the whole asking price, before tax and fees. Use the rate you are offered.')}
      </p>
    </div>
  );
}

/** A number field with its own clear button. */
function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  // The clear button sits outside the label, so the field is named "Odometer"
  // alone, not "Odometer Clear Odometer".
  return (
    <div>
      <label className="block text-xs text-zinc-400" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          ref={input}
          id={id}
          className={`${inputClass} pr-10`}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(grouped(e.target.value))}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              input.current?.focus();
            }}
            aria-label={t('Clear {field}', { field: label })}
            className="absolute inset-y-0 right-0 w-10 inline-flex items-center justify-center text-zinc-500 hover:text-white"
          >
            <span aria-hidden>×</span>
          </button>
        )}
      </div>
    </div>
  );
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
          <NumberField
            id={`${id}-price`}
            label={t('Asking price')}
            value={price}
            onChange={setPrice}
            placeholder="$"
          />
        )}
        <NumberField
          id={`${id}-km`}
          label={t('Odometer')}
          value={km}
          onChange={setKm}
          placeholder="km"
        />
      </div>
      {(priceLine || kmLine) && (
        <ul className="mt-3 space-y-1.5" aria-live="polite">
          {priceLine && <li className="text-sm text-zinc-200 leading-relaxed">{priceLine}</li>}
          {kmLine && <li className="text-sm text-zinc-200 leading-relaxed">{kmLine}</li>}
        </ul>
      )}
      {(digits(price) ?? 0) > 0 && <LoanLine asking={digits(price) ?? 0} />}
      <p className="mt-3 text-xs text-zinc-500 leading-relaxed">
        {t(
          'Estimates from this car’s page, not an appraisal. Have the car inspected before paying.',
        )}
      </p>
    </div>
  );
}
