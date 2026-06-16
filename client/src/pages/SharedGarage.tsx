import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { useGarageStore } from '../stores/garageStore';
import { cardStatClass, formatEngineForCard, formatMpgForCard, formatPriceShort } from '../utils/dataValue';

export default function SharedGarage() {
  const [searchParams] = useSearchParams();
  const [cars, setCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const mergeIntoGarage = useGarageStore((s) => s.mergeMany);

  useEffect(() => {
    const raw = searchParams.get('cars') || '';
    const ids = raw.split(',').map(id => id.trim()).filter(Boolean);

    if (ids.length === 0) {
      setError('This shared garage link is empty or invalid.');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await api.compareCars(ids);
        if (!results || results.length === 0) {
          setError('No matching vehicles were found for this shared garage.');
          setCars([]);
        } else {
          setCars(results);
        }
      } catch (e) {
        console.error('Failed to load shared garage cars:', e);
        setError('Unable to load this shared garage right now.');
        setCars([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [searchParams]);

  const saveAllToLocalGarage = () => {
    if (cars.length === 0) {
      alert('There are no vehicles to save from this shared garage.');
      return;
    }
    try {
      mergeIntoGarage(cars);
      alert('Saved these cars to your Dream Garage.');
      navigate('/garage');
    } catch (e) {
      console.error('Failed to save shared garage to local store:', e);
      alert('Could not save these cars to your Dream Garage.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-xs tracking-[0.3em] text-zinc-300 uppercase">Loading Garage</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center px-6">
          <h2 className="text-3xl font-black tracking-tighter mb-3">SHARED GARAGE UNAVAILABLE</h2>
          <p className="text-sm tracking-widest text-zinc-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>BACK TO HOME</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black border-b border-zinc-900">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span>HOME</span>
            </Link>

            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                SHARED GARAGE
              </h1>
              <p className="text-xs tracking-[0.3em] text-zinc-300 mt-1">
                {cars.length} VEHICLE{cars.length !== 1 ? 'S' : ''}
              </p>
            </div>

            <button
              onClick={saveAllToLocalGarage}
              className="text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors"
            >
              SAVE TO MY GARAGE
            </button>
          </div>
        </div>
      </div>

      <div className="pt-8 pb-16 px-8">
        {cars.length === 0 ? (
          <div className="max-w-4xl mx-auto text-center py-32">
            <h2 className="text-3xl font-black tracking-tighter mb-4">
              NO VEHICLES IN THIS GARAGE
            </h2>
            <p className="text-lg tracking-wider text-zinc-600 mb-8">
              This shared garage link does not contain any vehicles.
            </p>
            <Link
              to="/"
              className="inline-block bg-white text-black px-8 py-4 font-black tracking-widest text-sm hover:bg-zinc-300 transition-all"
            >
              BROWSE CARS
            </Link>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
              {cars.map((car, index) => (
                <div
                  key={car.id}
                  className="bg-black p-8 hover:bg-zinc-950 transition-all duration-300 border border-zinc-900 hover:border-zinc-700 group relative"
                >
                  {/* Position Badge */}
                  <div className="absolute top-4 left-4 w-10 h-10 bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    <span className="text-lg font-black text-zinc-300">#{index + 1}</span>
                  </div>

                  {/* Year */}
                  <div className="mb-4 mt-12">
                    <p className="text-5xl font-black text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      {car.year}
                    </p>
                  </div>

                  {/* Make & Model */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-black tracking-tight mb-1 group-hover:tracking-wide transition-all">
                      {car.make.toUpperCase()}
                    </h3>
                    <p className="text-lg font-light tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">
                      {car.model}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-zinc-900 group-hover:bg-zinc-700 transition-colors mb-6" />

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">Engine</p>
                      <p className={cardStatClass(formatEngineForCard(car.engine.fuelType, car.engine.displacement))}>
                        {formatEngineForCard(car.engine.fuelType, car.engine.displacement)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">MPG</p>
                      <p className={cardStatClass(formatMpgForCard(car.fuelEconomy.combined))}>
                        {formatMpgForCard(car.fuelEconomy.combined)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">Est. Value</p>
                      <p className={cardStatClass(formatPriceShort(car.price?.msrp))}>
                        {formatPriceShort(car.price?.msrp)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">Type</p>
                      <p className="text-lg font-bold capitalize">{car.bodyStyle}</p>
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => navigate(`/car/${car.id}`)}
                    className="w-full flex items-center justify-center gap-2 text-xs tracking-widest text-zinc-300 group-hover:text-white transition-all py-2 border border-zinc-900 group-hover:border-zinc-700"
                  >
                    <span>VIEW DETAILS</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

