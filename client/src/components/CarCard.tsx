import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CarSpecs } from '../types/car.types';
import { useCarStore } from '../stores/carStore';
import {
  displayConfigSubtitle,
  displayModelLabel,
  displayVehicleTitle,
  formatTransmissionLabel,
} from '../utils/trimLabel';
import { formatPriceShort } from '../utils/dataValue';
import { efficiencyOf, rangeKm } from '../utils/efficiency';
import { formatCarFuelLabel } from '../utils/fuelDisplay';
import VehiclePlaceholder from './VehiclePlaceholder';
import { StatusToast } from './ui';
import { bodyStyleLabel } from '../utils/bodyStyleLabel';

export type CarCardLayout = 'grid' | 'list';

interface CarCardProps {
  car: CarSpecs;
  showCompare?: boolean;
  layout?: CarCardLayout;
  /** Why the car is in these results, from utils/matchReasons.ts. */
  reasons?: string[];
  /** Offers a "Remove" button beside Compare, as the garage does. */
  onRemove?: () => void;
}

interface Figure {
  label: string;
  value: string;
  unit?: string;
}

/**
 * The figures a result is chosen on, from the records: what it burns (or, for
 * an EV, how far it goes), its power, and its NHTSA crash rating. The
 * estimated value rides below them, labelled, rather than leading the card.
 */
function figuresFor(car: CarSpecs): Figure[] {
  const figures: Figure[] = [];
  const isEv = car.engine.fuelType === 'electric';
  if (isEv && car.epa?.rangeMiles) {
    const label = car.provenance?.['epa.rangeMiles'] === 'nrcan' ? 'Range' : 'EPA range';
    figures.push({ label, value: String(rangeKm(car.epa.rangeMiles)), unit: 'km' });
  } else {
    const efficiency = efficiencyOf(car);
    const [number, ...unit] = efficiency?.text.split(' ') ?? [];
    figures.push({
      label: efficiency?.label === 'Gas-mode fuel use' ? 'Gas mode' : 'Fuel use',
      value: number ?? '—',
      unit: unit.join(' ') || undefined,
    });
  }
  figures.push({
    label: 'Power',
    value: car.engine.horsepower ? String(car.engine.horsepower) : '—',
    unit: car.engine.horsepower ? 'hp' : undefined,
  });
  const stars = car.safetyRating?.overall;
  figures.push({
    label: 'NHTSA',
    value: stars && stars > 0 ? String(stars) : '—',
    unit: stars && stars > 0 ? '/5 stars' : 'not rated',
  });
  return figures;
}

/** "Est. value ~$35k", or nothing for a car the site does not value. */
function estimatedValue(car: CarSpecs): string | null {
  const price = formatPriceShort(car.price?.msrp, false);
  if (price === 'Not on file') return null;
  return `Est. value ~${price}`;
}

function CompareToggle({
  car,
  compact = false,
  onToast,
}: {
  car: CarSpecs;
  compact?: boolean;
  onToast: (message: string) => void;
}) {
  const { comparedCars, addOrReplaceOldestInComparison, removeCarFromComparison } = useCarStore();
  const isInComparison = comparedCars.some((c) => c.id === car.id);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInComparison) {
      removeCarFromComparison(car.id);
      onToast('Removed from compare');
      return;
    }
    const res = addOrReplaceOldestInComparison(car);
    if (!res.ok) {
      onToast(res.message);
      return;
    }
    onToast(
      res.swappedOut
        ? `Replaced ${res.swappedOut.year} ${res.swappedOut.make} ${displayModelLabel(res.swappedOut)}`
        : 'Added to compare',
    );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isInComparison}
      aria-label={`Compare the ${displayVehicleTitle(car)}`}
      className={`relative z-10 inline-flex shrink-0 border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
        compact
          ? 'flex-col items-center justify-center gap-1 min-h-[52px] min-w-[64px] px-1.5 text-xs'
          : 'items-center gap-2 min-h-[40px] px-2.5 text-[13px]'
      } ${
        isInComparison
          ? 'border-accent/70 bg-accent/10 text-accent'
          : 'border-zinc-700 text-zinc-300 hover:border-zinc-400 hover:text-white'
      }`}
    >
      <span
        aria-hidden
        className={`inline-flex items-center justify-center w-4 h-4 border ${
          isInComparison ? 'border-accent bg-accent text-accent-ink' : 'border-zinc-500'
        }`}
      >
        {isInComparison && (
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor">
            <path
              d="M3 8.5l3 3 7-7"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span>{compact && isInComparison ? 'Added' : 'Compare'}</span>
    </button>
  );
}

/** Search/browse result: a card in the grid, a row in the list. */
export default function CarCard({
  car,
  showCompare = true,
  layout = 'grid',
  reasons = [],
  onRemove,
}: CarCardProps) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const title = displayVehicleTitle(car);
  const config = displayConfigSubtitle(car);
  const transmission = car.transmission?.type ? formatTransmissionLabel(car.transmission) : null;
  const subtitle = [
    car.bodyStyle ? bodyStyleLabel(car.bodyStyle) : null,
    config ?? transmission,
    car.driveType,
    car.engine.fuelType && car.engine.fuelType !== 'gasoline' ? formatCarFuelLabel(car) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const figures = figuresFor(car);
  const estValue = estimatedValue(car);

  const titleLink = (
    <Link
      to={`/car/${car.id}`}
      className="after:absolute after:inset-0 focus:outline-none focus-visible:underline hover:underline underline-offset-2 decoration-zinc-600"
    >
      {title}
    </Link>
  );

  const reasonLine = reasons.length > 0 && (
    <p className="flex items-start gap-1.5 text-xs text-accent leading-snug">
      <svg
        viewBox="0 0 16 16"
        className="w-3.5 h-3.5 mt-px shrink-0"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <path d="M3 8.5l3 3 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>
        <span className="sr-only">Matches: </span>
        {reasons.join(' · ')}
      </span>
    </p>
  );

  if (layout === 'list') {
    return (
      <article className="group relative flex gap-3 px-3 py-3 border-b border-zinc-900 hover:bg-zinc-950 focus-within:bg-zinc-950">
        <StatusToast message={toast} />
        <div className="w-16 h-10 sm:w-20 sm:h-12 shrink-0 overflow-hidden mt-0.5">
          <VehiclePlaceholder car={car} compact hideCaption />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-white leading-snug min-w-0">
              {titleLink}
            </h3>
            {figures[0].value !== '—' && (
              <p className="text-[15px] font-bold tabular-nums text-white shrink-0">
                {figures[0].value}
                {figures[0].unit && (
                  <span className="text-xs font-normal text-zinc-400"> {figures[0].unit}</span>
                )}
              </p>
            )}
          </div>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{subtitle}</p>}
          <p className="text-[13px] text-zinc-300 tabular-nums mt-1">
            {[
              figures[1].value !== '—' ? `${figures[1].value} hp` : null,
              figures[2].value !== '—' ? `NHTSA ${figures[2].value}/5` : 'No NHTSA rating',
            ]
              .filter(Boolean)
              .join(' · ')}
            {estValue && <span className="text-zinc-500"> · {estValue.toLowerCase()}</span>}
          </p>
          {reasonLine && <div className="mt-1">{reasonLine}</div>}
        </div>
        {showCompare && (
          <div className="self-center">
            <CompareToggle car={car} compact onToast={setToast} />
          </div>
        )}
      </article>
    );
  }

  return (
    <article className="surface-card-hover group relative flex flex-col h-full overflow-hidden focus-within:border-zinc-400">
      <StatusToast message={toast} />

      <div className="flex items-center gap-3 p-3 pb-2.5">
        <div className="w-20 h-12 shrink-0 overflow-hidden">
          <VehiclePlaceholder car={car} compact hideCaption />
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-white leading-snug line-clamp-2">
            {titleLink}
          </h3>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{subtitle}</p>}
        </div>
      </div>

      <dl className="grid grid-cols-3 border-y border-zinc-900 divide-x divide-zinc-900">
        {figures.map((figure) => (
          <div key={figure.label} className="px-3 py-2 min-w-0">
            <dt className="text-xs text-zinc-500">{figure.label}</dt>
            <dd className="mt-0.5">
              <span
                className={`block text-lg font-bold tabular-nums leading-tight ${
                  figure.value === '—' ? 'text-zinc-500' : 'text-white'
                }`}
              >
                {figure.value}
              </span>
              {/* Under the figure: beside it, "L/100 km" ran into the next column. */}
              <span className="block text-xs text-zinc-500 whitespace-nowrap">
                {figure.unit ?? '\u00a0'}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="p-3 pt-2.5 flex flex-col gap-2 flex-1">
        {estValue && <p className="text-xs text-zinc-500">{estValue}</p>}
        {reasonLine}
        {(showCompare || onRemove) && (
          <div className="mt-auto pt-1 flex items-center justify-between gap-2">
            <span className="text-[13px] text-zinc-400 group-hover:text-white transition-colors">
              Details →
            </span>
            <div className="flex items-center gap-1">
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label={`Remove the ${title}`}
                  className="relative z-10 min-h-[40px] px-2.5 text-[13px] text-zinc-400 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  Remove
                </button>
              )}
              {showCompare && <CompareToggle car={car} onToast={setToast} />}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
