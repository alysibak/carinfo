/**
 * Money for display, without the " CAD (est.)" every figure used to carry: the
 * section or cell around a figure says once that it is an estimate in CAD.
 */

/** "$5,771". */
export function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('en-CA')}`;
}

/** "$34k" from $10,000 up, "$5,800" below: thousands round a small figure away. */
export function formatMoneyShort(n: number): string {
  if (Math.abs(n) >= 10000) return `$${Math.round(n / 1000)}k`;
  return `$${(Math.round(n / 100) * 100).toLocaleString('en-CA')}`;
}

/** "$29k–$39k", "$5,400–$6,100", or one figure when the ends meet. */
export function formatMoneyRange(low: number, high: number): string {
  const a = formatMoneyShort(low);
  const b = formatMoneyShort(high);
  return a === b ? a : `${a}–${b}`;
}
