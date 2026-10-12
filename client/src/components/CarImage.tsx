import { useState } from 'react';
import type { CarSpecs } from '../types/car.types';
import { carPhotoSources, type CarPhotoWidth } from '../utils/carImages';
import { displayModelLabel } from '../utils/trimLabel';
import VehiclePlaceholder from './VehiclePlaceholder';

interface CarImageProps {
  car: Pick<CarSpecs, 'make' | 'model' | 'year' | 'bodyStyle' | 'trim' | 'engine' | 'photo'>;
  compact?: boolean;
  className?: string;
  hideCaption?: boolean;
  /** The photo's width to ask for: 256 for thumbnails, 640 for larger. */
  width?: CarPhotoWidth;
  /** Credit NHTSA on the photo itself (where it is large enough to read). */
  credit?: boolean;
}

/**
 * NHTSA's photo of the car (the one it crash-tested, of the same model year),
 * else the body-type illustration. A photo that fails to load moves on to the
 * next source, then to the illustration.
 */
export default function CarImage({
  car,
  width = 256,
  credit = false,
  className = '',
  ...placeholder
}: CarImageProps) {
  const sources = carPhotoSources(car, width);
  // Keyed by source, so a different car starts again from its first.
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const src = sources.find((s) => !failed.has(s));

  if (!src || !car.photo) {
    return <VehiclePlaceholder car={car} className={className} {...placeholder} />;
  }

  const name = `${car.year} ${car.make} ${displayModelLabel(car)}`;
  return (
    <div className={`relative w-full h-full overflow-hidden bg-zinc-900 ${className}`}>
      <img
        key={src}
        src={src}
        alt={`${name}, photographed by NHTSA`}
        title={`NHTSA's photo of the car it tested: ${car.photo.caption}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed((prev) => new Set(prev).add(src))}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {credit && (
        <span className="absolute bottom-0 right-0 bg-black/70 px-1.5 py-0.5 text-[10px] leading-none text-zinc-300">
          Photo: NHTSA
        </span>
      )}
    </div>
  );
}
