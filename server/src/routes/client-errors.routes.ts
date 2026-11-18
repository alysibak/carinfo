import { Router, text, type Request, type Response } from 'express';
import { clientErrorLimiter } from '../middleware/security.js';
import { noStore } from '../middleware/cache.js';
import { parseClientError } from '../utils/client-error.js';
import { recordClientError } from '../services/client-errors.service.js';

const router = Router();

// Browsers send reports as text/plain (no preflight, and sendBeacon allows it).
router.post(
  '/',
  clientErrorLimiter(),
  noStore,
  text({ type: 'text/plain', limit: '16kb' }),
  async (req: Request, res: Response) => {
    const report = parseClientError(req.body, req.get('user-agent'));
    if (!report) {
      res.status(400).json({ success: false, error: 'Not an error report' });
      return;
    }
    console.error(
      JSON.stringify({ level: 'error', msg: 'client error', requestId: req.requestId, ...report }),
    );
    // Counted for the daily digest before answering: a serverless function may
    // stop once it has. A store that fails costs the count, not the answer.
    try {
      await recordClientError(report);
    } catch (error) {
      console.error('[client-errors] could not count the report:', error);
    }
    res.status(204).end();
  },
);

export default router;
