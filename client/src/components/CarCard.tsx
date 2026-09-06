import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CarSpecs } from '../types/car.types';
import { useCarStore } from '../stores/carStore';
import { displayListingSubtitle, displayModelLabel, formatTransmissionLabel } from '../utils/trimLabel';
import {
  formatEngineDetailForCard,
  formatMpgForCard,
  formatPriceShort,
  formatRangeForCard,
} from '../utils/dataValue';
import { formatFuelBadge, usesMpge } from '../utils/fuelDisplay';
import VehiclePlaceholder from './VehiclePlaceholder';
import { StatusToast } from './ui';

interface CarCardProps {
  car: CarSpecs;
  showCompare?: boolean;
}

/** Search/browse card — compact illustration; specs stay the focus. */
export default function CarCard({ car, showCompare = true }: CarCardProps) {
  const { comparedCars, addOrReplaceOldestInComparison, removeCarFromComparison } = useCarStore();
  const [toast, setToast] = useState<string | null>(null);
  const isInComparison = comparedCars.some((c) => c.id === car.id);
  const isEv = car.engine.fuelType === 'electric';
  const isHydrogen = car.engine.fuelType === 'hydrogen';
  const isAltPowertrain = isEv || isHydrogen;
  const variantLabel = displayListingSubtitle(car);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleComparison = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInComparison) {
      removeCarFromComparison(car.id);
      setToast('Removed from compare');
      return;
    }
    const res = addOrReplaceOldestInComparison(car);
    if (!res.ok) {
      setToast(res.message);
      return;
    }
    if (res.swappedOut) {
      setToast(
        `Replaced ${res.swappedOut.year} ${res.swappedOut.make} ${displayModelLabel(res.swappedOut)}`,
      );
      return;
    }
    setToast('Added to compare');
  };

  const mpgLabel = usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG';
  const mpgValue = formatMpgForCard(car.fuelEconomy.combined);
  const engineValue = formatEngineDetailForCard(car.engine);
  const rangeValue = formatRangeForCard(car.epa?.rangeMiles);
  const priceShort = formatPriceShort(car.price?.msrp, false);
  const transLabel = car.transmission?.type ? formatTransmissionLabel(car.transmission) : null;
  const hasMpg = mpgValue && mpgValue !== 'Not on file';
  const hasPrice = priceShort && priceShort !== 'Not on file';
  const hasRange = rangeValue && rangeValue !== 'Not on file';
  const safety = car.safetyRating?.overall;

  const metaParts: string[] = [];
  if (engineValue && engineValue !== 'Not on file') metaParts.push(engineValue);
  if (!isAltPowertrain && transLabel && !variantLabel) metaParts.push(transLabel);
  if (car.driveType) metaParts.push(car.driveType);
  if (car.engine.fuelType) metaParts.push(formatFuelBadge(car.engine.fuelType));

  return (
    <article className="surface-card-hover group relative flex flex-col h-full overflow-hidden focus-within:border-zinc-400 focus-within:ring-1 focus-within:ring-white/10">
      <StatusToast message={toast} />

      <div className="h-[4.5rem] sm:h-20 border-b border-zinc-900 overflow-hidden">
        <VehiclePlaceholder car={car} compact hideCaption />
      </div>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            {car.year} {car.make}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {car.bodyStyle && <span className="spec-chip capitalize">{car.bodyStyle}</span>}
            {safety != null && safety > 0 && (
              <span className="spec-chip text-amber-200/90 border-amber-800/50">
                {'★'.repeat(safety)}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2">
          <Link
            to={`/car/${car.id}`}
            className="after:absolute after:inset-0 focus:outline-none hover:underline underline-offset-2 decoration-zinc-600"
          >
            {displayModelLabel(car)}
          </Link>
        </h3>
        {variantLabel && <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{variantLabel}</p>}

        <div className="grid grid-cols-2 gap-px bg-zinc-900 border border-zinc-900 mt-2.5">
          <div className="bg-black px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-widest text-zinc-600">
              {isAltPowertrain && hasRange ? 'Range' : mpgLabel}
            </p>
            <p className="text-lg font-bold tabular-nums text-white leading-tight">
              {isAltPowertrain && hasRange ? rangeValue : hasMpg ? mpgValue : '—'}
            </p>
          </div>
          <div className="bg-black px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-widest text-zinc-600">Est. CAD</p>
            <p className="text-lg font-bold tabular-nums text-white leading-tight truncate">
              {hasPrice ? (car.price?.isEstimated !== false ? `~${priceShort}` : priceShort) : '—'}
            </p>
          </div>
        </div>

        {metaParts.length > 0 && (
          <p className="text-[11px] text-zinc-600 mt-2 leading-snug line-clamp-1">
            {metaParts.join(' · ')}
          </p>
        )}

        {showCompare && (
          <div className="mt-auto pt-3 flex items-center justify-between gap-2 relative z-10">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">
              Dossier →
            </span>
            <button
              type="button"
              onClick={toggleComparison}
              className={`text-[10px] uppercase tracking-widest px-2.5 py-1.5 border transition-colors ${
                isInComparison
                  ? 'border-white text-white'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-400 hover:text-white'
              }`}
            >
              {isInComparison ? 'In compare' : '+ Compare'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
