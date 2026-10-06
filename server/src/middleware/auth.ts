import type { NextFunction, Request, Response } from 'express';
import { getAuth, isAuthConfigured, siteOrigins } from '../auth/auth.js';
import { ensureSchema } from '../db/pool.js';

export interface AuthUser {
  userId: string;
  email: string | null;
  emailVerified: boolean;
}

declare global {
  // The only supported way to augment Express's Request type.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

function notConfigured(res: Response): void {
  res.status(503).json({
    success: false,
    error: 'Accounts are not configured (missing DATABASE_URL or BETTER_AUTH_SECRET)',
  });
}

/**
 * Better Auth's own endpoints (sign-in, sign-up, sign-out, password reset,
 * Google's callback), under /api/auth. Registered with app.all, which keeps
 * the full path Better Auth routes on, and before express.json(): Better Auth
 * reads the body itself.
 */
export async function authHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isAuthConfigured()) {
    notConfigured(res);
    return;
  }
  try {
    await ensureSchema();
    // import(), not require(): Better Auth is an ES module (see auth/auth.ts).
    const [{ toNodeHandler }, auth] = await Promise.all([import('better-auth/node'), getAuth()]);
    await toNodeHandler(auth)(req, res);
  } catch (error) {
    next(error);
  }
}

/**
 * A write from a page on another site. The session cookie is SameSite=Lax, so
 * a browser leaves it off such requests anyway; this refuses them outright.
 */
function crossSiteWrite(req: Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return false;
  const origin = req.headers.origin;
  return Boolean(origin) && !siteOrigins().includes(origin!.replace(/\/$/, ''));
}

/** Require a signed-in session. Attaches req.authUser. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isAuthConfigured()) {
    notConfigured(res);
    return;
  }
  if (crossSiteWrite(req)) {
    res.status(403).json({ success: false, error: 'Cross-site request refused' });
    return;
  }

  let session;
  try {
    // No ensureSchema() first: without a session cookie this asks nothing of
    // the database, and a cookie means a sign-in already made the tables.
    const [{ fromNodeHeaders }, auth] = await Promise.all([import('better-auth/node'), getAuth()]);
    session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  } catch (error) {
    console.error('[auth] session check failed:', error);
    res.status(503).json({ success: false, error: 'Could not check your sign-in. Try again.' });
    return;
  }
  if (!session) {
    res.status(401).json({ success: false, error: 'Sign in to continue' });
    return;
  }

  req.authUser = {
    userId: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
  };
  next();
}

/**
 * The tools (VIN decoder and the like) are for members once accounts are set
 * up; before that, a deployment without them keeps the tools open rather
 * than locking everyone out.
 */
export function requireAuthWhenConfigured(
  req: Request,
  res: Response,
  next: NextFunction,
): void | Promise<void> {
  if (!isAuthConfigured()) return next();
  return requireAuth(req, res, next);
}
