import { Router } from 'express';
import * as statsService from '../services/stats.service.js';
import { statsWriteLimiter } from '../middleware/security.js';
import { CACHE_SHORT, dataCache } from '../middleware/cache.js';

const router = Router();

/** Public visit totals — no PII. */
router.get('/site', dataCache(CACHE_SHORT), async (_req, res, next) => {
  try {
    res.json({ success: true, data: await statsService.getSiteStats() });
  } catch (err) {
    next(err);
  }
});

/**
 * Record one visit for this browser session.
 * Client calls at most once per sessionStorage cycle; the limiter is what
 * actually stops the counter being inflated with a shell loop.
 */
router.post('/visit', statsWriteLimiter(), async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: await statsService.recordVisit() });
  } catch (err) {
    next(err);
  }
});

export default router;
