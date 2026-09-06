import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { useGarageStore } from '../stores/garageStore';
import { cardStatClass, formatEngineForCard, formatMpgForCard, formatPriceShort } from '../utils/dataValue';
import ToolPageHeader from '../components/ToolPageHeader';
import { ErrorState, LoadingScreen, StatusToast } from '../components/ui';

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

  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const saveAllToLocalGarage = () => {
    if (cars.length === 0) {
      setSaveMessage('There are no vehicles to save from this shared garage.');
      return;
    }
    try {
      mergeIntoGarage(cars);
      navigate('/garage');
    } catch (e) {
      console.error('Failed to save shared garage to local store:', e);
      setSaveMessage('Could not save these cars to your Dream Garage.');
    }
  };

  useEffect(() => {
    if (!saveMessage) return;
    const t = setTimeout(() => setSaveMessage(null), 2800);
    return () => clearTimeout(t);
  }, [saveMessage]);

  if (loading) {
    return <LoadingScreen label="Loading shared garage" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Shared garage unavailable"
        message={error}
        backTo="/"
        backLabel="Home"
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <StatusToast message={saveMessage} />
      <ToolPageHeader
        backTo="/"
        backLabel="Home"
        title="Shared Garage"
        subtitle={`${cars.length} vehicle${cars.length !== 1 ? 's' : ''}`}
        action={
          <button
            type="button"
            onClick={saveAllToLocalGarage}
            className="min-h-[44px] px-2 -mr-2 text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.25em] text-zinc-400 hover:text-white transition-colors text-right"
          >
            Save all
          </button>
        }
      />

      <div className="pt-8 pb-16 page-wrap-wide">
        {cars.length === 0 ? (
          <div className="max-w-4xl mx-auto text-center py-32">
            <h2 className="text-3xl font-black tracking-tighter mb-4">
              NO VEHICLES IN THIS GARAGE
            </h2>
            <p className="text-lg tracking-wider text-zinc-400 mb-8">
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
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
              {cars.map((car, index) => (
                <div
                  key={car.id}
                  className="bg-black p-5 sm:p-8 hover:bg-zinc-950 transition-all duration-300 border border-zinc-900 hover:border-zinc-700 group relative"
                >
                  {/* Position Badge */}
                  <div className="absolute top-4 left-4 w-10 h-10 bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    <span className="text-lg font-black text-zinc-300">#{index + 1}</span>
                  </div>

                  {/* Year */}
                  <div className="mb-4 mt-12">
                    <p className="text-3xl sm:text-5xl font-black text-zinc-400 group-hover:text-zinc-300 transition-colors">
                      {car.year}
                    </p>
                  </div>

                  {/* Make & Model */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-black tracking-tight mb-1 group-hover:tracking-wide transition-all">
                      {car.make.toUpperCase()}
                    </h3>
                    <p className="text-lg font-light tracking-wider text-zinc-400 group-hover:text-zinc-400 transition-colors">
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

