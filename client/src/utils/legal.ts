import { LEGAL_UPDATED } from '../config/contact';
import { intlLocale } from '../i18n';

/** "November 4, 2026" / "4 novembre 2026": noon UTC, so no timezone moves the day. */
export function legalDate(iso: string = LEGAL_UPDATED, locale: string = intlLocale()): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export const legalLinkClass =
  'text-zinc-200 underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400';
