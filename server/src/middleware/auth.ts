import type { NextFunction, Request, Response } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';

export interface AuthUser {
  userId: string;
  email: string | null;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function isClerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim());
}

function getClerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error('CLERK_SECRET_KEY is not configured');
  return createClerkClient({ secretKey });
}

/**
 * Require a valid Clerk Bearer token. Attaches req.authUser.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isClerkConfigured()) {
    res.status(503).json({
      success: false,
      error: 'Account features are not configured (missing CLERK_SECRET_KEY)',
    });
    return;
  }

  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Missing authorization token' });
      return;
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ success: false, error: 'Missing authorization token' });
      return;
    }

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const userId = payload.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }

    let email: string | null = null;
    try {
      const clerk = getClerk();
      const user = await clerk.users.getUser(userId);
      email =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        null;
    } catch {
      /* email is optional for garage ops */
    }

    req.authUser = { userId, email };
    next();
  } catch (error) {
    console.error('[auth] token verification failed:', error);
    res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
}
