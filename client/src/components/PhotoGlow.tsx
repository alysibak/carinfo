import type { CarSpecs } from '../types/car.types';
import { PAGE_PHOTO_SIZES, photoImageAttributes } from '../utils/carImages';

/**
 * The car's own photo as light: drawn again behind it, blurred past
 * recognition, so the page around a car takes its colours. The same copy as
 * the photo on the page, so nothing more is downloaded. Decoration only.
 */
export default function PhotoGlow({
  photo,
  className = '',
  imageClassName = '',
}: {
  photo: CarSpecs['photo'];
  /** Where the light sits and how strong it is. */
  className?: string;
  /** How far it is blurred and scaled. */
  imageClassName?: string;
}) {
  const image = photoImageAttributes(photo, PAGE_PHOTO_SIZES);
  if (!image) return null;
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={image.sizes}
        alt=""
        referrerPolicy="no-referrer"
        decoding="async"
        className={`w-full h-full object-cover ${imageClassName}`}
      />
    </div>
  );
}
