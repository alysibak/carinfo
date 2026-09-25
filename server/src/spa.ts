import express, { type Express } from 'express';
import path from 'path';

/** Paths ending in a file extension; no client route does. Mirrors vercel.json. */
const FILE_LIKE_PATH = /\.[a-zA-Z0-9]{2,5}$/;

/**
 * Serve the built SPA from `clientDistPath` (production / `npm start`).
 *
 * Build assets are content-hashed, so a name never changes meaning: they are
 * cached for a year. A missing one is a 404, not the SPA shell — a tab from
 * before a deploy asking for an old chunk must fail cleanly (the client then
 * reloads into the new build; see utils/staleBuildRecovery.ts). Any other
 * missing file (an old icon name, a manifest.json) is a 404 too: the shell
 * with a 200 would tell crawlers and home-screen installs the file exists.
 */
export function serveSpa(app: Express, clientDistPath: string): void {
  app.use(
    '/assets',
    express.static(path.join(clientDistPath, 'assets'), { immutable: true, maxAge: '1y' }),
    (_req, res) => {
      res.status(404).end();
    },
  );
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (FILE_LIKE_PATH.test(req.path)) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}
