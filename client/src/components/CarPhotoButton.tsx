import { type ReactNode, useRef, useState } from 'react';
import type { CarSpecs } from '../types/car.types';
import { carPhotoSources } from '../utils/carImages';
import { displayVehicleTitle } from '../utils/trimLabel';
import { Modal } from './ui';

type PhotoCar = Pick<CarSpecs, 'year' | 'make' | 'model' | 'trim' | 'engine' | 'variant' | 'photo'>;

interface CarPhotoButtonProps {
  car: PhotoCar;
  /** "See photo" on the car page; "Photo" in Compare's narrow columns. */
  label?: string;
  className?: string;
  /**
   * "tile" makes its children (the car's illustration) open the photo, with a
   * small "Photo" mark on them; without a photo they show as they are.
   */
  variant?: 'button' | 'tile';
  /** The tile's mark: "Photo" on an illustration, "Larger" on the photo itself. */
  mark?: string;
  /** The tile is the only way to the photo, so the keyboard reaches it too. */
  focusable?: boolean;
  children?: ReactNode;
}

const CAMERA = (
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
);

/**
 * The car's photo, larger, with what it shows and whose it is: a photo of its
 * model year, or of another year of its generation where Commons has none of
 * its own. As a button ("See photo") or on the picture itself (a tile). The
 * larger copy is fetched when the button is pointed at or focused.
 */
export default function CarPhotoButton({
  car,
  label = 'See photo',
  className = '',
  variant = 'button',
  mark = 'Photo',
  focusable = false,
  children,
}: CarPhotoButtonProps) {
  const [open, setOpen] = useState(false);
  const preloaded = useRef(false);
  const sources = carPhotoSources(car.photo);
  if (!car.photo || sources.length === 0) return variant === 'tile' ? <>{children}</> : null;

  // Pointing at the button starts the download, so the photo is there on click.
  const preload = () => {
    if (preloaded.current) return;
    preloaded.current = true;
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = sources[0];
  };

  const trigger =
    variant === 'tile' ? (
      // Unless it is the only way there, the keyboard reaches the photo by its button.
      <button
        type="button"
        tabIndex={focusable ? 0 : -1}
        aria-label={`Open the photo of the ${displayVehicleTitle(car)}, larger`}
        onClick={() => setOpen(true)}
        onPointerEnter={preload}
        onFocus={preload}
        className={`group relative block w-full h-full cursor-zoom-in focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${className}`}
      >
        {children}
        <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 bg-zinc-950/85 border border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-200 group-hover:border-zinc-400 group-hover:text-white transition-colors">
          {CAMERA}
          {mark}
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={preload}
        onFocus={preload}
        className={`inline-flex items-center gap-1.5 border border-zinc-700 px-3 text-zinc-200 hover:border-zinc-400 hover:text-white transition-colors ${className}`}
      >
        {CAMERA}
        {label}
      </button>
    );

  return (
    <>
      {trigger}
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
              alt={`Photo: ${photo.caption}`}
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
        <p className="text-white">{photo.caption}</p>
        {photo.generation && <p className="text-zinc-400">{photo.generation}</p>}
        {photo.otherYear ? (
          <p className="text-xs text-amber-200/90 leading-relaxed">
            A photo of a {photo.otherYear.year} model, not this model year: none of this year is on
            file. It is the same generation ({photo.otherYear.generation[0]}–
            {photo.otherYear.generation[1]}), but lights, bumpers and trim can change within one.
          </p>
        ) : (
          <p className="text-xs text-zinc-500 leading-relaxed">
            A photo of this model year. Trim, colour and options may differ from this car.
          </p>
        )}
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
