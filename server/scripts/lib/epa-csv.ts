/**
 * EPA's vehicles.csv, the source of every listing. A refresh has to read EPA's
 * current file: a copy saved by an earlier run silently leaves out every car
 * EPA has certified since, so the scripts download it unless told otherwise.
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fetchBuffer } from './fetch.js';

const EPA_CSV_URL = 'https://fueleconomy.gov/feg/epadata/vehicles.csv';
const EPA_ZIP_URL = 'https://fueleconomy.gov/feg/epadata/vehicles.csv.zip';

/** The full EPA file is tens of megabytes; allow a slow link, not a hung one. */
const DOWNLOAD_TIMEOUT_MS = 5 * 60_000;

/** Download EPA's current vehicles.csv into `rawDir` and return its path. */
export async function downloadEpaCsv(rawDir: string): Promise<string> {
  mkdirSync(rawDir, { recursive: true });
  const csvPath = join(rawDir, 'vehicles.csv');

  console.log(`Downloading EPA's current vehicles.csv from ${EPA_CSV_URL}...`);
  try {
    writeFileSync(csvPath, await fetchBuffer(EPA_CSV_URL, DOWNLOAD_TIMEOUT_MS));
    return csvPath;
  } catch {
    console.log('Direct CSV unavailable, trying zip...');
  }

  const zipPath = join(rawDir, 'vehicles.csv.zip');
  writeFileSync(zipPath, await fetchBuffer(EPA_ZIP_URL, DOWNLOAD_TIMEOUT_MS));

  const { execSync } = await import('child_process');
  if (process.platform === 'win32') {
    execSync(
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${rawDir}' -Force"`,
      { stdio: 'inherit' },
    );
  } else {
    execSync(`unzip -o "${zipPath}" -d "${rawDir}"`, { stdio: 'inherit' });
  }
  if (!existsSync(csvPath)) throw new Error(`${zipPath} held no vehicles.csv`);
  return csvPath;
}
