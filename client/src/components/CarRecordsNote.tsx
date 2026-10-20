import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCarRecords } from '../services/api';
import type { CarRecordsSummary } from '../types/car.types';
import { theftPlace } from '@carinfo/shared/theft';

const linkClass =
  'hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

/**
 * Under a saved car: its model year's recalls in Canada, to check against the
 * car's own VIN, and whether its model is among Canada's most stolen. Says
 * nothing where the records are not matched or list none.
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

  if (!records?.recalls && !records?.theft) return null;
  const carPath = `/car/${encodeURIComponent(carId)}`;
  return (
    <>
      {records.recalls ? (
        <p className="mt-1.5 text-xs text-zinc-400 leading-snug">
          <Link to={`${carPath}#recalls`} className={linkClass}>
            {records.recalls} {records.recalls === 1 ? 'recall' : 'recalls'} in Canada for this
            model year
          </Link>
          : check yours by its VIN.
        </p>
      ) : null}
      {records.theft && (
        <p className="mt-1 text-xs text-zinc-400 leading-snug">
          <Link to={`${carPath}#theft`} className={linkClass}>
            The {records.theft.model} was {theftPlace(records.theft)}
          </Link>
          : ask your insurer about anti-theft devices.
        </p>
      )}
    </>
  );
}
