import type { CarSpecs } from '../types/car.types';
import { getBodySilhouettePath, getBodyTypeImage } from '../utils/carImages';
import { displayModelLabel } from '../utils/trimLabel';

interface VehiclePlaceholderProps {
  car: Pick<CarSpecs, 'make' | 'model' | 'year' | 'bodyStyle' | 'trim' | 'engine'>;
  compact?: boolean;
  className?: string;
  /** Hide the bottom identity overlay (used when card shows identity below). */
  hideCaption?: boolean;
}

/**
 * The body's outline in quiet grey, alike for every car of a body: no brand
 * colour behind it, so a page of them reads as one design.
 */
export default function VehiclePlaceholder({
  car,
  compact = false,
  className = '',
  hideCaption = false,
}: VehiclePlaceholderProps) {
  const silhouette = getBodySilhouettePath(car.bodyStyle);
  const bodyTypeImg = getBodyTypeImage(car.bodyStyle);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950 ${className}`}
      role="img"
      aria-label={`${car.year} ${car.make} ${displayModelLabel(car)}, illustration placeholder`}
    >
      {bodyTypeImg ? (
        <img
          src={bodyTypeImg}
          alt=""
          aria-hidden
          className={`absolute inset-x-[2%] object-contain pointer-events-none opacity-60 ${
            compact ? 'top-[8%] h-[84%]' : 'top-[6%] h-[72%]'
          }`}
        />
      ) : (
        <svg
          viewBox="0 0 400 120"
          className={`relative w-[92%] max-w-md text-zinc-600 ${compact ? 'opacity-55' : 'opacity-60'}`}
          aria-hidden
        >
          <path d={silhouette} fill="currentColor" stroke="#52525b" strokeWidth="1" />
        </svg>
      )}
      {!hideCaption && !compact && (
        <div className="absolute inset-x-0 bottom-0 p-5 bg-linear-to-t from-black via-black/75 to-transparent">
          <p className="text-xs text-zinc-400">{car.year}</p>
          <p className="text-sm font-bold text-white truncate">
            {car.make} {displayModelLabel(car)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">Body-type illustration</p>
        </div>
      )}
    </div>
  );
}
