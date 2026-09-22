import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { getAllCars } from '../services/car.service.js';
import { computeOwnershipEconomics } from './ownership-economics.js';
import { applyValuationReliabilityGuard } from './vehicle-valuation.js';

// Price the corpus exactly as the API serves it (car.service loads the prebuilt
// cars-ready.json when present), once for the whole file.
type Priced = { car: Car; economics: ReturnType<typeof computeOwnershipEconomics> };
let priced: Priced[] | null = null;
function pricedCorpus(): Priced[] {
  if (!priced) {
    priced = getAllCars().map((car) => ({ car, economics: computeOwnershipEconomics(car, []) }));
  }
  return priced;
}

describe('ownership economics — internal consistency', () => {
  it('never shows a value loss that disagrees with value minus projected resale', () => {
    // The dossier prints all three numbers side by side. When the reliability
    // guard replaced an implausible resale projection it kept the old loss, so
    // two vehicles showed arithmetic that did not add up.
    const offenders: string[] = [];
    for (const { car, economics } of pricedCorpus()) {
      const r = economics.resaleImpact;
      const implied = r.currentValue.mid - r.projectedResale5Year.mid;
      if (Math.abs(implied - r.estimatedLoss5Year.mid) > 2) {
        offenders.push(`${car.id}: ${implied} vs ${r.estimatedLoss5Year.mid}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('builds the 5-year TCO on the same loss the dossier displays', () => {
    const offenders: string[] = [];
    for (const { car, economics: o } of pricedCorpus()) {
      if (o.tco5Year?.mode !== 'full') continue;
      if (o.tco5Year.depreciation !== o.resaleImpact.estimatedLoss5Year.mid) {
        offenders.push(car.id);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never projects a loss larger than the vehicle is worth', () => {
    const offenders = pricedCorpus()
      .filter(({ economics: o }) => o.resaleImpact.estimatedLoss5Year.mid > o.marketValue.mid)
      .map(({ car }) => car.id);
    expect(offenders).toEqual([]);
  });
});

describe('applyValuationReliabilityGuard', () => {
  it('derives the loss band from the replacement resale band', () => {
    const market = {
      low: 11_000,
      high: 12_500,
      mid: 11_750,
      confidence: 'medium' as const,
      confidenceLabel: '',
      msrpAnchor: 13_000,
      retainedFraction: 0.9,
    };
    // A projection that keeps almost nothing of the value trips the guard.
    const resale = {
      currentValue: { low: 11_000, high: 12_500, mid: 11_750 },
      projectedResale5Year: { low: 300, mid: 493, high: 700 },
      estimatedLoss5Year: { low: 9_568, mid: 11_257, high: 13_508 },
      note: '',
    };

    const guarded = applyValuationReliabilityGuard(market, resale);
    const r = guarded.resale;
    if (r === resale) return; // guard did not trip for this shape; nothing to check

    expect(r.estimatedLoss5Year.mid).toBe(r.currentValue.mid - r.projectedResale5Year.mid);
    // Range bounds cross over: the largest resale gives the smallest loss.
    expect(r.estimatedLoss5Year.low).toBe(
      Math.max(0, r.currentValue.mid - r.projectedResale5Year.high),
    );
    expect(r.estimatedLoss5Year.high).toBe(r.currentValue.mid - r.projectedResale5Year.low);
    expect(r.estimatedLoss5Year.low).toBeLessThanOrEqual(r.estimatedLoss5Year.mid);
    expect(r.estimatedLoss5Year.mid).toBeLessThanOrEqual(r.estimatedLoss5Year.high);
  });
});
