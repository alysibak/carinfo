import { readFileSync } from 'fs';
import type { CanadianRecall, ComplaintSummary } from '../types/car.types.js';
import { resolveDataFile } from '../utils/data-paths.js';

/**
 * Transport Canada's recalls and NHTSA's owner complaints, by model line and
 * model year (scripts/build-safety-records.ts). Loaded on first use: most
 * requests never ask.
 */

interface RecallFile {
  builtAt?: string;
  recalls: Record<string, Omit<CanadianRecall, 'number'>>;
  byLine: Record<string, string[]>;
}

interface ComplaintFile {
  builtAt?: string;
  byLine: Record<string, ComplaintSummary>;
}

let recallFile: RecallFile | null | undefined;
let complaintFile: ComplaintFile | null | undefined;
/** Model lines with any matched record: only these can be said to have none in a year. */
let recallLines = new Set<string>();
let complaintLines = new Set<string>();

function load<T>(name: string): T | null {
  const path = resolveDataFile(name);
  return path ? (JSON.parse(readFileSync(path, 'utf8')) as T) : null;
}

const lineOf = (key: string) => key.slice(0, key.lastIndexOf('|'));

function recalls(): RecallFile | null {
  if (recallFile === undefined) {
    recallFile = load<RecallFile>('recalls-canada.json');
    recallLines = new Set(Object.keys(recallFile?.byLine ?? {}).map(lineOf));
  }
  return recallFile;
}

function complaints(): ComplaintFile | null {
  if (complaintFile === undefined) {
    complaintFile = load<ComplaintFile>('complaints.json');
    complaintLines = new Set(Object.keys(complaintFile?.byLine ?? {}).map(lineOf));
  }
  return complaintFile;
}

/**
 * Transport Canada's recalls for a model line ("honda|civic") and year, newest
 * first; undefined where none of its records match the line.
 */
export function canadianRecallsFor(line: string, year: number): CanadianRecall[] | undefined {
  const file = recalls();
  if (!file || !recallLines.has(line)) return undefined;
  return (file.byLine[`${line}|${year}`] ?? []).map((number) => ({
    number,
    ...file.recalls[number],
  }));
}

/** NHTSA owner complaints for a model line and year; undefined where unmatched. */
export function complaintsFor(line: string, year: number): ComplaintSummary | undefined {
  const file = complaints();
  if (!file || !complaintLines.has(line)) return undefined;
  return (
    file.byLine[`${line}|${year}`] ?? {
      complaints: 0,
      crashes: 0,
      fires: 0,
      injuries: 0,
      deaths: 0,
      parts: [],
    }
  );
}

/**
 * Where a year stands among its model's years on file by owner complaints:
 * the 2018 CR-V has the most of its 30 years. Only for a year with complaints,
 * of a model with three years or more; a model's years are compared with each
 * other, not with other models, and the counts are not adjusted for sales.
 */
export function complaintRankFor(
  line: string,
  year: number,
  years: number[],
): { position: number; of: number } | undefined {
  const own = complaintsFor(line, year)?.complaints ?? 0;
  if (!own || years.length < 3) return undefined;
  const more = years.filter((y) => (complaintsFor(line, y)?.complaints ?? 0) > own).length;
  return { position: more + 1, of: years.length };
}

/**
 * The day each file was built from the government's records, which the
 * Public data workflow fetches the same day: "2026-10-20".
 */
export function recordDates(): { recalls?: string; complaints?: string } {
  const day = (iso?: string) => iso?.slice(0, 10);
  const recallDay = day(recalls()?.builtAt);
  const complaintDay = day(complaints()?.builtAt);
  return {
    ...(recallDay ? { recalls: recallDay } : {}),
    ...(complaintDay ? { complaints: complaintDay } : {}),
  };
}
