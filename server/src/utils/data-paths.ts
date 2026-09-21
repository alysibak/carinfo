import { existsSync } from 'fs';
import { basename, join, resolve } from 'path';

/**
 * Candidate paths for bundled JSON under server/data.
 *
 * The process can start from three places — the repo root (`npm run dev`), the
 * server workspace (`npm start --workspace=server`) and a Vercel function
 * bundle — so each is probed in turn.
 *
 * The `server/data` candidate is skipped when the CWD is already the server
 * workspace. Without that guard, a write path resolving against the first
 * candidate lands in `server/server/data/` — which is exactly how the stray
 * `server/server/data/site-stats.json` that used to be committed got created.
 */
export function dataFileCandidates(fileName: string): string[] {
  const cwd = process.cwd();
  const inServerWorkspace = basename(cwd) === 'server';

  const candidates = [
    ...(inServerWorkspace ? [] : [resolve(cwd, 'server', 'data', fileName)]),
    resolve(cwd, 'data', fileName),
    join(__dirname, '../../data', fileName),
  ];

  return Array.from(new Set(candidates));
}

export function resolveDataFile(fileName: string): string | null {
  for (const path of dataFileCandidates(fileName)) {
    if (existsSync(path)) return path;
  }
  return null;
}
