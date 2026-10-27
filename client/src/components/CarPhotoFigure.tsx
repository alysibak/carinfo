import type { CarSpecs } from '../types/car.types';
import CarImage from './CarImage';
import CarPhotoButton from './CarPhotoButton';
import PhotoGlow from './PhotoGlow';
import { PAGE_PHOTO_SIZES } from '../utils/carImages';
import { displayModelLabel } from '../utils/trimLabel';

type FigureCar = Pick<
  CarSpecs,
  'make' | 'model' | 'year' | 'bodyStyle' | 'trim' | 'engine' | 'variant' | 'photo'
>;

/**
 * The car's photo at the head of its page, opening larger, with what it is:
 * a car of this model year, or of another year of the generation, said
 * plainly where Commons has none of this one. Its author and licence below.
 */
export default function CarPhotoFigure({ car, glow = false }: { car: FigureCar; glow?: boolean }) {
  const other = car.photo?.otherYear;
  const name = `${car.make} ${displayModelLabel(car)}`;
  return (
    <figure className="min-w-0">
      <div className="relative isolate">
        {/* A halo of the photo's own colours around it. */}
        {glow && (
          <PhotoGlow
            photo={car.photo}
            // The blur on the frame itself, so the halo's edges melt too.
            className="absolute -inset-3 -z-10 opacity-70 blur-2xl saturate-150"
          />
        )}
        <div
          className={`aspect-3/2 overflow-hidden border ${
            glow ? 'border-white/10 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95)]' : 'border-zinc-900'
          }`}
        >
          <CarPhotoButton car={car} variant="tile" mark="Larger" focusable>
            <CarImage car={car} eager markYear={false} sizes={PAGE_PHOTO_SIZES} />
          </CarPhotoButton>
        </div>
      </div>
      <figcaption className="mt-1.5 text-xs text-zinc-400 leading-snug">
        {other ? (
          <>
            <span className="text-amber-200/90">
              A {other.year} {name}, not a {car.year}:
            </span>{' '}
            no photo of a {car.year} is on file. The same generation ({other.generation[0]}–
            {other.generation[1]}).
          </>
        ) : (
          <>
            A {car.year} {name}; trim and colour may differ.
          </>
        )}{' '}
        <span className="text-zinc-500">Photo: {car.photo?.credit}</span>
      </figcaption>
    </figure>
  );
}
