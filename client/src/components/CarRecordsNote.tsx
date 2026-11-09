import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCarRecords } from '../services/api';
import type { CarRecordsSummary } from '../types/car.types';
import { theftPlace } from '@carinfo/shared/theft';
import { t, tp } from '../i18n';

const linkClass =
  'hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

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
    <div className="space-y-1">
      {records.recalls ? (
        <p className="text-xs text-zinc-400 leading-snug">
          <Link to={`${carPath}#recalls`} className={linkClass}>
            {tp(
              records.recalls,
              '{count} recall in Canada for this model year',
              '{count} recalls in Canada for this model year',
            )}
          </Link>
          {t(': check yours by its VIN.')}
        </p>
      ) : null}
      {records.theft && (
        <p className="text-xs text-zinc-400 leading-snug">
          <Link to={`${carPath}#theft`} className={linkClass}>
            {t('The {model} was {place}', {
              model: records.theft.model,
              place: theftPlace(records.theft),
            })}
          </Link>
          {t(': ask your insurer about anti-theft devices.')}
        </p>
      )}
    </div>
  );
}
