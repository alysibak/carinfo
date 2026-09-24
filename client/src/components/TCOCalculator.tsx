import { useEffect, useId, useMemo, useState } from 'react';
import type { CarSpecs, OwnershipEconomics } from '../types/car.types';
import type { RegionId } from '@carinfo/config/regional-assumptions';
import { DISPLAY_CURRENCY } from '../utils/currency';
import { usesMpge } from '../utils/fuelDisplay';
import { useModalFocus } from '../hooks/useModalFocus';
import { computeTco, defaultTcoInputs, type TcoInputs } from '../utils/tco';

interface TCOCalculatorProps {
  car: CarSpecs;
  /** The dossier's ownership economics — the calculator starts from these. */
  ownership?: OwnershipEconomics | null;
  region: RegionId;
  onClose: () => void;
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

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
      <label htmlFor={id} className="block text-xs tracking-widest text-zinc-300 mb-2 uppercase">
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
        className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold tabular-nums focus:outline-none focus:border-zinc-500 transition-colors"
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4 pb-3 border-b border-zinc-900">
      <dt className="tracking-widest text-zinc-300 uppercase text-xs">{label}</dt>
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
  const containerRef = useModalFocus(true, onClose);

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
  const showElectricity = basis === 'electric' || basis === 'plug-in hybrid';
  const fuelNoun =
    fuelType === 'hydrogen' ? 'Hydrogen' : fuelType === 'natural gas' ? 'Natural gas' : 'Fuel';

  const efficiency = car.fuelEconomy?.combined;
  const efficiencyLabel = usesMpge(fuelType) ? 'MPGe' : 'MPG';
  const energyLabel = isElectric ? 'Electricity' : isPlugIn ? 'Fuel & electricity' : 'Fuel';
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
            <h2 id={titleId} className="text-2xl md:text-3xl font-black tracking-tighter mb-2">
              TOTAL COST OF OWNERSHIP
            </h2>
            <p className="text-sm tracking-wider text-zinc-400 uppercase">
              {car.year} {car.make} {car.model}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cost calculator"
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
          <form onSubmit={(e) => e.preventDefault()} aria-label="Assumptions">
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <h3 className="text-xl font-black tracking-tight uppercase">Your assumptions</h3>
              <button
                type="button"
                onClick={() => setInputs(defaults)}
                disabled={atDefaults}
                className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-400"
              >
                Reset
              </button>
            </div>

            <div className="space-y-5">
              <NumberField
                label="Years owned"
                value={inputs.yearsOwned}
                onChange={set('yearsOwned')}
                min={1}
                max={15}
              />
              <NumberField
                label="Purchase price"
                suffix={DISPLAY_CURRENCY}
                value={inputs.purchasePrice}
                onChange={set('purchasePrice')}
                step={500}
                hint={ownership ? 'Starts at the dossier’s estimated market value.' : undefined}
              />
              <NumberField
                label="Distance per year"
                suffix="km"
                value={inputs.annualKm}
                onChange={set('annualKm')}
                step={1000}
              />
              {showGas && (
                <NumberField
                  label="Gas price"
                  suffix={`${DISPLAY_CURRENCY}/L`}
                  value={inputs.gasPriceCadPerL}
                  onChange={set('gasPriceCadPerL')}
                  step={0.01}
                />
              )}
              {showElectricity && (
                <NumberField
                  label="Electricity rate"
                  suffix={`${DISPLAY_CURRENCY}/kWh`}
                  value={inputs.electricityRateCadPerKwh}
                  onChange={set('electricityRateCadPerKwh')}
                  step={0.01}
                />
              )}
              <NumberField
                label="Insurance"
                suffix={`${DISPLAY_CURRENCY}/yr`}
                value={inputs.insurancePerYear}
                onChange={set('insurancePerYear')}
                step={100}
              />
              <NumberField
                label="Maintenance"
                suffix={`${DISPLAY_CURRENCY}/yr`}
                value={inputs.maintenancePerYear}
                onChange={set('maintenancePerYear')}
                step={100}
              />

              <fieldset className="border border-zinc-900 p-4">
                <legend className="px-1">
                  <label className="flex items-center gap-2 text-xs tracking-widest text-zinc-300 uppercase cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.financed}
                      onChange={(e) => set('financed')(e.target.checked)}
                      className="accent-white"
                    />
                    Financed
                  </label>
                </legend>
                {inputs.financed ? (
                  <div className="space-y-5 mt-2">
                    <NumberField
                      label="Down payment"
                      suffix={DISPLAY_CURRENCY}
                      value={inputs.downPayment}
                      onChange={set('downPayment')}
                      step={1000}
                    />
                    <NumberField
                      label="Interest rate"
                      suffix="% APR"
                      value={Math.round(inputs.loanRate * 10000) / 100}
                      onChange={(pct) => set('loanRate')(pct / 100)}
                      step={0.1}
                      max={30}
                      hint={`Loan term matches years owned (${years * 12} months).`}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 mt-1">
                    Cash purchase, as in the dossier estimate. Tick to add loan interest.
                  </p>
                )}
              </fieldset>
            </div>
          </form>

          <section aria-labelledby={`${titleId}-results`}>
            <h3
              id={`${titleId}-results`}
              className="text-xl font-black tracking-tight mb-6 uppercase"
            >
              Your total cost
            </h3>

            <div
              className="bg-white text-black p-6 md:p-8 mb-6"
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="text-xs tracking-[0.3em] font-bold uppercase mb-2">
                {years}-year total
              </p>
              <p className="text-4xl md:text-5xl font-black tracking-tighter mb-4 tabular-nums">
                {money(result.total)}
              </p>
              <div className="h-px bg-black mb-4" />
              <p className="text-sm tracking-wider uppercase tabular-nums">
                {money(result.monthly)} per month
              </p>
            </div>

            {atDefaults && ownership && (
              <p className="text-xs text-zinc-500 mb-6">
                At these starting assumptions this matches the dossier’s estimate. Change any field
                to see your own number.
              </p>
            )}

            <dl className="space-y-3 text-sm">
              <Row label="Value lost (depreciation)" value={money(result.depreciation)} strong />
              <Row
                label={`${energyLabel} (${years} yr)`}
                value={result.energy ? money(result.energy.total) : 'Not on file'}
              />
              <Row label={`Insurance (${years} yr)`} value={money(result.insurance)} />
              <Row label={`Maintenance (${years} yr)`} value={money(result.maintenance)} />
              <Row
                label={`Tires & registration (${years} yr)`}
                value={money(result.tires + result.registration)}
              />
              {inputs.financed && <Row label="Loan interest" value={money(result.interest)} />}
            </dl>

            <div className="mt-6 space-y-2 text-xs text-zinc-500">
              {!result.energy && (
                <p>
                  This record has no fuel-economy figure, so fuel/energy is left out of the total
                  rather than guessed.
                </p>
              )}
              {result.energy?.basis === 'epa-annual-cost' && (
                <p>
                  {fuelNoun} cost uses EPA’s own annual estimate, scaled to your distance. It does
                  not change with the price inputs above.
                </p>
              )}
              {!result.depreciationFromDossier && (
                <p>Depreciation uses a generic ~15%/year curve because the dossier did not load.</p>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-zinc-900 grid grid-cols-2 gap-4">
              <div className="bg-zinc-950 border border-zinc-900 p-4">
                <p className="text-xs tracking-widest text-zinc-300 mb-2 uppercase">
                  Resale after {years} yr
                </p>
                <p className="text-2xl font-black tabular-nums">{money(result.resaleValue)}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-4">
                <p className="text-xs tracking-widest text-zinc-300 mb-2 uppercase">
                  {efficiencyLabel}
                </p>
                <p className="text-2xl font-black tabular-nums">{efficiency ? efficiency : '—'}</p>
              </div>
              {result.energy && (
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <p className="text-xs tracking-widest text-zinc-300 mb-2 uppercase">
                    {energyLabel} / yr
                  </p>
                  <p className="text-2xl font-black tabular-nums">{money(result.energy.annual)}</p>
                </div>
              )}
              {inputs.financed && (
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <p className="text-xs tracking-widest text-zinc-300 mb-2 uppercase">
                    Loan payment
                  </p>
                  <p className="text-2xl font-black tabular-nums">
                    {money(result.monthlyLoanPayment)}/mo
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
