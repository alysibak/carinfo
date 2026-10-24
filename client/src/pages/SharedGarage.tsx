import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { useGarageStore } from '../stores/garageStore';
import ToolPageHeader from '../components/ToolPageHeader';
import { ErrorState, LoadingScreen, StatusToast } from '../components/ui';
import CarCard from '../components/CarCard';
import CarRecordsNote from '../components/CarRecordsNote';
import { MAX_COMPARE as MAX_COMPARED } from '../utils/compareIds';

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
          setError('None of the cars in this shared garage are on file.');
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
      setSaveMessage('There are no cars to save from this shared garage.');
      return;
    }
    try {
      mergeIntoGarage(cars);
      navigate('/garage');
    } catch (e) {
      console.error('Failed to save shared garage to local store:', e);
      setSaveMessage('Could not save these cars to your garage.');
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
        backTo="/home"
        backLabel="Search cars"
      />
    );
  }

  const compareIds = cars.slice(0, MAX_COMPARED).map((car) => car.id);

  return (
    <div className="min-h-screen bg-black text-white">
      <StatusToast message={saveMessage} />
      <ToolPageHeader
        wide
        backTo="/"
        backLabel="Home"
        title="Cars shared with you"
        subtitle={`${cars.length} ${cars.length === 1 ? 'car' : 'cars'} from someone’s CarInfo garage`}
      />

      <div className="pt-8 pb-16 page-wrap-wide">
        {cars.length === 0 ? (
          <div className="max-w-xl py-16">
            <h2 className="text-2xl font-bold tracking-tight mb-2">No cars in this garage</h2>
            <p className="text-[15px] text-zinc-400 mb-6">This shared garage link holds no cars.</p>
            <Link to="/home" className="btn-primary">
              Search cars
            </Link>
          </div>
        ) : (
          <>
            {/* What someone sent a shortlist for: to weigh the cars up, or keep them. */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {cars.length > 1 && (
                <Link to={`/compare?cars=${compareIds.join(',')}`} className="btn-primary">
                  {cars.length > MAX_COMPARED
                    ? `Compare the first ${MAX_COMPARED}`
                    : 'Compare them side by side'}
                </Link>
              )}
              <button type="button" onClick={saveAllToLocalGarage} className="btn-secondary">
                Save all to my garage
              </button>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cars.map((car) => (
                <li key={car.id}>
                  <CarCard car={car} notes={<CarRecordsNote carId={car.id} />} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
