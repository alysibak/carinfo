import type { NhtsaInvestigation } from '../types/car.types';
import { complaintPart } from './recalls';

const KINDS: Record<string, string> = {
  PE: 'Preliminary evaluation',
  EA: 'Engineering analysis',
  RQ: 'Recall query',
  DP: 'Defect petition',
  RP: 'Recall petition',
  AQ: 'Audit query',
};

/** "Preliminary evaluation", from NHTSA's "PE". */
export function investigationKind(kind: string): string {
  return KINDS[kind] ?? 'Investigation';
}

/** NHTSA's subjects in sentence case where it wrote them in capitals: "AIR BAG INFLATOR RUPTURE". */
export function investigationText(text: string): string {
  return /[a-z]/.test(text) ? text : complaintPart(text);
}

/** The open ones first, then newest. */
export function openFirst(list: NhtsaInvestigation[]): NhtsaInvestigation[] {
  return [...list].sort(
    (a, b) => Number(!!a.closed) - Number(!!b.closed) || b.opened.localeCompare(a.opened),
  );
}
