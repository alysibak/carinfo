/** A body style for display: "SUV", not the "Suv" CSS capitalization gave. */
export function bodyStyleLabel(style: string | undefined | null): string {
  if (!style) return '';
  if (style.toLowerCase() === 'suv') return 'SUV';
  return style.charAt(0).toUpperCase() + style.slice(1);
}
