import { existsSync } from 'fs';
import { join, resolve } from 'path';

/** Candidate paths for bundled JSON under server/data (Vercel + local dev). */
export function dataFileCandidates(fileName: string): string[] {
  return [
    resolve(process.cwd(), 'server', 'data', fileName),
    resolve(process.cwd(), 'data', fileName),
    join(__dirname, '../../data', fileName),
  ];
}

export function resolveDataFile(fileName: string): string | null {
  for (const path of dataFileCandidates(fileName)) {
    if (existsSync(path)) return path;
  }
  return null;
}
