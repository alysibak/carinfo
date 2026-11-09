/** Round tick values covering [min, max]: steps of 1, 2 or 5 times a power of ten. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    const spread = Math.abs(min) * 0.1 || 1;
    min -= spread;
    max += spread;
  }
  const rough = (max - min) / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? rough;
  const first = Math.floor(min / step) * step;
  const last = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = first; value <= last + step / 2; value += step) {
    // Rounded to the step's own decimals, so 0.1 + 0.2 reads 0.3.
    ticks.push(Number(value.toFixed(Math.max(0, -Math.floor(Math.log10(step)) + 1))));
  }
  return ticks;
}
