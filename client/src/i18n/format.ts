import { intlLocale, locale } from './index';

/** "1,234" or "1 234". */
export function fmtNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(), options).format(value);
}

/** Whole Canadian dollars: "$1,234" in English, "1 234 $" in French. */
export function fmtMoney(value: number): string {
  const amount = fmtNumber(Math.round(Math.abs(value)));
  const sign = value < 0 ? '−' : '';
  return locale() === 'fr' ? `${sign}${amount} $` : `${sign}$${amount}`;
}

/** "November 4, 2026" or "4 novembre 2026", from an ISO date, whatever the timezone. */
export function fmtDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return date.toLocaleDateString(intlLocale(), { timeZone: 'UTC', ...options });
}
