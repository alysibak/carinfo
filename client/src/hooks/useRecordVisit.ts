import { useEffect } from 'react';
import * as api from '../services/api';

const SESSION_KEY = 'carinfo-visit-recorded';

/**
 * Count a visit once per browser-tab session (no cookies, no personal data).
 *
 * The total is still kept and readable at GET /api/stats; the site just no
 * longer prints it in every footer, where "910 visits to CarInfo" read as a
 * hobby page on a site that asks to be trusted with numbers.
 */
export function useRecordVisit(): void {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Storage blocked: without the session mark every page load would count.
      return;
    }
    api.recordSiteVisit().catch(() => {
      /* best-effort */
    });
  }, []);
}
