import { Router } from 'express';
import * as statsService from '../services/stats.service.js';

const router = Router();

/** Public visit totals — no PII. */
router.get('/site', (_req, res) => {
  res.json({ success: true, data: statsService.getSiteStats() });
});

/**
 * Record one visit for this browser session.
 * Client should call at most once per sessionStorage cycle.
 */
router.post('/visit', (_req, res) => {
  res.json({ success: true, data: statsService.recordVisit() });
});

export default router;
