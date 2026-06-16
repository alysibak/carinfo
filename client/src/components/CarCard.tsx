import { useNavigate } from 'react-router-dom';
import type { CarSpecs } from '../types/car.types';
import { useCarStore } from '../stores/carStore';
import TrustLabel from './ui';
import { displayListingSubtitle, formatTransmissionLabel } from '../utils/trimLabel';
import {
  formatEngineDetailForCard,
  formatMpgForCard,
  formatPowerForCard,
  formatPriceShort,
  formatRangeForCard,
  hasNumericValue,
  unavailableClass,
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
  const transmissionLabel = car.transmission?.type
    ? formatTransmissionLabel(car.transmission, car.trim)
    : null;

  const toggleComparison = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInComparison) removeCarFromComparison(car.id);
    else addCarToComparison(car);
  };

  const mpgLabel = usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG';
  const mpgValue = formatMpgForCard(car.fuelEconomy.combined);
  const engineValue = formatEngineDetailForCard(car.engine);
  const powerProvenance = car.provenance?.['engine.horsepower'];
  const powerValue = formatPowerForCard(car.engine.horsepower, {
    fuelType: car.engine.fuelType,
    powerProvenance,
  });
  const rangeValue = formatRangeForCard(car.epa?.rangeMiles);
  const hasPower = hasNumericValue(car.engine.horsepower);
  const priceValue = formatPriceShort(car.price?.msrp, car.price?.isEstimated);

  return (
    <article
      onClick={() => navigate(`/car/${car.id}`)}
      className="surface-card-hover cursor-pointer group flex flex-col h-full overflow-hidden"
    >
      <div className="aspect-[16/10] border-b border-zinc-900">
        <VehiclePlaceholder car={car} compact />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.15em] text-zinc-500 uppercase mb-1.5">
              {car.year} {car.make}
            </p>
            <h3 className="text-xl font-semibold text-white leading-snug line-clamp-2 group-hover:text-white">
              {car.model}
            </h3>
            {variantLabel && (
              <p className="text-sm font-medium text-zinc-300 mt-1 truncate">{variantLabel}</p>
            )}
          </div>
          {car.bodyStyle && (
            <span className="shrink-0 text-xs font-medium capitalize px-2 py-1 rounded-md bg-zinc-800 text-zinc-300">
              {car.bodyStyle}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4 text-sm">
          <div>
            <dt className="label-sm">Power</dt>
            <dd className={unavailableClass(powerValue, hasPower ? 'font-semibold text-white mt-0.5' : undefined)}>
              {powerValue}
            </dd>
          </div>
          <div>
            <dt className="label-sm">{isAltPowertrain ? 'Range' : mpgLabel}</dt>
            <dd className={unavailableClass(isAltPowertrain ? rangeValue : mpgValue)}>
              {isAltPowertrain ? rangeValue : mpgValue}
            </dd>
          </div>
          <div>
            <dt className="label-sm">{isAltPowertrain ? mpgLabel : 'Engine'}</dt>
            <dd className={unavailableClass(isAltPowertrain ? mpgValue : engineValue)}>
              {isAltPowertrain ? mpgValue : engineValue}
            </dd>
          </div>
          <div>
            <dt className="label-sm">{isAltPowertrain ? 'Engine' : 'Trans'}</dt>
            <dd className={
              isAltPowertrain
                ? unavailableClass(engineValue)
                : transmissionLabel
                  ? 'font-semibold text-white mt-0.5'
                  : unavailableClass('—')
            }>
              {isAltPowertrain ? engineValue : transmissionLabel ?? '—'}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {car.engine.fuelType && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 capitalize">
              {formatFuelBadge(car.engine.fuelType)}
            </span>
          )}
          {car.driveType && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
              {car.driveType}
            </span>
          )}
          {powerProvenance === 'estimated' && hasPower && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-500 border border-zinc-800">
              Mfr. power est.
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-zinc-800/80 space-y-3">
          <div className="flex items-start justify-between gap-2 text-xs">
            <div className="space-y-1">
              <span className="text-zinc-500 flex items-center gap-1.5 flex-wrap">
                Est. value
                {car.price?.isEstimated && <TrustLabel estimated className="!text-[8px] !px-1" />}
                <span className={unavailableClass(priceValue, 'font-medium text-zinc-300')}>{priceValue}</span>
              </span>
            </div>
            <span className="font-medium text-zinc-500 group-hover:text-white transition-colors shrink-0">
              View details →
            </span>
          </div>
          {showCompare && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleComparison}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                  isInComparison
                    ? 'border-red-900/80 text-red-400 bg-red-950/30'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
                }`}
              >
                {isInComparison ? 'In compare' : 'Compare'}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
