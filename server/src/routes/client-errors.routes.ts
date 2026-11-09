import { Router, text, type Request, type Response } from 'express';
import { clientErrorLimiter } from '../middleware/security.js';
import { noStore } from '../middleware/cache.js';
import { parseClientError } from '../utils/client-error.js';

const router = Router();

// Browsers send reports as text/plain (no preflight, and sendBeacon allows it).
router.post(
  '/',
  clientErrorLimiter(),
  noStore,
  text({ type: 'text/plain', limit: '16kb' }),
  (req: Request, res: Response) => {
    const report = parseClientError(req.body, req.get('user-agent'));
    if (!report) {
      res.status(400).json({ success: false, error: 'Not an error report' });
      return;
    }
    console.error(
      JSON.stringify({ level: 'error', msg: 'client error', requestId: req.requestId, ...report }),
    );
    res.status(204).end();
  },
);

export default router;
