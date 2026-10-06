import { describe, expect, it } from 'vitest';
import {
  FIRST_MODEL_YEAR,
  LATEST_FULL_MODEL_YEAR,
  LATEST_MODEL_YEAR,
} from '../config/model-years.js';
import {
  getCarById,
  getSearchSuggestions,
  getStatistics,
  searchCars,
} from '../services/car.service.js';

describe('car.service search smoke', () => {
  it('loads the full committed database (not fallback-only)', () => {
    const { total } = searchCars({ limit: 1 });
    expect(total).toBeGreaterThan(25_000);
  }, 120_000);

  it('filters by make using indexes', () => {
    const { results, total } = searchCars({
      filters: { make: ['Toyota'] },
      limit: 10,
    });
    expect(total).toBeGreaterThan(100);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.make === 'Toyota')).toBe(true);
  });

  it('filters plug-in hybrid after runtime fuel correction', () => {
    const { results, total } = searchCars({
      filters: { fuelType: ['plug-in hybrid'] },
      limit: 20,
    });
    expect(total).toBeGreaterThan(100);
    expect(results.every((c) => c.engine.fuelType === 'plug-in hybrid')).toBe(true);
  });

  it('filters by NHTSA stars, leaving out cars NHTSA has not rated', () => {
    const fiveStar = searchCars({ filters: { safety: { min: 5 } }, limit: 200 });
    expect(fiveStar.total).toBeGreaterThan(500);
    expect(fiveStar.results.every((c) => c.safetyRating?.overall === 5)).toBe(true);
    const fourUp = searchCars({ filters: { safety: { min: 4 } }, limit: 1 });
    expect(fourUp.total).toBeGreaterThan(fiveStar.total);
    expect(fourUp.total).toBeLessThan(searchCars({ limit: 1 }).total);
  });

  it('returns normalized dossier-ready records by id', () => {
    const car = getCarById('porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8');
    expect(car).not.toBeNull();
    expect(car!.engine.fuelType).toBe('plug-in hybrid');
    expect(car!.price?.isEstimated).toBe(true);
  });
});

describe('car.service natural language search', () => {
  it('collapses mazda 3 to one model when collapseByModel is true', () => {
    const { results, total } = searchCars({
      query: 'mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(total).toBe(1);
    expect(results).toHaveLength(1);
    expect(results[0].make).toBe('Mazda');
    expect(results[0].model.toLowerCase().startsWith('3')).toBe(true);
    expect(results[0].model.toLowerCase().startsWith('323')).toBe(false);
    expect(results[0].year).toBeGreaterThanOrEqual(2020);
  });

  it('shows many Mazda 3 years when collapseByModel is false', () => {
    const { results, total } = searchCars({
      query: 'mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: false,
      limit: 50,
    });
    expect(total).toBeGreaterThan(10);
    expect(total).toBeLessThan(40);
    expect(results[0].make).toBe('Mazda');
    expect(results.every((c) => /^3\b/i.test(c.model))).toBe(true);
    const years = results.map((c) => c.year);
    expect(new Set(years).size).toBe(years.length);
    expect(years.length).toBeGreaterThan(5);
  });

  it('finds year + model queries humans actually type', () => {
    const mazda = searchCars({
      query: '2024 mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 5,
    });
    expect(mazda.total).toBe(1);
    expect(mazda.results[0].year).toBe(2024);
    expect(mazda.results[0].make).toBe('Mazda');
    expect(/^3\b/i.test(mazda.results[0].model)).toBe(true);

    const camry = searchCars({
      query: 'toyota camry 2022',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 5,
    });
    expect(camry.total).toBe(1);
    expect(camry.results[0].year).toBe(2022);
    expect(camry.results[0].make).toBe('Toyota');
    expect(camry.results[0].model.toLowerCase()).toContain('camry');
  });

  it('keeps decade year ranges as multiple years when not collapsing by model', () => {
    const { results, total } = searchCars({
      query: 'toyota camry 202',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: false,
      limit: 20,
    });
    expect(total).toBeGreaterThan(1);
    expect(results.length).toBeGreaterThan(1);
    expect(
      results.every(
        (c) =>
          c.make === 'Toyota' &&
          c.model.toLowerCase().includes('camry') &&
          c.year >= 2020 &&
          c.year <= 2029,
      ),
    ).toBe(true);
    const years = new Set(results.map((c) => c.year));
    expect(years.size).toBeGreaterThan(1);
  });

  it('collapses decade year ranges to one model when collapseByModel is true', () => {
    const { results, total } = searchCars({
      query: 'toyota camry 202',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 20,
    });
    expect(total).toBe(1);
    expect(results[0].make).toBe('Toyota');
    expect(results[0].model.toLowerCase()).toContain('camry');
    expect(results[0].year).toBeGreaterThanOrEqual(2020);
    expect(results[0].year).toBeLessThanOrEqual(2029);
  });

  it('treats century prefix 20 as 2000–2099 and respects collapse toggle', () => {
    const expanded = searchCars({
      query: 'toyota camry 20',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: false,
      limit: 50,
    });
    expect(expanded.total).toBeGreaterThan(1);
    expect(
      expanded.results.every(
        (c) =>
          c.make === 'Toyota' &&
          c.model.toLowerCase().includes('camry') &&
          c.year >= 2000 &&
          c.year <= 2099,
      ),
    ).toBe(true);
    expect(new Set(expanded.results.map((c) => c.year)).size).toBeGreaterThan(1);

    const collapsed = searchCars({
      query: 'toyota camry 20',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    // One row per model: the Camry, and the Camry Solara coupe and convertible.
    expect(collapsed.total).toBe(2);
    expect(collapsed.results.filter((c) => /solara/i.test(c.model))).toHaveLength(1);
  });

  it('accepts glued mazda3 and collapses Civic when one-per-model is on', () => {
    const glued = searchCars({
      query: 'mazda3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(glued.total).toBe(1);
    expect(glued.results[0].make).toBe('Mazda');
    expect(glued.results[0].year).toBeGreaterThanOrEqual(2020);
    expect(/^3\b/i.test(glued.results[0].model)).toBe(true);

    const civic = searchCars({
      query: 'honda civic',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(civic.total).toBe(1);
    expect(civic.results[0].make).toBe('Honda');
    expect(civic.results[0].model.toLowerCase()).toContain('civic');
    expect(civic.results[0].year).toBeGreaterThanOrEqual(2020);
  });

  it('keeps make-only mazda denser than expanded mazda 3 years', () => {
    const makeOnly = searchCars({
      query: 'mazda',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(makeOnly.total).toBeGreaterThan(5);
    // Make browsing should stay one-per-family, not explode into every year row.
    expect(makeOnly.total).toBeLessThan(200);

    const oneModel = searchCars({
      query: 'mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 50,
    });
    expect(oneModel.total).toBe(1);
    expect(makeOnly.total).toBeGreaterThan(oneModel.total);

    const modelYears = searchCars({
      query: 'mazda 3',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: false,
      limit: 50,
    });
    expect(modelYears.total).toBeGreaterThan(10);
    expect(modelYears.total).toBeLessThan(40);
    expect(new Set(modelYears.results.map((c) => c.year)).size).toBe(modelYears.results.length);
  });

  it('keeps land rover as a two-word make', () => {
    const { results, total } = searchCars({
      query: 'land rover',
      sort: { field: 'relevance', order: 'desc' },
      collapseByModel: true,
      limit: 5,
    });
    expect(total).toBeGreaterThan(0);
    expect(results[0].make.toLowerCase()).toContain('land');
  });
  it('covers exactly the model years the shared constants advertise', () => {
    // The UI's newest-year chip and example searches read these; bump them
    // when a data refresh adds a model year.
    expect(getStatistics().yearRange).toEqual({ min: FIRST_MODEL_YEAR, max: LATEST_MODEL_YEAR });
  });

  it('counts model lines the way one-per-model search does', () => {
    const stats = getStatistics();
    const collapsed = searchCars({ collapseByModel: true, limit: 1 }).total;
    expect(stats.totalModels).toBe(collapsed);
    expect(stats.totalModels).toBeGreaterThan(900);
    expect(stats.totalModels).toBeLessThan(stats.totalCars / 10);
  });

  it('calls a year "full" only while the next one is still partial', () => {
    // Examples ("2026 Camry") and the newest-year chip use the full year. Once
    // EPA has certified most of the next year's lineup, bump the constant.
    const count = (year: number) =>
      searchCars({ filters: { year: { min: year, max: year } }, limit: 1 }).total;
    expect(count(LATEST_FULL_MODEL_YEAR)).toBeGreaterThan(1000);
    if (LATEST_MODEL_YEAR > LATEST_FULL_MODEL_YEAR) {
      expect(count(LATEST_MODEL_YEAR)).toBeLessThan(count(LATEST_FULL_MODEL_YEAR) / 2);
    }
    expect(
      searchCars({ query: `${LATEST_FULL_MODEL_YEAR} camry`, limit: 1 }).total,
    ).toBeGreaterThan(0);
  });

  it('says which model years are on file when a searched year is not', () => {
    const typed = searchCars({ query: '1985 corvette', limit: 5 });
    expect(typed.total).toBe(0);
    expect(typed.yearCoverage).toEqual({ min: FIRST_MODEL_YEAR, max: LATEST_MODEL_YEAR });

    const filtered = searchCars({ filters: { year: { min: 1980, max: 1990 } }, limit: 5 });
    expect(filtered.yearCoverage?.min).toBe(FIRST_MODEL_YEAR);
  });

  it('adds no year note when the years are covered or the miss is something else', () => {
    expect(searchCars({ query: '2019 civic', limit: 1 }).yearCoverage).toBeUndefined();
    const misspelt = searchCars({ query: '2019 zzqxv', limit: 1 });
    expect(misspelt.total).toBe(0);
    expect(misspelt.yearCoverage).toBeUndefined();
  });
  it('finds the regular F-150, not just the electric one', () => {
    // The regular truck is filed as "F150 Pickup"; the alias for "f150" is
    // "f-150", which used to match only "F-150 Lightning" (36 results).
    for (const query of ['f150', 'ford f-150', 'f 150']) {
      const { results, total } = searchCars({ query, limit: 500 });
      expect(total, query).toBeGreaterThan(200);
      expect(
        results.some((c) => c.model.startsWith('F150 Pickup')),
        query,
      ).toBe(true);
    }
  });

  it('keeps "cx-5" from matching the CX-50', () => {
    const { results } = searchCars({ query: 'cx-5', limit: 500 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => /^CX-5\b(?!0)/.test(c.model))).toBe(true);
  });

  it('reaches current half-tons and roadsters by their familiar names', () => {
    const newest = (query: string) =>
      Math.max(...searchCars({ query, limit: 500 }).results.map((c) => c.year));
    expect(newest('silverado 1500')).toBe(LATEST_FULL_MODEL_YEAR);
    expect(newest('sierra 1500')).toBe(LATEST_FULL_MODEL_YEAR);
    expect(newest('miata')).toBe(LATEST_FULL_MODEL_YEAR);
  });

  it('ranks a model-name match above a trim-only match', () => {
    // EPA files the Golf R under a "golf-gti" base model, so both mention GTI.
    const [top] = searchCars({
      query: 'gti',
      sort: { field: 'relevance', order: 'desc' },
      limit: 1,
    }).results;
    expect(top.model).toBe('Golf GTI');
  });
  it('suggests the regular F-150 and puts whole-model suggestions first', () => {
    const f150 = getSearchSuggestions('f150', 6).map((s) => s.label);
    expect(f150[0]).toMatch(/^Ford F150 Pickup/);

    // "Toyota Camry" searches every Camry, so it leads the trims.
    expect(getSearchSuggestions('camry', 6)[0].label).toBe('Toyota Camry');
  });
  it('resolves BMW series and Mercedes classes to their EPA model names', () => {
    const all = (query: string) => searchCars({ query, limit: 500 }).results;
    const threeSeries = all('bmw 3 series');
    expect(threeSeries.length).toBeGreaterThan(50);
    expect(
      threeSeries.every((c) => c.make === 'BMW' && /^(M?3\d\d|M3|ActiveHybrid 3)/.test(c.model)),
    ).toBe(true);

    for (const query of ['c class', 'mercedes c-class']) {
      const cClass = all(query);
      expect(cClass.length, query).toBeGreaterThan(20);
      expect(
        cClass.every((c) => /^(AMG )?C ?\d/.test(c.model)),
        query,
      ).toBe(true);
    }
    expect(all('g wagon').every((c) => /^(AMG )?G ?\d/.test(c.model))).toBe(true);
    expect(getSearchSuggestions('3 series', 4)[0].label).toBe('BMW 3 Series');
  });

  it('never reads a fragment of a make as a typo of it', () => {
    // "gle" is inside "eagle"; it used to filter the search down to Eagles.
    const { results } = searchCars({ query: 'gle', limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.make === 'Mercedes-Benz')).toBe(true);

    // Real typos still resolve.
    expect(searchCars({ query: 'toyata camry', limit: 5 }).results[0].make).toBe('Toyota');
    expect(searchCars({ query: 'land rovr', limit: 5 }).results[0].make).toBe('Land Rover');
  });
  it('leads each model family with its newest year', () => {
    // The Camry is hybrid-only since 2025 ("Camry HEV …"); the plain name
    // stopped at 2024 and used to represent the family.
    for (const query of ['camry', 'corolla', 'accord', 'civic']) {
      const [top] = searchCars({
        query,
        collapseByModel: true,
        sort: { field: 'relevance', order: 'desc' },
        limit: 1,
      }).results;
      expect(top.year, query).toBeGreaterThanOrEqual(LATEST_FULL_MODEL_YEAR);
    }
  });

  it('finds trims EPA leaves out of the model name', () => {
    // "mustang gt": the V8 Mustang (EPA's "Mustang"), not the EcoBoost or the
    // Mach-E GT.
    const gt = searchCars({ query: 'mustang gt', limit: 500 }).results;
    expect(gt.some((c) => c.make === 'Ford' && c.model === 'Mustang' && c.variant === 'GT')).toBe(
      true,
    );
    expect(gt.some((c) => c.variant === 'EcoBoost')).toBe(false);
    expect(gt.some((c) => /mach-e/i.test(c.model))).toBe(false);

    // The 2019+ Type R is a "Civic 5Dr" to EPA.
    const typeR = searchCars({ query: 'civic type r', limit: 50 }).results;
    expect(typeR.some((c) => c.model === 'Civic 5Dr' && c.year >= 2019)).toBe(true);
    expect(typeR.every((c) => c.variant === 'Type R' || /type r/i.test(c.model))).toBe(true);

    // "STI" is also a tiny EPA make; it must not swallow the query.
    const sti = searchCars({ query: 'wrx sti', limit: 50 }).results;
    expect(sti.length).toBeGreaterThan(10);
    expect(sti.every((c) => c.make === 'Subaru')).toBe(true);
    expect(sti.every((c) => /sti/i.test(`${c.model} ${c.variant ?? ''}`))).toBe(true);
  });

  it('reads body-style, fuel and drive words when the phrase is not a model', () => {
    const hybridSuv = searchCars({ query: 'hybrid suv', limit: 50 });
    expect(hybridSuv.total).toBeGreaterThan(100);
    expect(
      hybridSuv.results.every(
        (c) =>
          c.bodyStyle === 'suv' &&
          (c.engine.fuelType === 'hybrid' || c.engine.fuelType === 'plug-in hybrid'),
      ),
    ).toBe(true);

    const hatch = searchCars({ query: 'mazda 3 hatchback', limit: 50 }).results;
    expect(hatch.length).toBeGreaterThan(10);
    expect(hatch.every((c) => c.make === 'Mazda' && c.bodyStyle === 'hatchback')).toBe(true);

    // A model name that contains the word still wins: every RAV4 Hybrid, and
    // only RAV4 Hybrids (the 2026 plug-in's name has the word too).
    const rav4 = searchCars({ query: 'rav4 hybrid', limit: 50 }).results;
    expect(rav4.length).toBeGreaterThan(5);
    expect(rav4.every((c) => /^RAV4 (?:Plug-in )?Hybrid/.test(c.model))).toBe(true);
  });

  it('does not read "minivan" as MINI + "van"', () => {
    const { results, total } = searchCars({ query: 'minivan', limit: 50 });
    expect(total).toBeGreaterThan(100);
    expect(results.every((c) => c.bodyStyle === 'minivan')).toBe(true);
    // Glued make + model still splits.
    const mazda3 = searchCars({ query: 'mazda3', limit: 20 }).results;
    expect(mazda3.every((c) => c.make === 'Mazda' && /^3\b/.test(c.model))).toBe(true);
  });

  it('sets aside trim words EPA does not record, and says so', () => {
    // These all found nothing: EPA names no trim levels.
    const civic = searchCars({ query: 'honda civic ex', limit: 20 });
    expect(civic.total).toBeGreaterThan(50);
    expect(civic.results.every((c) => c.make === 'Honda' && /^civic/i.test(c.model))).toBe(true);
    expect(civic.interpretation?.ignored).toEqual(['ex']);
    const runner = searchCars({ query: 'toyota 4runner trd pro', limit: 20 });
    expect(runner.results.every((c) => /^4runner/i.test(c.model))).toBe(true);
    expect(runner.interpretation?.ignored).toEqual(['trd', 'pro']);
    // Years stay: only 2021 Highlanders.
    const highlander = searchCars({ query: 'toyota highlander platinum 2021', limit: 50 });
    expect(highlander.total).toBeGreaterThan(0);
    expect(highlander.results.every((c) => c.year === 2021)).toBe(true);
    // A query that finds something is never relaxed.
    expect(searchCars({ query: 'honda civic', limit: 1 }).interpretation).toBeUndefined();
    // Nothing that names no vehicle once relaxed.
    expect(searchCars({ query: 'qwertyuiop asdfghjkl', limit: 1 }).total).toBe(0);
  });

  it('reads price phrases and "cheapest"', () => {
    const under = searchCars({ query: 'suv under 30k', limit: 50 });
    expect(under.interpretation?.price).toEqual({ max: 30_000 });
    expect(under.results.every((c) => c.bodyStyle === 'suv' && c.price!.msrp! <= 30_000)).toBe(
      true,
    );
    const commas = searchCars({ query: 'sedan below $25,000', limit: 5 });
    expect(commas.interpretation?.price).toEqual({ max: 25_000 });
    // A year is not a price.
    expect(
      searchCars({ query: 'civic under 2015', limit: 1 }).interpretation?.price,
    ).toBeUndefined();
    const cheap = searchCars({
      query: 'cheap sedan',
      sort: { field: 'relevance', order: 'desc' },
      limit: 20,
    });
    expect(cheap.interpretation?.sortedBy).toBe('price');
    expect(cheap.results.every((c) => c.year >= cheap.interpretation!.recentFrom!)).toBe(true);
    const prices = cheap.results.map((c) => c.price!.msrp!);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('finds badge-first names and trims EPA files under the base model', () => {
    // "AMG G63" (2016 on) as well as "G63 AMG" (2013-15).
    const g63 = searchCars({ query: 'g63', limit: 100 }).results;
    expect(g63.some((c) => c.model.startsWith('AMG G63'))).toBe(true);
    expect(g63.some((c) => c.model.startsWith('G63 AMG'))).toBe(true);
    // The 2007-14 Shelby GT500 is a plain "Mustang"; and no Mercedes G500s.
    const gt500 = searchCars({ query: 'gt500', limit: 100 }).results;
    expect(gt500.some((c) => c.model === 'Mustang' && c.variant === 'Shelby GT500')).toBe(true);
    expect(gt500.every((c) => c.make === 'Ford')).toBe(true);
    expect(
      // EPA filed the 2013-14 Viper under the make "SRT".
      searchCars({ query: 'viper', limit: 100 }).results.some((c) => c.make === 'SRT'),
    ).toBe(true);
  });

  it('reads year ranges, new and used, order, gearbox, engine and seating', () => {
    const years = (q: string) => {
      const { results, total } = searchCars({ query: q, limit: 500 });
      expect(total, q).toBeGreaterThan(0);
      return new Set(results.map((c) => c.year));
    };
    expect([...years('2015-2018 accord')].sort()).toEqual([2015, 2016, 2017, 2018]);
    expect([...years('accord 2015 to 2018')].sort()).toEqual([2015, 2016, 2017, 2018]);
    expect(Math.min(...years('civic since 2020'))).toBe(2020);
    const fresh = searchCars({ query: 'new camry', limit: 50 });
    expect(fresh.results.every((c) => c.model.toLowerCase().includes('camry'))).toBe(true);
    expect(fresh.interpretation?.newestFrom).toBe(LATEST_FULL_MODEL_YEAR);
    // "New" in a name is the name.
    expect(searchCars({ query: 'new beetle', limit: 5 }).results[0].model).toMatch(/^New Beetle/);
    expect(searchCars({ query: 'used civic', limit: 5 }).total).toBeGreaterThan(100);

    const efficient = searchCars({
      query: 'most fuel efficient suv',
      sort: { field: 'relevance', order: 'desc' },
      limit: 20,
    });
    expect(efficient.interpretation?.sortedBy).toBe('fuelEconomy');
    const mpg = efficient.results.map((c) => c.fuelEconomy.combined ?? 0);
    expect(mpg).toEqual([...mpg].sort((a, b) => b - a));

    const manual = searchCars({ query: 'stick shift sedan', limit: 50 }).results;
    expect(manual.every((c) => c.transmission.type === 'manual' && c.bodyStyle === 'sedan')).toBe(
      true,
    );
    const v8 = searchCars({ query: 'v8 truck', limit: 50 }).results;
    expect(v8.length).toBeGreaterThan(0);
    expect(v8.every((c) => c.engine.cylinders === 8 && c.bodyStyle === 'truck')).toBe(true);
    // A name that says V8 keeps its V12 sibling out.
    expect(
      searchCars({ query: 'vantage v8', limit: 50 }).results.every((c) => c.engine.cylinders === 8),
    ).toBe(true);

    const threeRow = searchCars({ query: 'third row suv', limit: 200 });
    expect(threeRow.interpretation?.threeRow).toBe(true);
    const names = threeRow.results.map((c) => `${c.make} ${c.model}`);
    expect(names.some((n) => /Telluride|Palisade|Highlander|Pilot|Tahoe|Explorer/.test(n))).toBe(
      true,
    );
    expect(names.some((n) => /RAV4|CR-V|Rogue Sport|Corolla/.test(n))).toBe(false);
  });

  it('shows both sides of a comparison, and treats plain words as what they mean', () => {
    const both = searchCars({ query: 'honda accord vs toyota camry', limit: 10 });
    expect(both.interpretation?.compared).toEqual(['honda accord', 'toyota camry']);
    expect(new Set(both.results.map((c) => c.make))).toEqual(new Set(['Honda', 'Toyota']));
    // "beetle" is two edits from "bentley": it found every Bentley.
    expect(
      searchCars({ query: 'beetle', limit: 20 }).results.every((c) => c.make === 'Volkswagen'),
    ).toBe(true);
    // "truck" is pickups, not the 1990s models EPA calls "Truck".
    expect(searchCars({ query: 'truck', limit: 1 }).total).toBeGreaterThan(1000);
  });

  it('reads EV range, and names that span makes or bases', () => {
    const longest = searchCars({
      query: 'longest range ev',
      sort: { field: 'relevance', order: 'desc' },
      limit: 20,
    });
    expect(longest.interpretation?.sortedBy).toBe('range');
    const ranges = longest.results.map((c) => c.epa?.rangeMiles ?? 0);
    expect(ranges).toEqual([...ranges].sort((a, b) => b - a));
    const km = searchCars({ query: 'suv 400 km range', limit: 50 });
    expect(km.interpretation?.minRangeMiles).toBe(249);
    expect(km.results.every((c) => (c.epa?.rangeMiles ?? 0) >= 249 && c.bodyStyle === 'suv')).toBe(
      true,
    );
    // "i4" is BMW's electric sedan, not "inline four".
    expect(
      searchCars({ query: 'bmw i4', limit: 10 }).results.every((c) => /^i4\b/.test(c.model)),
    ).toBe(true);
    // "hummer" is also the old HUMMER make.
    expect(
      searchCars({ query: 'hummer ev', limit: 10 }).results.every((c) => c.make === 'GMC'),
    ).toBe(true);
    // Both Lightnings, the electric one first.
    const lightning = searchCars({
      query: 'ford lightning',
      sort: { field: 'relevance', order: 'desc' },
      limit: 50,
    }).results;
    expect(lightning[0].model).toMatch(/^F-150 Lightning/);
    expect(lightning.some((c) => /^Lightning/.test(c.model))).toBe(true);
  });

  it('lists keyword-only searches newest first', () => {
    // Scoring "electric pickup" against model names put a 1998 S10 Electric first.
    const { results } = searchCars({
      query: 'electric pickup',
      sort: { field: 'relevance', order: 'desc' },
      limit: 10,
    });
    expect(results[0].year).toBeGreaterThanOrEqual(LATEST_FULL_MODEL_YEAR);
  });

  it('reads kinds of vehicle: sizes, segments and luxury', () => {
    const search = (query: string) =>
      searchCars({ query, sort: { field: 'relevance', order: 'desc' }, limit: 200 });
    const compactSuv = search('compact suv');
    expect(compactSuv.interpretation?.vehicleClass).toBe('compact SUVs');
    const models = compactSuv.results.map((c) => `${c.make} ${c.model}`);
    expect(models.some((m) => /RAV4|CR-V|Rogue|CX-5|Tucson/.test(m))).toBe(true);
    expect(models.filter((m) => /Highlander|Tahoe|HR-V|X3|GLC/.test(m))).toEqual([]);

    const midsize = search('midsize sedan').results;
    expect(midsize.every((c) => c.bodyStyle === 'sedan')).toBe(true);
    expect(midsize.some((c) => /^Camry|^Accord|^Sonata|^K5/.test(c.model))).toBe(true);
    expect(midsize.filter((c) => /^Civic|^Corolla/.test(c.model))).toEqual([]);

    const sports = search('sports car under 40k').results;
    expect(sports.length).toBeGreaterThan(5);
    expect(
      sports.every((c) => ['sports-car', 'supercar', 'muscle'].includes(c.shoppingSegment!)),
    ).toBe(true);
    const muscle = search('muscle car').results;
    expect(muscle.some((c) => /Mustang|Camaro|Challenger/.test(c.model))).toBe(true);
    expect(muscle.filter((c) => c.make === 'Porsche')).toEqual([]);

    const luxurySuv = search('luxury suv').results;
    expect(luxurySuv.every((c) => c.bodyStyle === 'suv')).toBe(true);
    expect(luxurySuv.filter((c) => ['Toyota', 'Honda', 'Kia'].includes(c.make))).toEqual([]);
    expect(
      search('off road suv').results.some((c) => /Wrangler|Bronco|4Runner/.test(c.model)),
    ).toBe(true);
  });

  it('reads everyday words: family, safest, and words with no meaning', () => {
    const family = searchCars({ query: 'best suv for family', limit: 50 });
    // "for" found only Fords.
    expect(new Set(family.results.map((c) => c.make)).size).toBeGreaterThan(3);
    expect(family.results.every((c) => c.bodyStyle === 'suv')).toBe(true);
    expect(family.interpretation?.unmeasured).toEqual(['best']);
    const cheap = searchCars({ query: 'cheap reliable car', limit: 5 });
    expect(cheap.total).toBeGreaterThan(0);
    expect(cheap.results[0].year).toBeGreaterThanOrEqual(LATEST_FULL_MODEL_YEAR - 10);
    const safest = searchCars({ query: 'safest minivan', limit: 5 }).results;
    expect(safest[0].safetyRating?.overall).toBe(5);
  });

  it('reads a body word beside an explicit body filter, as Browse presets send', () => {
    // "truck" stayed as text and had to appear in the model name: 1990s "Truck"s.
    const trucks = searchCars({
      query: 'full size truck',
      filters: { bodyStyle: ['truck'], driveType: ['AWD', '4WD'] },
      sort: { field: 'year', order: 'desc' },
      limit: 20,
    });
    expect(trucks.interpretation?.vehicleClass).toBe('full-size pickups');
    // A Ram's make is the name ("Ram 1500 4WD"), so read make and model together.
    expect(
      trucks.results.some((c) => /Silverado|F150|Ram|Tundra|Sierra/.test(`${c.make} ${c.model}`)),
    ).toBe(true);
    expect(trucks.results.filter((c) => /^Truck/.test(c.model))).toEqual([]);
  });

  it('reads class words as words where they name a model or a trim', () => {
    // "Sport Sedan" is part of a Saab's name; "Premium" and "Big Horn" are trims.
    const saab = searchCars({ query: 'saab 9-3 sport sedan', limit: 5 });
    expect(saab.results[0]?.model).toMatch(/9-3 Sport Sedan/);
    const outback = searchCars({ query: 'subaru outback premium', limit: 5 });
    expect(outback.results[0]?.model).toMatch(/Outback/);
    expect(outback.interpretation?.vehicleClass).toBeUndefined();
    const ram = searchCars({ query: 'ram 1500 big horn', limit: 5 });
    expect(ram.results[0]?.model).toMatch(/1500/);
    expect(ram.interpretation?.vehicleClass).toBeUndefined();
  });

  it('finds model codes typed with a space or as a short word', () => {
    const first = (q: string) => searchCars({ query: q, limit: 5, collapseByModel: true });
    // "lexus is 350" found nothing once "is" was a stop word; "rav 4" found
    // only the 2001-12 RAV4 4WD.
    expect(first('lexus is 350').results[0]?.model).toMatch(/^IS 350/);
    expect(first('is 350').results[0]?.model).toMatch(/^IS 350/);
    expect(first('rav 4').results[0]?.year).toBeGreaterThanOrEqual(LATEST_FULL_MODEL_YEAR);
    expect(first('id4').results[0]?.model).toMatch(/^ID\.4/);
    expect(first('town & country').results[0]?.model).toMatch(/^Town and Country/);
    // "ix" matched inside "Matrix" and "Grand Prix".
    const ix = first('ix').results;
    expect(ix.length).toBeGreaterThan(0);
    expect(ix.every((c) => c.make === 'BMW')).toBe(true);
  });

  it('lists the rivals of a car named after "like"', () => {
    const civic = searchCars({ query: 'cars like a civic', limit: 24 });
    // The base Civic, not the Si its first result was: rivals are compacts.
    expect(civic.interpretation?.similarTo?.label).toBe(`${LATEST_FULL_MODEL_YEAR} Honda Civic`);
    const makes = civic.results.map((c) => `${c.make} ${c.model}`);
    expect(makes.some((m) => /Toyota Corolla/.test(m))).toBe(true);
    expect(makes.some((m) => /Honda Civic/.test(m))).toBe(false);

    expect(
      searchCars({ query: 'miata competitors', limit: 5 }).interpretation?.similarTo,
    ).toBeTruthy();
    // Words before "like" narrow the rivals.
    const awd = searchCars({ query: 'awd cars like a camry', limit: 24 }).results;
    expect(awd.length).toBeGreaterThan(0);
    expect(awd.every((c) => c.driveType === 'AWD' || c.driveType === '4WD')).toBe(true);
    // "like new" is a condition, not a comparison.
    const likeNew = searchCars({ query: 'like new civic', limit: 5 });
    expect(likeNew.interpretation?.similarTo).toBeUndefined();
    expect(likeNew.results[0]?.model).toMatch(/^Civic/);
    // Nothing named: an ordinary search.
    expect(
      searchCars({ query: 'cars like xyzzy', limit: 5 }).interpretation?.similarTo,
    ).toBeUndefined();
  });

  it('reads currency words and "grand" in price phrases', () => {
    // "dollars" was read as a name and found nothing; "cad" as Cadillac.
    const dollars = searchCars({ query: 'suv under 20000 dollars', limit: 5 });
    expect(dollars.interpretation?.price).toEqual({ max: 20000 });
    expect(dollars.total).toBeGreaterThan(0);
    const cad = searchCars({ query: 'sedan under 25k cad', limit: 50 }).results;
    expect(new Set(cad.map((c) => c.make)).size).toBeGreaterThan(3);
    expect(searchCars({ query: 'truck under 30 grand', limit: 5 }).interpretation?.price).toEqual({
      max: 30000,
    });
    // Cadillac itself is still Cadillac.
    const caddy = searchCars({ query: 'cadillac under 30k', limit: 20 }).results;
    expect(caddy.length).toBeGreaterThan(0);
    expect(caddy.every((c) => c.make === 'Cadillac')).toBe(true);
  });

  it('reads price ranges, first cars and snow', () => {
    const range = searchCars({ query: 'between 20k and 30k suv', limit: 50 });
    expect(range.interpretation?.price).toEqual({ min: 20000, max: 30000 });
    expect(range.total).toBeGreaterThan(0);
    expect(searchCars({ query: 'suv 20-30k', limit: 1 }).interpretation?.price).toEqual({
      min: 20000,
      max: 30000,
    });

    // It listed every car newest first, a Lotus Emira at the top.
    const first = searchCars({ query: 'good first car for a teenager', limit: 200 });
    expect(first.total).toBeGreaterThan(20);
    for (const car of first.results) {
      expect(car.price?.msrp ?? 0).toBeLessThanOrEqual(18000);
      expect(car.year).toBeGreaterThanOrEqual(2010);
      expect(car.fuelEconomy.combined).toBeGreaterThanOrEqual(28);
      expect(['hydrogen', 'natural gas']).not.toContain(car.engine.fuelType);
    }
    // A price in the query wins over the preset's.
    const cheaper = searchCars({ query: 'first car under 12k', limit: 200 }).results;
    expect(cheaper.every((c) => (c.price?.msrp ?? 0) <= 12000)).toBe(true);

    const snow = searchCars({ query: 'best car for snow', limit: 100 });
    expect(snow.interpretation?.snow).toBe(true);
    expect(snow.results.every((c) => c.driveType === 'AWD' || c.driveType === '4WD')).toBe(true);
  });

  it('shows the other years of a model asked for in a year it was not made', () => {
    // "2012 ford ranger" found nothing, and said nothing.
    const ranger = searchCars({ query: '2012 ford ranger', limit: 10 });
    expect(ranger.total).toBeGreaterThan(0);
    expect(ranger.results.every((c) => /^Ranger/.test(c.model))).toBe(true);
    expect(ranger.interpretation?.otherYears?.asked).toEqual({ min: 2012, max: 2012 });
    const runs = ranger.interpretation!.otherYears!.onFile;
    expect(runs.length).toBeGreaterThan(1);
    expect(runs.some((r) => r.min <= 2012 && r.max >= 2012)).toBe(false);
    // Years outside everything on file keep their own notice.
    const old = searchCars({ query: '1985 corvette', limit: 5 });
    expect(old.total).toBe(0);
    expect(old.yearCoverage).toBeDefined();
    // A year the model was made: an ordinary search.
    expect(
      searchCars({ query: '2024 camry', limit: 5 }).interpretation?.otherYears,
    ).toBeUndefined();
  });

  it('names one car per side of a comparison, for the compare page', () => {
    const vs = searchCars({ query: 'civic vs corolla', limit: 10 }).interpretation;
    // Each side is its model's newest year, which EPA's early certifications
    // can put past the newest full year (a 2027 Corolla before any 2027 Civic).
    const labels = vs?.compareWith?.map((c) => c.label) ?? [];
    expect(labels).toHaveLength(2);
    expect(labels[0]).toMatch(/^\d{4} Honda Civic$/);
    expect(labels[1]).toMatch(/^\d{4} Toyota Corolla$/);
    for (const label of labels) {
      expect(Number(label.slice(0, 4))).toBeGreaterThanOrEqual(LATEST_FULL_MODEL_YEAR);
    }
    for (const { id } of vs!.compareWith!) expect(getCarById(id)).not.toBeNull();
    // A side that names nothing: no pair to compare.
    expect(
      searchCars({ query: 'rav4 vs xyzzy', limit: 5 }).interpretation?.compareWith,
    ).toBeUndefined();
  });

  it('finds dual-clutch gearboxes by name', () => {
    const pdk = searchCars({ query: 'porsche pdk', limit: 100 });
    expect(pdk.interpretation?.automatedManual).toBe(true);
    expect(pdk.total).toBeGreaterThan(3);
    expect(pdk.results.every((c) => /\(AM/.test(c.transmission.description ?? ''))).toBe(true);
    // "automated manual" is not a manual.
    const am = searchCars({ query: 'automated manual', limit: 50 }).results;
    expect(am.every((c) => c.transmission.type !== 'manual')).toBe(true);
  });

  it('keeps mild hybrids out of "hybrid" and finds them by name', () => {
    // A BMW 430i and an Audi S8 led "2020 or newer hybrid".
    const hybrids = searchCars({ query: 'hybrid suv', limit: 200 }).results;
    expect(hybrids.length).toBeGreaterThan(20);
    expect(hybrids.filter((c) => c.engine.mildHybrid)).toEqual([]);
    const mild = searchCars({ query: 'mild hybrid suv', limit: 200 });
    expect(mild.interpretation?.mildHybrid).toBe(true);
    expect(mild.total).toBeGreaterThan(10);
    expect(mild.results.every((c) => c.engine.mildHybrid && c.bodyStyle === 'suv')).toBe(true);
    // Every mild hybrid is listed by its fuel.
    const all = searchCars({ query: 'mild hybrid', limit: 500 }).results;
    expect(
      all.every((c) => c.engine.fuelType === 'gasoline' || c.engine.fuelType === 'diesel'),
    ).toBe(true);
  });

  it('sorts by running cost, and keeps rare fuels out of cheapest-first orders', () => {
    const own = searchCars({ query: 'cheapest gas car to own', limit: 30 });
    expect(own.interpretation?.sortedBy).toBe('runningCost');
    const costs = own.results.map((c) => c.runningCostCad!);
    expect(costs.every((c) => c > 0)).toBe(true);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
    expect(own.results.every((c) => c.engine.fuelType === 'gasoline')).toBe(true);
    // A Tucson Fuel Cell led "cheap suv".
    const cheap = searchCars({ query: 'cheap suv', limit: 100 });
    expect(cheap.interpretation?.rareFuelsLeftOut).toBe(true);
    expect(cheap.results.filter((c) => c.engine.fuelType === 'hydrogen')).toEqual([]);
    // Asked for, they are shown.
    expect(searchCars({ query: 'cheap hydrogen car', limit: 5 }).total).toBeGreaterThan(0);
    // A price ceiling too: a lease-only FCX Clarity sat among "honda under 10 grand".
    const honda = searchCars({ query: 'honda under 10 grand', limit: 100 });
    expect(honda.interpretation?.rareFuelsLeftOut).toBe(true);
    expect(honda.results.filter((c) => c.engine.fuelType === 'hydrogen')).toEqual([]);
  });

  it('reads fuel economy and horsepower figures as filters', () => {
    // "7 l/100 km" was read as a 100 km EV range and found nothing.
    const litres = searchCars({ query: 'suv under 8 l/100 km', limit: 500 });
    expect(litres.interpretation?.fuelEconomy).toEqual({ max: 8, unit: 'L/100 km' });
    expect(litres.total).toBeGreaterThan(20);
    // 8 L/100 km is 29.4 MPG: a 29 MPG SUV burns 8.1. Canadian ratings carry
    // tenths (an RVR 4WD's 29.6 MPG is 7.95 L), so test the litres as shown.
    const litresShown = (mpg = 0) => Math.round((235.215 / mpg) * 10) / 10;
    expect(litres.results.every((c) => litresShown(c.fuelEconomy.combined) <= 8)).toBe(true);
    expect(litres.results.filter((c) => c.engine.fuelType === 'electric')).toEqual([]);
    expect(litres.results.every((c) => c.bodyStyle === 'suv')).toBe(true);

    const highway = searchCars({ query: '40 mpg highway', limit: 500 });
    expect(highway.results.every((c) => (c.fuelEconomy.highway ?? 0) >= 40)).toBe(true);
    expect(highway.results.some((c) => (c.fuelEconomy.combined ?? 0) < 40)).toBe(true);

    const power = searchCars({ query: 'manual with over 300 hp', limit: 500 });
    expect(power.total).toBeGreaterThan(20);
    expect(power.results.every((c) => (c.engine.horsepower ?? 0) >= 300)).toBe(true);
    expect(power.results.every((c) => c.transmission.type === 'manual')).toBe(true);
    // Ranked by the words that name a car, not "over 200 hp": a 2008 Solara
    // convertible led the V6 Camrys.
    const camry = searchCars({ query: 'camry over 200 hp', limit: 5 });
    expect(camry.results[0].model).toMatch(/^Camry\b(?! Solara)/);
    expect(
      searchCars({ query: '300 hp', limit: 50 }).results.some((c) => /^300/.test(c.model)),
    ).toBe(false);
  });

  it('finds engines by layout and by name', () => {
    const boxers = searchCars({ query: 'boxer engine', limit: 500 });
    expect(boxers.total).toBeGreaterThan(10);
    expect(boxers.results.every((c) => /Subaru|Porsche|Toyota|Scion|RUF/.test(c.make))).toBe(true);
    expect(
      searchCars({ query: 'rotary', limit: 50 }).results.every((c) => /^RX-/.test(c.model)),
    ).toBe(true);
    // "hemi" matched a Model 3 "Premium" and a Cruze "Premier".
    const hemi = searchCars({ query: 'hemi', limit: 500 });
    expect(hemi.results.every((c) => c.engine.cylinders === 8)).toBe(true);
    expect(hemi.results.every((c) => /Chrysler|Dodge|Jeep|Ram/.test(c.make))).toBe(true);
    expect(hemi.interpretation?.engineFamily).toMatch(/Hemi V8s/);
    const ecoboost = searchCars({ query: 'ecoboost', limit: 500 });
    expect(ecoboost.total).toBeGreaterThan(8);
    expect(ecoboost.results.every((c) => c.make === 'Ford' && !!c.engine.aspiration)).toBe(true);
  });

  it('reads a V6 as a V6, an engine size, and fuels in several words', () => {
    // BMW's straight sixes led "twin turbo v6".
    const v6 = searchCars({ query: 'twin turbo v6', limit: 300 });
    expect(v6.total).toBeGreaterThan(20);
    expect(v6.results.every((c) => /^V/.test(c.engine.configuration ?? ''))).toBe(true);
    expect(v6.results.every((c) => !!c.engine.aspiration)).toBe(true);
    // "5.0" ranked as a word put "F150 5.0L 2WD FFV GVWR>7599 LBS" first.
    const f150 = searchCars({ query: 'f150 5.0', limit: 50, collapseByModel: true });
    expect(f150.interpretation?.engineSize).toBe(5);
    expect(f150.results[0].model).toMatch(/^F150 Pickup/);
    expect(
      searchCars({ query: 'f150 5.0', limit: 100 }).results.every(
        (c) => c.engine.displacement === 5,
      ),
    ).toBe(true);
    // Only models named "Plug-in Hybrid", and only the Tucson Fuel Cell.
    const phev = searchCars({ query: 'plug in hybrid suv', limit: 300 });
    expect(phev.total).toBeGreaterThan(20);
    expect(
      phev.results.every((c) => c.engine.fuelType === 'plug-in hybrid' && c.bodyStyle === 'suv'),
    ).toBe(true);
    const fuelCell = searchCars({ query: 'fuel cell', limit: 50 });
    expect(fuelCell.total).toBeGreaterThan(3);
    expect(fuelCell.results.every((c) => c.engine.fuelType === 'hydrogen')).toBe(true);
    // Trunk space is not on file; the sedans are.
    const trunk = searchCars({ query: 'sedan with big trunk', limit: 20 });
    expect(trunk.total).toBeGreaterThan(100);
    expect(trunk.interpretation?.unmeasured).toEqual(['big trunk']);
  });

  it('reads drive and body phrases, seats and doors', () => {
    // "rear wheel drive" and "four wheel drive" found nothing.
    const rwd = searchCars({ query: 'rear wheel drive sedan', limit: 200 });
    expect(rwd.total).toBeGreaterThan(20);
    expect(rwd.results.every((c) => c.driveType === 'RWD' && c.bodyStyle === 'sedan')).toBe(true);
    expect(
      searchCars({ query: 'station wagon', limit: 100 }).results.every(
        (c) => c.bodyStyle === 'wagon',
      ),
    ).toBe(true);
    const twoSeaters = searchCars({ query: '2 seater', limit: 200 });
    expect(twoSeaters.results.every((c) => c.epa?.vClass === 'Two Seaters')).toBe(true);
    // "5 seater suv" found one Isuzu with "5-passenger" in its name.
    const fiveSeats = searchCars({ query: '5 seater suv', limit: 300 });
    expect(fiveSeats.total).toBeGreaterThan(50);
    expect(fiveSeats.results.map((c) => c.model)).not.toContain('Telluride FWD');
    const twoDoors = searchCars({ query: 'two door', limit: 300 });
    expect(twoDoors.total).toBeGreaterThan(50);
    expect(twoDoors.results.every((c) => c.bodyStyle !== 'sedan')).toBe(true);
    expect(searchCars({ query: 'wrangler 2 door', limit: 5 }).results[0].model).toMatch(/2dr/);
    // Beside a truck, a door count is set aside, not a reason to find nothing.
    const trucks = searchCars({ query: '4 door truck', limit: 5 });
    expect(trucks.total).toBeGreaterThan(10);
    expect(trucks.interpretation?.unmeasured).toContain('4-door');
    // The plain name leads its year: a Camry Solara convertible stood for "2004 camry".
    expect(searchCars({ query: '2004 toyota camry', limit: 1 }).results[0].model).toBe('Camry');
  });

  it('finds a trim with words between it and the model', () => {
    // "911 gts" found only the 2011-12 "911 GTS", not the Carrera or Targa GTS.
    const gts = searchCars({ query: '911 gts', limit: 100 });
    const names = new Set(gts.results.map((c) => c.model));
    expect(names).toContain('911 GTS');
    expect(names).toContain('911 Carrera GTS');
    expect(names).toContain('911 Targa 4 GTS');
    expect(gts.results.every((c) => /\bgts\b/i.test(c.model))).toBe(true);
    expect(gts.results[0].year).toBeGreaterThanOrEqual(2025);
  });

  it('shows one row per model, keeping apart models that share a first word', () => {
    const rows = (query: string) =>
      searchCars({ query, limit: 200, collapseByModel: true }).results.map((c) => c.model);
    // "audi rs" showed one row for the RS 3, 5, 6, 7 and Q8, "jeep" hid the
    // Grand Cherokee under the Grand Wagoneer, and "mustang" the Mach-E.
    expect(rows('audi rs').length).toBeGreaterThanOrEqual(5);
    const jeep = rows('jeep grand');
    expect(jeep.some((m) => /^Grand Cherokee/.test(m))).toBe(true);
    expect(jeep.some((m) => /^Grand Wagoneer/.test(m))).toBe(true);
    expect(rows('ford mustang').some((m) => /Mach-E/.test(m))).toBe(true);
    // An engine code is not a model: one row for every 3 Series, one per class.
    expect(rows('bmw').filter((m) => /^M?3\d\d/.test(m))).toHaveLength(1);
    expect(rows('mercedes').filter((m) => /^E\d{3}\b/.test(m))).toHaveLength(1);
    // A Maybach is not an S-Class, though EPA names it "S580 4matic Maybach".
    const s580 = rows('s 580 4matic');
    expect(s580).toContain('S580 4matic');
    expect(s580).toContain('S580 4matic Maybach');
  });

  it('finds cars by where the engine sits and by what they are for', () => {
    const mid = searchCars({ query: 'mid engine', limit: 300 });
    expect(mid.total).toBeGreaterThan(50);
    expect(mid.results.some((c) => c.make === 'Chevrolet' && /^Corvette/.test(c.model))).toBe(true);
    expect(mid.results.every((c) => c.model !== 'Urus')).toBe(true);
    expect(mid.interpretation?.enginePosition).toBe('mid');
    const drift = searchCars({ query: 'drift car', limit: 100 });
    expect(drift.total).toBeGreaterThan(20);
    expect(drift.results.every((c) => c.driveType === 'RWD')).toBe(true);
    const tow = searchCars({ query: 'tow vehicle', limit: 100 });
    expect(tow.results.every((c) => c.bodyStyle === 'truck' || c.bodyStyle === 'suv')).toBe(true);
    expect(tow.interpretation?.unmeasured).toContain('towing capacity');
  });

  it('reads generations by chassis code and number', () => {
    // "e46 m3" found nothing, and "c7 corvette" a 2026 C8.
    const m3 = searchCars({ query: 'e46 m3', limit: 50 });
    expect(m3.total).toBeGreaterThan(0);
    expect(m3.results.every((c) => c.model.startsWith('M3') && c.year <= 2006)).toBe(true);
    expect(m3.interpretation?.generation).toBe('E46 BMW 3 Series, 1999–2006');
    const c7 = searchCars({ query: 'c7 corvette', limit: 50 });
    expect(c7.results.every((c) => c.year >= 2014 && c.year <= 2019)).toBe(true);
    // EPA files the C6 Z06 as a plain "Corvette"; its 7.0-litre engine names it.
    const z06 = searchCars({ query: 'c6 z06', limit: 20 });
    expect(z06.total).toBeGreaterThan(0);
    expect(z06.results.every((c) => c.engine.displacement === 7)).toBe(true);
    const tacoma = searchCars({ query: '2nd gen tacoma', limit: 100 });
    expect(tacoma.results.every((c) => c.year >= 2005 && c.year <= 2015)).toBe(true);
  });

  it('ranks without the body and fuel words read into filters', () => {
    // A 2004 "C320 4matic Sedan" led "mercedes sedan" on the word "sedan".
    const sedans = searchCars({ query: 'mercedes sedan', limit: 3, collapseByModel: true });
    expect(sedans.results.every((c) => c.year >= 2025)).toBe(true);
  });

  it('completes the name in a rivals phrase, one entry per model', () => {
    const suggestions = getSearchSuggestions('cars like a cam', 8);
    expect(suggestions[0]).toMatchObject({
      label: 'Rivals of the Toyota Camry',
      query: 'cars like a toyota camry',
    });
    const labels = suggestions.map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
    // Every Camry trim once, not a row per EPA configuration.
    expect(labels.filter((l) => /Camry (HEV|AWD|LE|XSE)/.test(l))).toEqual([]);
    expect(getSearchSuggestions('like new civ', 8).every((s) => !/^Rivals/.test(s.label))).toBe(
      true,
    );
  });

  it('suggests derived trims and body/fuel phrases, without duplicate labels', () => {
    const labels = (q: string) => getSearchSuggestions(q, 8).map((s) => s.label);
    expect(labels('mustang gt')[0]).toBe('Ford Mustang GT');
    expect(labels('wrx st')).toContain('Subaru WRX STI');
    expect(labels('challenger hell')).toContain('Dodge Challenger Hellcat');
    expect(labels('hybrid s')).toContain('Hybrid SUVs');
    expect(labels('third')).toContain('Third-row SUVs');
    expect(labels('cheap')).toContain('Cheapest SUVs');
    expect(labels('longest')).toContain('Longest-range EVs');
    expect(labels('compact')).toContain('Compact SUVs');
    expect(labels('muscle')).toContain('Muscle cars');
    const typeR = labels('civic type r');
    expect(typeR.filter((l) => l === 'Honda Civic Type R')).toHaveLength(1);
  });
});
