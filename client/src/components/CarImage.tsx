import { useState } from 'react';
import type { CarSpecs } from '../types/car.types';
import { photoImageAttributes } from '../utils/carImages';
import VehiclePlaceholder from './VehiclePlaceholder';

type ImageCar = Pick<
  CarSpecs,
  'make' | 'model' | 'year' | 'bodyStyle' | 'trim' | 'engine' | 'variant' | 'photo'
>;

/** "2019 photo" on a photo of another model year of the car's generation. */
function otherYearLabel(photo: CarSpecs['photo']): string | null {
  return photo?.otherYear ? `${photo.otherYear.year} photo` : null;
}

/**
 * The car's photo where Commons has one, else its body-type illustration,
 * filling its frame. A photo of another model year is marked with its year.
 * Lazy by default: a page of results loads the photos it scrolls to.
 */
export default function CarImage({
  car,
  compact = false,
  eager = false,
  sizes = '(min-width: 768px) 360px, 100vw',
  markYear = true,
}: {
  car: ImageCar;
  compact?: boolean;
  /** The car page's photo, which is in view on arrival. */
  eager?: boolean;
  sizes?: string;
  /** Mark a photo of another year with it; off where the frame is too small to read. */
  markYear?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const image = photoImageAttributes(car.photo, sizes);
  if (!car.photo || !image || failed) {
    return <VehiclePlaceholder car={car} compact={compact} hideCaption />;
  }
  const year = markYear ? otherYearLabel(car.photo) : null;
  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-950">
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={image.sizes}
        alt=""
        title={`Photo: ${car.photo.credit}, via Wikimedia Commons`}
        referrerPolicy="no-referrer"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
      {year && (
        <span
          className={`absolute bg-black/80 border border-zinc-700 text-zinc-200 tabular-nums ${
            compact
              ? 'left-0.5 bottom-0.5 px-1 text-[10px] leading-tight'
              : 'left-1.5 bottom-1.5 px-1.5 py-px text-[11px]'
          }`}
        >
          {year}
        </span>
      )}
    </div>
  );
}
