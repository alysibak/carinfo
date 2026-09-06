import type { CarSpecs } from '../types/car.types';
import { getBodySilhouettePath, getBodyTypeImage, getMakeAccentColor } from '../utils/carImages';
import { displayModelLabel } from '../utils/trimLabel';

interface VehiclePlaceholderProps {
  car: Pick<CarSpecs, 'make' | 'model' | 'year' | 'bodyStyle' | 'trim' | 'engine'>;
  compact?: boolean;
  className?: string;
  /** Hide the bottom identity overlay (used when card shows identity below). */
  hideCaption?: boolean;
}

/** Body-type silhouette placeholder — no visible "no photo" text. */
export default function VehiclePlaceholder({
  car,
  compact = false,
  className = '',
  hideCaption = false,
}: VehiclePlaceholderProps) {
  const accent = getMakeAccentColor(car.make);
  const silhouette = getBodySilhouettePath(car.bodyStyle);
  const bodyTypeImg = getBodyTypeImage(car.bodyStyle);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-zinc-900 to-black ${className}`}
      role="img"
      aria-label={`${car.year} ${car.make} ${displayModelLabel(car)}, illustration placeholder`}
    >
      <div
        className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-70"
        style={{
          background: `radial-gradient(ellipse at 50% 68%, #${accent}88 0%, transparent 62%)`,
          opacity: 0.55,
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)' }}
      />
      {bodyTypeImg ? (
        <img
          src={bodyTypeImg}
          alt=""
          aria-hidden
          className={`absolute left-0 right-0 mx-auto w-full max-w-[96%] object-contain pointer-events-none transition-transform duration-500 ease-out group-hover:scale-105 ${
            compact ? 'top-[4%] h-[70%]' : 'top-[6%] h-[72%]'
          }`}
        />
      ) : (
        <svg
          viewBox="0 0 400 120"
          className={`relative w-[88%] max-w-md text-zinc-600 ${compact ? 'opacity-50' : 'opacity-60'}`}
          aria-hidden
        >
          <path d={silhouette} fill="currentColor" stroke="#52525b" strokeWidth="1" />
        </svg>
      )}
      {!hideCaption && !compact && (
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/75 to-transparent">
          <p className="text-[10px] tracking-widest text-zinc-400 uppercase">{car.year}</p>
          <p className="text-sm font-bold text-white truncate">
            {car.make} {displayModelLabel(car)}
          </p>
          <p className="text-[9px] tracking-wider text-zinc-400 mt-1 uppercase">Body-type illustration</p>
        </div>
      )}
    </div>
  );
}
