import type { NhtsaInvestigation } from '../types/car.types';
import { msg, t } from '../i18n';
import { complaintPart } from './recalls';

const KINDS: Record<string, string> = {
  PE: msg('Preliminary evaluation'),
  EA: msg('Engineering analysis'),
  RQ: msg('Recall query'),
  DP: msg('Defect petition'),
  RP: msg('Recall petition'),
  AQ: msg('Audit query'),
};

/** "Preliminary evaluation", from NHTSA's "PE". */
export function investigationKind(kind: string): string {
  return KINDS[kind] ? t(KINDS[kind]) : t('Investigation');
}

/** NHTSA's subjects in sentence case where it wrote them in capitals: "AIR BAG INFLATOR RUPTURE". */
export function investigationText(text: string): string {
  return /[a-z]/.test(text) ? text : complaintPart(text);
}

/** NHTSA’s component in words: "Engine and cooling"; "Other" where it names none. */
export function investigationPart(component: string): string {
  return /^(?:UNKNOWN|NONE)/i.test(component) ? t('Other') : complaintPart(component);
}

/** The open ones first, then newest. */
export function openFirst(list: NhtsaInvestigation[]): NhtsaInvestigation[] {
  return [...list].sort(
    (a, b) => Number(!!a.closed) - Number(!!b.closed) || b.opened.localeCompare(a.opened),
  );
}
