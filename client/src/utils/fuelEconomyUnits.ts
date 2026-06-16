const KM_PER_MILE = 1.609344;

/** US EPA MPG → L/100 km. */
export function mpgToLPer100Km(mpg: number): number {
  if (mpg <= 0) return 0;
  return 235.215 / mpg;
}

/** US EPA MPGe → kWh/100 km. */
export function mpgeToKwhPer100Km(mpge: number): number {
  if (mpge <= 0) return 0;
  return 3370 / (mpge * KM_PER_MILE);
}

export function kwhPer100MiToKwhPer100Km(kwhPer100Mi: number): number {
  return kwhPer100Mi / KM_PER_MILE;
}

export function formatLPer100KmFromMpg(mpg: number): string {
  if (mpg <= 0) return '';
  return `${mpgToLPer100Km(mpg).toFixed(1)} L/100 km`;
}

export function formatKwhPer100KmFromMpge(mpge: number): string {
  if (mpge <= 0) return '';
  return `${mpgeToKwhPer100Km(mpge).toFixed(1)} kWh/100 km`;
}

export function formatKwhPer100KmFromMi(kwhPer100Mi: number): string {
  if (kwhPer100Mi <= 0) return '';
  return `${kwhPer100MiToKwhPer100Km(kwhPer100Mi).toFixed(1)} kWh/100 km`;
}

/** Secondary metric line for EPA MPG/MPGe figures. */
export function efficiencySecondaryLine(
  value: number | undefined,
  unit: 'MPG' | 'MPGe',
): string | undefined {
  if (value == null || value <= 0) return undefined;
  if (unit === 'MPGe') return formatKwhPer100KmFromMpge(value);
  return formatLPer100KmFromMpg(value);
}
