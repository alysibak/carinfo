import { useState } from 'react';
import type { CarSpecs } from '../types/car.types';
import { carPhotoSources, type CarPhotoSize } from '../utils/carImages';
import VehiclePlaceholder from './VehiclePlaceholder';

interface CarImageProps {
  car: Pick<CarSpecs, 'make' | 'model' | 'year' | 'bodyStyle' | 'trim' | 'engine' | 'photo'>;
  compact?: boolean;
  className?: string;
  hideCaption?: boolean;
  /** The photo's copy to load: thumb for cards, large for the car page. */
  size?: CarPhotoSize;
  /** Credit the photographer on the photo, linked to its page (where it is large enough). */
  credit?: boolean;
}

/**
 * A photo of the car's generation from Wikimedia Commons, else the body-type
 * illustration. A photo that fails to load tries its other copy, then gives
 * way to the illustration.
 */
export default function CarImage({
  car,
  size = 'thumb',
  credit = false,
  className = '',
  ...placeholder
}: CarImageProps) {
  const photo = car.photo;
  const sources = carPhotoSources(car, size);
  // Keyed by source, so a different car starts again from its first.
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const src = sources.find((s) => !failed.has(s));

  if (!src || !photo) {
    return <VehiclePlaceholder car={car} className={className} {...placeholder} />;
  }

  const shows = photo.caption ? `${photo.generation}: ${photo.caption}` : photo.generation;
  return (
    <div className={`relative w-full h-full overflow-hidden bg-zinc-900 ${className}`}>
      <img
        key={src}
        src={src}
        alt={`Photo of the ${shows}`}
        title={`${shows}. Photo: ${photo.credit}, via Wikimedia Commons`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed((prev) => new Set(prev).add(src))}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {credit && photo.page.startsWith('https://commons.wikimedia.org/') && (
        <a
          href={photo.page}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1.5 py-0.5 text-[10px] leading-snug text-zinc-300 hover:text-white"
        >
          Photo: {photo.credit}
        </a>
      )}
    </div>
  );
}
