import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

function moduleDir(): string {
  if (typeof __dirname !== 'undefined') return __dirname;
  return dirname(fileURLToPath(import.meta.url));
}

/** Candidate paths for bundled JSON under server/data (Vercel + local dev). */
export function dataFileCandidates(fileName: string): string[] {
  return [
    resolve(process.cwd(), 'server', 'data', fileName),
    resolve(process.cwd(), 'data', fileName),
    join(moduleDir(), '../../data', fileName),
  ];
}

export function resolveDataFile(fileName: string): string | null {
  for (const path of dataFileCandidates(fileName)) {
    if (existsSync(path)) return path;
  }
  return null;
}
