import type { CarSpecs } from '../types/car.types';
import { getBodySilhouettePath, getBodyTypeImage, getMakeAccentColor } from '../utils/carImages';

interface VehiclePlaceholderProps {
  car: Pick<CarSpecs, 'make' | 'model' | 'year' | 'bodyStyle'>;
  compact?: boolean;
  className?: string;
}

/** Local placeholder — body-type artwork when available, SVG fallback otherwise. */
export default function VehiclePlaceholder({ car, compact = false, className = '' }: VehiclePlaceholderProps) {
  const accent = getMakeAccentColor(car.make);
  const silhouette = getBodySilhouettePath(car.bodyStyle);
  const bodyTypeImg = getBodyTypeImage(car.bodyStyle);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-zinc-900 to-black ${className}`}
      role="img"
      aria-label={`${car.year} ${car.make} ${car.model} — illustration placeholder`}
    >
      {/* Brand-accent glow + vignette for depth instead of a flat empty box. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 68%, #${accent}66 0%, transparent 60%)`,
          opacity: 0.4,
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
          className={`absolute left-0 right-0 mx-auto w-full max-w-[92%] object-contain pointer-events-none ${
            compact ? 'top-[6%] h-[58%]' : 'top-[8%] h-[62%]'
          }`}
        />
      ) : (
        <svg
          viewBox="0 0 400 120"
          className={`relative w-[88%] max-w-md text-zinc-500 drop-shadow-2xl ${compact ? 'opacity-60' : 'opacity-70'}`}
          aria-hidden
        >
          <path d={silhouette} fill="currentColor" stroke="#a1a1aa" strokeWidth="1" />
        </svg>
      )}
      <div
        className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black via-black/75 to-transparent ${
          compact ? 'p-3' : 'p-5'
        }`}
      >
        <div className="min-w-0">
          <p className={`tracking-widest text-zinc-400 uppercase ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            {car.year}
          </p>
          <p className={`font-bold text-white truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {car.make} {car.model}
          </p>
        </div>
        <span
          className={`shrink-0 tracking-[0.2em] text-zinc-500 uppercase border border-zinc-700/60 rounded px-1.5 py-0.5 ${
            compact ? 'text-[7px]' : 'text-[8px]'
          }`}
        >
          No photo
        </span>
      </div>
    </div>
  );
}
