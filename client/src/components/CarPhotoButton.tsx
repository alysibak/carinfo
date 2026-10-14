import { useRef, useState } from 'react';
import type { CarSpecs } from '../types/car.types';
import { carPhotoSources, photoYearsLabel } from '../utils/carImages';
import { displayVehicleTitle } from '../utils/trimLabel';
import { Modal } from './ui';

type PhotoCar = Pick<CarSpecs, 'year' | 'make' | 'model' | 'trim' | 'engine' | 'variant' | 'photo'>;

interface CarPhotoButtonProps {
  car: PhotoCar;
  /** "See photo" on the car page; "Photo" in Compare's narrow columns. */
  label?: string;
  className?: string;
}

/**
 * A photo of the car's generation, on request. The site shows the same
 * body-type illustration for every car, so its pages look alike whether or
 * not Wikipedia has a photo; where it does, this button opens it. Nothing is
 * downloaded until the button is pointed at or focused.
 */
export default function CarPhotoButton({
  car,
  label = 'See photo',
  className = '',
}: CarPhotoButtonProps) {
  const [open, setOpen] = useState(false);
  const preloaded = useRef(false);
  const sources = carPhotoSources(car.photo);
  if (!car.photo || sources.length === 0) return null;

  // Pointing at the button starts the download, so the photo is there on click.
  const preload = () => {
    if (preloaded.current) return;
    preloaded.current = true;
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = sources[0];
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={preload}
        onFocus={preload}
        className={`inline-flex items-center gap-1.5 text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-zinc-300 transition-colors ${className}`}
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.4l1.5-2h7.2l1.5 2h2.4A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"
          />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={displayVehicleTitle(car)}>
        <PhotoViewer photo={car.photo} sources={sources} />
      </Modal>
    </>
  );
}

function PhotoViewer({
  photo,
  sources,
}: {
  photo: NonNullable<CarSpecs['photo']>;
  sources: string[];
}) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[index];
  const years = photoYearsLabel(photo.years);

  return (
    <figure>
      <div className="relative aspect-4/3 bg-zinc-950 border border-zinc-900 flex items-center justify-center overflow-hidden">
        {src ? (
          <>
            {!loaded && (
              <div
                role="status"
                className="absolute inset-0 flex items-center justify-center"
                aria-live="polite"
              >
                <div
                  className="w-8 h-8 border-2 border-zinc-800 border-t-zinc-500 animate-spin"
                  aria-hidden
                />
                <span className="sr-only">Loading the photo</span>
              </div>
            )}
            <img
              key={src}
              src={src}
              alt={`Photo of the ${photo.generation}`}
              referrerPolicy="no-referrer"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => {
                setLoaded(false);
                setIndex((i) => i + 1);
              }}
              className={`w-full h-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <p className="p-6 text-sm text-zinc-400 text-center">
            The photo did not load.{' '}
            <a
              href={photo.page}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline underline-offset-4"
            >
              See it on Wikimedia Commons
            </a>
            .
          </p>
        )}
      </div>
      <figcaption className="mt-4 space-y-2 text-sm">
        <p className="text-white">
          {photo.generation}
          {years && <span className="text-zinc-400"> · {years}</span>}
        </p>
        {photo.caption && <p className="text-zinc-400">{photo.caption}</p>}
        <p className="text-xs text-zinc-500 leading-relaxed">
          A photo of this generation, not of this exact car: trim, colour and options may differ.
        </p>
        <p className="text-xs text-zinc-500">
          Photo:{' '}
          <a
            href={photo.page}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 hover:text-white underline underline-offset-4"
          >
            {photo.credit}
          </a>
          , via Wikimedia Commons
        </p>
      </figcaption>
    </figure>
  );
}
