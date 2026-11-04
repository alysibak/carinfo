import { timingSafeEqual } from 'crypto';
import { Router, type Request, type Response } from 'express';
import { isAccountsStorageReady, setRecallAlerts } from '../db/user-store.js';
import { noStore } from '../middleware/cache.js';
import { writeLimiter } from '../middleware/security.js';
import { runRecallAlerts } from '../services/recall-alerts.service.js';
import { verifyUnsubscribeToken } from '../utils/unsubscribe-token.js';

/**
 * Turning recall alerts off from an email, signed in or not: the unsubscribe
 * page's button, and mail clients' one-click unsubscribe (RFC 8058), which
 * POSTs to the List-Unsubscribe address with the token in its query.
 */
export const alertsRouter = Router();

alertsRouter.post('/unsubscribe', writeLimiter(), noStore, async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : req.body?.token;
  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    res.status(400).json({ success: false, error: 'This unsubscribe link is not valid.' });
    return;
  }
  if (!isAccountsStorageReady()) {
    res.status(503).json({ success: false, error: 'Accounts are not available right now.' });
    return;
  }
  try {
    await setRecallAlerts(userId, false);
    res.json({ success: true, data: { recallAlerts: false } });
  } catch (error) {
    console.error('[alerts] unsubscribe failed:', error);
    res.status(500).json({ success: false, error: 'Could not turn alerts off. Try again.' });
  }
});

function bearerMatches(header: string | undefined, secret: string): boolean {
  const given = Buffer.from(header ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Vercel Cron's daily call (vercel.json), which sends CRON_SECRET as a bearer
 * token. Without CRON_SECRET the endpoint stays shut.
 */
export const cronRouter = Router();

cronRouter.get('/recall-alerts', noStore, async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    res.status(503).json({ success: false, error: 'CRON_SECRET is not set' });
    return;
  }
  if (!bearerMatches(req.get('authorization'), secret)) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  try {
    const run = await runRecallAlerts();
    console.log(JSON.stringify({ level: 'info', msg: 'recall alerts run', ...run }));
    res.json({ success: true, data: run });
  } catch (error) {
    console.error('[cron] recall alerts failed:', error);
    res.status(500).json({ success: false, error: 'Recall alerts run failed' });
  }
});
