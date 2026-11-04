import { useEffect, useId, useMemo, useState } from 'react';
import type { CarSpecs, OwnershipEconomics } from '../types/car.types';
import {
  getRegionalAssumptions,
  monthLabel,
  type RegionId,
} from '@carinfo/config/regional-assumptions';
import { PUMP_PRICES } from '@carinfo/config/pump-prices';
import { DISPLAY_CURRENCY } from '../utils/currency';
import { usesMpge } from '../utils/fuelDisplay';
import { useModalFocus } from '../hooks/useModalFocus';
import { computeTco, defaultTcoInputs, type TcoInputs } from '../utils/tco';
import { t } from '../i18n';
import { fmtMoney } from '../i18n/format';

interface TCOCalculatorProps {
  car: CarSpecs;
  /** The dossier's ownership economics — the calculator starts from these. */
  ownership?: OwnershipEconomics | null;
  region: RegionId;
  onClose: () => void;
}

const money = (n: number) => fmtMoney(Math.round(n));

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-zinc-300 mb-2">
        {label}
        {suffix && <span className="text-zinc-500 normal-case tracking-normal"> ({suffix})</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        max={max}
        aria-describedby={hintId}
        onChange={(e) => {
          const next = e.target.valueAsNumber;
          // An empty field mid-edit is not a value; keep the last good one.
          if (Number.isFinite(next))
            onChange(Math.max(min, max != null ? Math.min(max, next) : next));
        }}
        className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold tabular-nums focus:outline-hidden focus:border-zinc-500 transition-colors"
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Statistics Canada's cities, "Canada" (no diesel or premium on file) last. */
const PUMP_CITIES = (Object.keys(PUMP_PRICES.cities) as Array<keyof typeof PUMP_PRICES.cities>)
  .filter((place) => place !== 'Canada')
  .sort();

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4 pb-3 border-b border-zinc-900">
      <dt className="text-zinc-300 text-xs">{label}</dt>
      <dd
        className={`tabular-nums ${strong ? 'text-lg font-bold text-white' : 'text-lg font-bold'}`}
      >
        {value}
      </dd>
    </div>
  );
}

export default function TCOCalculator({ car, ownership, region, onClose }: TCOCalculatorProps) {
  const titleId = useId();
  const defaults = useMemo(
    () => defaultTcoInputs(car, ownership, region),
    [car, ownership, region],
  );
  const [inputs, setInputs] = useState<TcoInputs>(defaults);
  const regionCity = getRegionalAssumptions(region).pumpPrices.place;
  const [city, setCity] = useState(regionCity);
  const containerRef = useModalFocus(true, onClose);

  // Another city's average pump prices, over the same months as the region's.
  const pickCity = (place: string) => {
    setCity(place);
    const prices = PUMP_PRICES.cities[place as keyof typeof PUMP_PRICES.cities];
    if (!prices) return;
    setInputs((current) => ({
      ...current,
      gasPriceCadPerL: prices.regular,
      ...('diesel' in prices ? { dieselPriceCadPerL: prices.diesel } : {}),
    }));
  };

  // Background scroll would move the page behind a full-screen dialog.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const set =
    <K extends keyof TcoInputs>(key: K) =>
    (value: TcoInputs[K]) =>
      setInputs((current) => ({ ...current, [key]: value }));

  const result = useMemo(() => computeTco(car, inputs, ownership), [car, inputs, ownership]);
  const atDefaults = JSON.stringify(inputs) === JSON.stringify(defaults);

  const fuelType = car.engine.fuelType;
  const isElectric = fuelType === 'electric';
  const isPlugIn = fuelType === 'plug-in hybrid';
  // Offer only the price inputs that move this car's estimate. Hydrogen and
  // natural gas are priced from EPA's own annual cost, so neither applies.
  const basis = result.energy?.basis;
  const showGas = basis === 'gasoline' || basis === 'plug-in hybrid';
  const showDiesel = basis === 'diesel';
  const showElectricity = basis === 'electric' || basis === 'plug-in hybrid';
  const fuelNoun =
    fuelType === 'hydrogen'
      ? t('Hydrogen')
      : fuelType === 'natural gas'
        ? t('Natural gas')
        : t('Fuel');

  const efficiency = car.fuelEconomy?.combined;
  const efficiencyLabel = usesMpge(fuelType) ? t('MPGe') : t('MPG');
  const energyLabel = isElectric
    ? t('Electricity')
    : isPlugIn
      ? t('Fuel & electricity')
      : t('Fuel');
  const years = inputs.yearsOwned;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-start md:items-center justify-center p-4 md:p-8 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-w-5xl w-full bg-black border border-zinc-800 p-6 md:p-12 my-4"
      >
        <div className="flex items-start justify-between gap-4 mb-8 pb-8 border-b border-zinc-900">
          <div>
            <h2 id={titleId} className="text-2xl md:text-3xl font-bold tracking-tighter mb-2">
              {t('TOTAL COST OF OWNERSHIP')}
            </h2>
            <p className="text-sm text-zinc-400">
              {car.year} {car.make} {car.model}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close cost calculator')}
            className="text-zinc-400 hover:text-white transition-colors p-1"
          >
            <svg
              aria-hidden
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
          <form onSubmit={(e) => e.preventDefault()} aria-label={t('Assumptions')}>
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold tracking-tight">{t('Your assumptions')}</h3>
              <button
                type="button"
                onClick={() => {
                  setInputs(defaults);
                  setCity(regionCity);
                }}
                disabled={atDefaults}
                className="text-xs text-zinc-400 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-400"
              >
                {t('Reset')}
              </button>
            </div>

            <div className="space-y-5">
              <NumberField
                label={t('Years owned')}
                value={inputs.yearsOwned}
                onChange={set('yearsOwned')}
                min={1}
                max={15}
              />
              <NumberField
                label={t('Purchase price')}
                suffix={DISPLAY_CURRENCY}
                value={inputs.purchasePrice}
                onChange={set('purchasePrice')}
                step={500}
                hint={ownership ? t('Starts at the dossier’s estimated market value.') : undefined}
              />
              <NumberField
                label={t('Distance per year')}
                suffix="km"
                value={inputs.annualKm}
                onChange={set('annualKm')}
                step={1000}
              />
              {(showGas || showDiesel) && (
                <div>
                  <label htmlFor={`${titleId}-city`} className="block text-xs text-zinc-300 mb-2">
                    {t('Pump prices for')}
                  </label>
                  <select
                    id={`${titleId}-city`}
                    value={city}
                    onChange={(e) => pickCity(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm focus:outline-hidden focus:border-zinc-500 transition-colors"
                  >
                    {PUMP_CITIES.map((place) => (
                      <option key={place} value={place}>
                        {place}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {t(
                      'Statistics Canada’s self-serve average, {from}–{through}. Insurance and registration stay {region}’s.',
                      {
                        from: monthLabel(PUMP_PRICES.from),
                        through: monthLabel(PUMP_PRICES.through),
                        region: getRegionalAssumptions(region).label,
                      },
                    )}
                  </p>
                </div>
              )}
              {showGas && (
                <NumberField
                  label={t('Gas price')}
                  suffix={`${DISPLAY_CURRENCY}/L`}
                  value={inputs.gasPriceCadPerL}
                  onChange={set('gasPriceCadPerL')}
                  step={0.01}
                  hint={
                    car.epa?.premiumFuel
                      ? t(
                          'Regular. EPA rates this car on premium, costed at this plus ${amount}/L.',
                          {
                            amount:
                              getRegionalAssumptions(region).premiumOverRegularCadPerL.toFixed(2),
                          },
                        )
                      : undefined
                  }
                />
              )}
              {showDiesel && (
                <NumberField
                  label={t('Diesel price')}
                  suffix={`${DISPLAY_CURRENCY}/L`}
                  value={inputs.dieselPriceCadPerL}
                  onChange={set('dieselPriceCadPerL')}
                  step={0.01}
                />
              )}
              {showElectricity && (
                <NumberField
                  label={t('Electricity rate')}
                  suffix={`${DISPLAY_CURRENCY}/kWh`}
                  value={inputs.electricityRateCadPerKwh}
                  onChange={set('electricityRateCadPerKwh')}
                  step={0.01}
                />
              )}
              <NumberField
                label={t('Insurance')}
                suffix={`${DISPLAY_CURRENCY}/yr`}
                value={inputs.insurancePerYear}
                onChange={set('insurancePerYear')}
                step={100}
              />
              <NumberField
                label={t('Maintenance')}
                suffix={`${DISPLAY_CURRENCY}/yr`}
                value={inputs.maintenancePerYear}
                onChange={set('maintenancePerYear')}
                step={100}
              />

              <fieldset className="border border-zinc-900 p-4">
                <legend className="px-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.financed}
                      onChange={(e) => set('financed')(e.target.checked)}
                      className="accent-white"
                    />
                    {t('Financed')}
                  </label>
                </legend>
                {inputs.financed ? (
                  <div className="space-y-5 mt-2">
                    <NumberField
                      label={t('Down payment')}
                      suffix={DISPLAY_CURRENCY}
                      value={inputs.downPayment}
                      onChange={set('downPayment')}
                      step={1000}
                    />
                    <NumberField
                      label={t('Interest rate')}
                      suffix="% APR"
                      value={Math.round(inputs.loanRate * 10000) / 100}
                      onChange={(pct) => set('loanRate')(pct / 100)}
                      step={0.1}
                      max={30}
                      hint={t('Loan term matches years owned ({months} months).', {
                        months: years * 12,
                      })}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 mt-1">
                    {t('Cash purchase, as in the dossier estimate. Tick to add loan interest.')}
                  </p>
                )}
              </fieldset>
            </div>
          </form>

          <section aria-labelledby={`${titleId}-results`}>
            <h3 id={`${titleId}-results`} className="text-xl font-bold tracking-tight mb-6">
              {t('Your total cost')}
            </h3>

            <div
              className="border border-accent/40 bg-accent/6 p-6 md:p-8 mb-6"
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="text-sm text-zinc-300 mb-2">{t('{years}-year total', { years })}</p>
              <p className="text-4xl md:text-5xl font-bold tracking-tight mb-4 tabular-nums text-white">
                {money(result.total)}
              </p>
              <div className="h-px bg-zinc-700 mb-4" />
              <p className="text-sm tabular-nums text-zinc-200">
                {t('{amount} per month', { amount: money(result.monthly) })}
              </p>
            </div>

            {atDefaults && ownership && (
              <p className="text-xs text-zinc-500 mb-6">
                {t(
                  'At these starting assumptions this matches the dossier’s estimate. Change any field to see your own number.',
                )}
              </p>
            )}

            <dl className="space-y-3 text-sm">
              <Row
                label={t('Value lost (depreciation)')}
                value={money(result.depreciation)}
                strong
              />
              <Row
                label={t('{label} ({years} yr)', { label: energyLabel, years })}
                value={result.energy ? money(result.energy.total) : t('Not on file')}
              />
              <Row label={t('Insurance ({years} yr)', { years })} value={money(result.insurance)} />
              <Row
                label={t('Maintenance ({years} yr)', { years })}
                value={money(result.maintenance)}
              />
              <Row
                label={t('Tires & registration ({years} yr)', { years })}
                value={money(result.tires + result.registration)}
              />
              {inputs.financed && <Row label={t('Loan interest')} value={money(result.interest)} />}
            </dl>

            <div className="mt-6 space-y-2 text-xs text-zinc-500">
              {!result.energy && (
                <p>
                  {t(
                    'This record has no fuel-economy figure, so fuel/energy is left out of the total rather than guessed.',
                  )}
                </p>
              )}
              {result.energy?.basis === 'hydrogen' && (
                <p>
                  {t(
                    'Hydrogen cost reads EPA’s MPGe as miles per kilogram, at the region’s posted pump price. It does not change with the price inputs above.',
                  )}
                </p>
              )}
              {result.energy?.basis === 'epa-annual-cost' && (
                <p>
                  {t(
                    '{fuel} cost uses EPA’s own annual estimate, scaled to your distance. It does not change with the price inputs above.',
                    { fuel: fuelNoun },
                  )}
                </p>
              )}
              {!result.depreciationFromDossier && (
                <p>
                  {t(
                    'Depreciation uses a generic ~15%/year curve because the dossier did not load.',
                  )}
                </p>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-zinc-900 grid grid-cols-2 gap-4">
              <div className="bg-zinc-950 border border-zinc-900 p-4">
                <p className="text-xs text-zinc-300 mb-2">
                  {t('Resale after {years} yr', { years })}
                </p>
                <p className="text-2xl font-bold tabular-nums">{money(result.resaleValue)}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-4">
                <p className="text-xs text-zinc-300 mb-2">{efficiencyLabel}</p>
                <p className="text-2xl font-bold tabular-nums">{efficiency ? efficiency : '—'}</p>
              </div>
              {result.energy && (
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <p className="text-xs text-zinc-300 mb-2">
                    {t('{label} / yr', { label: energyLabel })}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">{money(result.energy.annual)}</p>
                </div>
              )}
              {inputs.financed && (
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <p className="text-xs text-zinc-300 mb-2">{t('Loan payment')}</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {t('{amount}/mo', { amount: money(result.monthlyLoanPayment) })}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
