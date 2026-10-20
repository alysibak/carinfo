import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCarRecords } from '../services/api';
import type { CarRecordsSummary } from '../types/car.types';

/**
 * Under a saved car: its model year's recalls in Canada, to check against the
 * car's own VIN. Says nothing where the records are not matched or list none.
 */
export default function CarRecordsNote({ carId }: { carId: string }) {
  const [records, setRecords] = useState<CarRecordsSummary | null>(null);

  useEffect(() => {
    let active = true;
    getCarRecords(carId)
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [carId]);

  if (!records?.recalls) return null;
  return (
    <p className="mt-1.5 text-xs text-zinc-400 leading-snug">
      <Link
        to={`/car/${encodeURIComponent(carId)}#recalls`}
        className="hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500"
      >
        {records.recalls} {records.recalls === 1 ? 'recall' : 'recalls'} in Canada for this model
        year
      </Link>
      : check yours by its VIN.
    </p>
  );
}
