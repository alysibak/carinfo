/** Currency used by the ownership / valuation model (every region is Canadian). */
export const DISPLAY_CURRENCY = 'CAD';

export function currencySectionNote(regionName: string): string {
  return `All figures are ${regionName}-baseline model estimates in CAD, not live listing quotes. Actual quotes, condition, and local demand still vary.`;
}

export function currencyMethodologyNote(regionName: string): string {
  return `Cost and value estimates are built for ${regionName} drivers in CAD, using EPA fuel-economy ratings with ${regionName} energy prices, insurance baselines, and a CAD-adjusted depreciation model.`;
}
