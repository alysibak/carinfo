/** Currency used by the ownership / valuation model (every region is Canadian). */
export const DISPLAY_CURRENCY = 'CAD';

export function currencySectionNote(regionName: string): string {
  return `Estimates in CAD for ${regionName}, from our cost model rather than quotes: your insurance, the car's condition and local demand will move them.`;
}

export function currencyMethodologyNote(regionName: string): string {
  return `Cost and value estimates are built for ${regionName} drivers in CAD, using EPA fuel-economy ratings with ${regionName} energy prices, insurance baselines, and a CAD-adjusted depreciation model.`;
}
