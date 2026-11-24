import { useId, useState } from 'react';
import { tripCostPerKm, type EnergyCostBasis } from '@carinfo/shared/energy-cost';
import type { CarSpecs } from '../types/car.types';
import { useRegionStore } from '../stores/regionStore';
import { useCostAssumptions } from '../utils/costAssumptions';
import { formatMoney } from '../utils/money';
import { TRIPS } from '../config/trips';
import { intlLocale, t } from '../i18n';

/** "About $48 in gas for 540 km", by what the car runs on. */
function tripSentence(basis: EnergyCostBasis, car: CarSpecs, cost: string, km: string): string {
  const vars = { cost, km };
  if (car.engine.fuelType === 'plug-in hybrid') {
    return t(
      'About {cost} in gas for {km} km: on a long trip, the charge covers only the start.',
      vars,
    );
  }
  switch (basis) {
    case 'electric':
      return t(
        'About {cost} in electricity for {km} km, at home charging rates; fast chargers on the road cost more.',
        vars,
      );
    case 'diesel':
      return t('About {cost} in diesel for {km} km.', vars);
    case 'hydrogen':
      return t('About {cost} in hydrogen for {km} km.', vars);
    case 'gasoline':
      return car.epa?.premiumFuel
        ? t('About {cost} in premium gas for {km} km.', vars)
        : t('About {cost} in gas for {km} km.', vars);
    default:
      return t('About {cost} in fuel for {km} km.', vars);
  }
}

/**
 * What one drive costs in this car: a trip people in the visitor's province
 * make, or a distance of their own, on EPA's highway rating at the prices
 * the yearly figure uses.
 */
export default function TripCost({ car }: { car: CarSpecs }) {
  const region = useRegionStore((s) => s.region);
  const assumptions = useCostAssumptions();
  const [choice, setChoice] = useState<0 | 1 | 'own'>(0);
  const [ownText, setOwnText] = useState('');
  const ownId = useId();
  const rate = tripCostPerKm(car, assumptions);
  if (!rate) return null;

  const trips = TRIPS[region];
  const trip = choice === 'own' ? null : trips[choice];
  const ownKm = Number(ownText.replace(/[^\d]/g, ''));
  const km = trip ? trip.km : ownKm > 0 && ownKm <= 20_000 ? ownKm : null;
  const number = (n: number) => n.toLocaleString(intlLocale());

  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-white">{t('A trip in this car')}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={t('Trip')}>
        {trips.map((option, i) => (
          <button
            key={`${option.from}-${option.to}`}
            type="button"
            aria-pressed={choice === i}
            onClick={() => setChoice(i as 0 | 1)}
            className={`chip ${choice === i ? 'chip-on' : ''}`}
          >
            {option.from} → {option.to}
          </button>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <label htmlFor={ownId} className="sr-only">
            {t('Your own distance, km')}
          </label>
          <input
            id={ownId}
            inputMode="numeric"
            autoComplete="off"
            placeholder={t('Other')}
            value={ownText}
            onFocus={() => setChoice('own')}
            onChange={(e) => {
              setChoice('own');
              const n = Number(e.target.value.replace(/[^\d]/g, ''));
              setOwnText(e.target.value.trim() && n > 0 ? number(n) : '');
            }}
            className={`w-20 bg-black border px-2 py-1.5 text-sm text-white tabular-nums focus:outline-hidden focus:border-accent ${
              choice === 'own' ? 'border-zinc-400' : 'border-zinc-700'
            }`}
          />
          <span className="text-xs text-zinc-400">km</span>
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-200 leading-relaxed" aria-live="polite">
        {km
          ? tripSentence(rate.basis, car, formatMoney(rate.perKmCad * km), number(km))
          : t('Type a distance in kilometres.')}
      </p>
      <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
        {t('One way, on EPA’s highway rating at the prices above; road distances are approximate.')}
      </p>
    </div>
  );
}
