import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { useGarageStore } from '../stores/garageStore';
import ToolPageHeader from '../components/ToolPageHeader';
import { ErrorState, LoadingScreen, StatusToast } from '../components/ui';
import CarCard from '../components/CarCard';

export default function SharedGarage() {
  const [searchParams] = useSearchParams();
  const [cars, setCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const mergeIntoGarage = useGarageStore((s) => s.mergeMany);

  useEffect(() => {
    const raw = searchParams.get('cars') || '';
    const ids = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

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
      <ErrorState title="Shared garage unavailable" message={error} backTo="/" backLabel="Home" />
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
            className="min-h-[44px] px-2 -mr-2 text-xs text-zinc-400 hover:text-white transition-colors text-right"
          >
            Save all
          </button>
        }
      />

      <div className="pt-8 pb-16 page-wrap-wide">
        {cars.length === 0 ? (
          <div className="max-w-xl py-16">
            <h2 className="text-2xl font-bold tracking-tight mb-2">No vehicles in this garage</h2>
            <p className="text-[15px] text-zinc-400 mb-6">
              This shared garage link does not contain any vehicles.
            </p>
            <Link to="/home" className="btn-primary">
              Search cars
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cars.map((car) => (
              <li key={car.id}>
                <CarCard car={car} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
