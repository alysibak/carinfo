import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import CarCard from './CarCard';

/** "Keep exploring" rail of cross-shopped vehicles, shown at the foot of a car page. */
export default function SimilarCars({ carId }: { carId: string }) {
  const [cars, setCars] = useState<CarSpecs[] | null>(null);

  useEffect(() => {
    let active = true;
    setCars(null);
    api
      .getSimilarCars(carId, 6)
      .then((results) => {
        if (active) setCars(results);
      })
      .catch(() => {
        if (active) setCars([]);
      });
    return () => {
      active = false;
    };
  }, [carId]);

  // Hide the section entirely when there is nothing relevant to show.
  if (cars && cars.length === 0) return null;

  return (
    <section id="similar" className="border-t border-zinc-900 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase mb-2">Keep exploring</p>
        <h2 className="text-xl md:text-2xl font-black tracking-tight mb-6">Cross-shopped alternatives</h2>

        {cars == null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="surface-card aspect-[16/10] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
