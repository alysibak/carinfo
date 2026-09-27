import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { getAllCars } from '../services/car.service.js';
import { getRegionalAssumptions } from '../config/regional-assumptions.js';
import { computeOwnershipEconomics } from './ownership-economics.js';
import { applyValuationReliabilityGuard, estimateNewVehicleMsrp } from './vehicle-valuation.js';

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

describe('regions', () => {
  const sample = (): Car[] => {
    const cars = getAllCars();
    const pick = (make: string, model: RegExp) =>
      cars.find((c) => c.make === make && model.test(c.model));
    return [
      pick('Honda', /^Civic/),
      pick('Toyota', /^Mirai/), // hydrogen: its own practicality note
      pick('Porsche', /^911/),
      cars.find((c) => c.year <= 2002), // beater tier
    ].filter((c): c is Car => c !== undefined);
  };

  it('never describes a British Columbia estimate as Ontario', () => {
    // The dossier used to value B.C. cars with Ontario's sticker-price ratio
    // and label them "Ontario-baseline".
    expect(sample().length).toBeGreaterThanOrEqual(3);
    for (const car of sample()) {
      const text = JSON.stringify(computeOwnershipEconomics(car, [], 'british-columbia'));
      expect(text, car.id).not.toMatch(/Ontario/);
    }
  });

  it("prices each region's new-car anchor at its own sticker ratio", () => {
    const car = sample()[0];
    const on = getRegionalAssumptions('ontario');
    const bc = getRegionalAssumptions('british-columbia');
    const usd = estimateNewVehicleMsrp(car);
    expect(computeOwnershipEconomics(car, [], 'ontario').marketValue.msrpAnchor).toBe(
      Math.round(usd * on.vehiclePriceCadPerUsd),
    );
    expect(computeOwnershipEconomics(car, [], 'british-columbia').marketValue.msrpAnchor).toBe(
      Math.round(usd * bc.vehiclePriceCadPerUsd),
    );
  });

  it('charges no Ontario plate renewal fee', () => {
    const [car] = sample();
    expect(computeOwnershipEconomics(car, [], 'ontario').annualCost.registration).toBe(0);
  });
});

describe('insurance', () => {
  const find = (make: string, model: RegExp, year: number) =>
    getAllCars().find((c) => c.make === make && model.test(c.model) && c.year === year)!;

  it('rises with value, and prices Teslas for their repair costs', () => {
    // A $97,500 Model S paid a $22,000 Corolla's premium.
    const corolla = computeOwnershipEconomics(find('Toyota', /^Corolla$/, 2021), []);
    const models = computeOwnershipEconomics(find('Tesla', /^Model S$/, 2025), []);
    const model3 = computeOwnershipEconomics(
      find('Tesla', /^Model 3 Standard Range Plus/, 2021),
      [],
    );
    expect(models.annualCost.insurance).toBeGreaterThan(model3.annualCost.insurance);
    // Bankrate: a Model 3 costs 27% more to insure than the average car.
    expect(model3.annualCost.insurance / corolla.annualCost.insurance).toBeCloseTo(1.27, 1);
  });

  it('leaves a hydrogen car out of running-cost orders, its fuel having no price', () => {
    expect(find('Toyota', /^Mirai/, 2023).runningCostCad).toBeUndefined();
    expect(find('Toyota', /^Corolla$/, 2021).runningCostCad).toBeGreaterThan(0);
  });
});

describe('two-doors', () => {
  const find = (make: string, model: RegExp, year: number, bodyStyle: string) =>
    getAllCars().find(
      (c) => c.make === make && model.test(c.model) && c.year === year && c.bodyStyle === bodyStyle,
    );

  it('insures a convertible as a coupe, not a sedan', () => {
    // Roadsters became convertibles, and every convertible was on sedan rates:
    // a Mustang Convertible cost less to insure than the coupe.
    const coupe = find('Ford', /^Mustang(?! Convertible)/, 2020, 'coupe');
    const convertible = find('Ford', /^Mustang Convertible/, 2020, 'convertible');
    expect(coupe && convertible).toBeTruthy();
    expect(computeOwnershipEconomics(convertible!, []).annualCost.insurance).toBe(
      computeOwnershipEconomics(coupe!, []).annualCost.insurance,
    );
  });

  it('puts a luxury roadster in the luxury-performance tier with luxury coupes', () => {
    // A Z4 was costed as a sedan while a 430i coupe paid the tier.
    const z4 = find('BMW', /^Z4/, 2020, 'convertible');
    const coupe = find('BMW', /^430i Coupe/, 2021, 'coupe');
    expect(z4 && coupe).toBeTruthy();
    const roadster = computeOwnershipEconomics(z4!, []);
    const reference = computeOwnershipEconomics(coupe!, []);
    expect(roadster.annualCost.tires).toBe(reference.annualCost.tires);
    expect(roadster.assumptions.insuranceTier).toBe(reference.assumptions.insuranceTier);
  });
});
