/** The largest of 1, 2 or 5 times a power of ten that is not above `max`: one gridline. */
export function gridStep(max: number): number {
  if (max <= 0) return 0;
  const power = 10 ** Math.floor(Math.log10(max));
  return [5, 2, 1].map((m) => m * power).find((step) => step <= max) ?? power;
}

/** How many years apart the axis names them, so a phone fits about five and a wide screen eight. */
export function labelStep(span: number, fit: number): number {
  return [1, 2, 5, 10].find((step) => span / step <= fit) ?? 20;
}
