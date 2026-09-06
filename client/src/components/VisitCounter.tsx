import { useEffect, useState } from 'react';
import * as api from '../services/api';

const SESSION_KEY = 'carinfo-visit-recorded';

/**
 * Session-based site visit counter (no cookies / no PII).
 * Counts once per browser tab session, then shows the running total.
 */
export default function VisitCounter({ className = '' }: { className?: string }) {
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const already = sessionStorage.getItem(SESSION_KEY) === '1';
        const total = already ? await api.getSiteVisitCount() : await api.recordSiteVisit();
        if (!already) sessionStorage.setItem(SESSION_KEY, '1');
        if (!cancelled) setVisits(total);
      } catch {
        try {
          const total = await api.getSiteVisitCount();
          if (!cancelled && total > 0) setVisits(total);
        } catch {
          /* hide counter if API unavailable */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (visits == null || visits < 1) return null;

  return (
    <p className={`tabular-nums ${className}`.trim()}>
      {visits.toLocaleString()} {visits === 1 ? 'person has' : 'people have'} checked out CarInfo
    </p>
  );
}
