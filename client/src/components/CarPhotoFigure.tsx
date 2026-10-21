import type { CarSpecs } from '../types/car.types';
import CarImage from './CarImage';
import CarPhotoButton from './CarPhotoButton';
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
export default function CarPhotoFigure({ car }: { car: FigureCar }) {
  const other = car.photo?.otherYear;
  const name = `${car.make} ${displayModelLabel(car)}`;
  return (
    <figure className="min-w-0">
      <div className="aspect-3/2 overflow-hidden border border-zinc-900">
        <CarPhotoButton car={car} variant="tile" mark="Larger" focusable>
          <CarImage
            car={car}
            eager
            markYear={false}
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 240px, 100vw"
          />
        </CarPhotoButton>
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
