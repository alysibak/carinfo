import { useEffect, useState } from 'react';
import * as api from '../services/api';

const SESSION_KEY = 'carinfo-visit-recorded';

/**
 * Session-based site visit counter (no cookies / no PII).
 * Counts once per browser tab session, then shows the running total.
 *
 * Renders nothing when the server reports the count is not durable — on
 * serverless the counter lives in process memory and resets on every cold
 * start, and a number that resets is worse than no number at all.
 */
export default function VisitCounter({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState<api.SiteVisitStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    const readSession = () => {
      try {
        return sessionStorage.getItem(SESSION_KEY) === '1';
      } catch {
        // Private browsing / storage blocked — treat as a fresh session.
        return false;
      }
    };

    const markSession = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* nothing to do; the counter is best-effort */
      }
    };

    (async () => {
      try {
        const already = readSession();
        const result = already ? await api.getSiteVisitCount() : await api.recordSiteVisit();
        if (!already) markSession();
        if (!cancelled) setStats(result);
      } catch {
        try {
          const result = await api.getSiteVisitCount();
          if (!cancelled && result.visits > 0) setStats(result);
        } catch {
          /* hide counter if API unavailable */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats || !stats.durable || stats.visits < 1) return null;

  return (
    <p className={`tabular-nums ${className}`.trim()}>
      {stats.visits.toLocaleString()} {stats.visits === 1 ? 'visit' : 'visits'} to CarInfo
    </p>
  );
}
