import type { VercelRequest, VercelResponse } from '@vercel/node';

type ExpressApp = (req: VercelRequest, res: VercelResponse) => void;

let app: ExpressApp | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) {
    // Dynamic import avoids ESM/CJS load-order crashes in the Vercel bundle.
    const mod = await import('../server/dist/app.js');
    app = mod.default as ExpressApp;
  }
  return app(req, res);
}
