import { useNavigate } from 'react-router-dom';
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

interface CarCardProps {
  car: CarSpecs;
  showCompare?: boolean;
}

export default function CarCard({ car, showCompare = true }: CarCardProps) {
  const { comparedCars, addCarToComparison, removeCarFromComparison } = useCarStore();
  const isInComparison = comparedCars.some((c) => c.id === car.id);
  const navigate = useNavigate();
  const isEv = car.engine.fuelType === 'electric';
  const isHydrogen = car.engine.fuelType === 'hydrogen';
  const isAltPowertrain = isEv || isHydrogen;
  const variantLabel = displayListingSubtitle(car);

  const toggleComparison = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInComparison) removeCarFromComparison(car.id);
    else addCarToComparison(car);
  };

  const mpgLabel = usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG';
  const mpgValue = formatMpgForCard(car.fuelEconomy.combined);
  const engineValue = formatEngineDetailForCard(car.engine);
  const rangeValue = formatRangeForCard(car.epa?.rangeMiles);
  const priceShort = formatPriceShort(car.price?.msrp, false);
  const transLabel = car.transmission?.type ? formatTransmissionLabel(car.transmission) : null;

  const specParts: string[] = [];
  if (isAltPowertrain) {
    if (rangeValue && rangeValue !== 'Not on file') specParts.push(rangeValue);
    if (mpgValue && mpgValue !== 'Not on file') specParts.push(`${mpgValue} ${mpgLabel}`);
    if (engineValue && engineValue !== 'Not on file') specParts.push(engineValue);
  } else {
    if (engineValue && engineValue !== 'Not on file') specParts.push(engineValue);
    if (transLabel && !variantLabel) specParts.push(transLabel);
    if (car.driveType) specParts.push(car.driveType);
    if (car.engine.fuelType) specParts.push(formatFuelBadge(car.engine.fuelType));
  }
  if (priceShort && priceShort !== 'Not on file') {
    specParts.push(car.price?.isEstimated ? `~${priceShort} CAD` : priceShort);
  }

  const primarySpec =
    !isAltPowertrain && mpgValue && mpgValue !== 'Not on file'
      ? `${mpgValue} ${mpgLabel}`
      : isAltPowertrain && rangeValue && rangeValue !== 'Not on file'
        ? rangeValue
        : null;

  return (
    <article
      onClick={() => navigate(`/car/${car.id}`)}
      className="surface-card-hover cursor-pointer group flex flex-col h-full overflow-hidden rounded-none"
    >
      <div className="aspect-[16/10] border-b border-zinc-800 rounded-none overflow-hidden">
        <VehiclePlaceholder car={car} compact hideCaption />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1">{car.make}</p>
        <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
          {car.year} {displayModelLabel(car)}
        </h3>
        {variantLabel && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{variantLabel}</p>
        )}

        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
          {specParts.map((part, i) => (
            <span key={`${part}-${i}`}>
              {i > 0 && <span className="text-zinc-700"> · </span>}
              {part === primarySpec ? (
                <span className="text-sm font-bold tabular-nums text-white">{part}</span>
              ) : (
                part
              )}
            </span>
          ))}
        </p>

        {showCompare && (
          <div className="mt-auto pt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              onClick={toggleComparison}
              className={`text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors rounded-none ${
                isInComparison
                  ? 'border-zinc-500 text-white'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-white'
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
