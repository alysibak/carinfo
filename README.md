# CarInfo

A full-stack car discovery and comparison platform. **Specs-first** — EPA fuel economy, engine, emissions, and safety (when available) — with clearly labeled **estimated** market value, running cost, and TCO analytics.

- **~36,800 vehicles** (1995–2027) across **92 makes**: EPA's catalogue, and 445 cars sold in Canada that EPA never rated, from Natural Resources Canada
- Primary data: [EPA FuelEconomy.gov](https://fueleconomy.gov)
- Secondary: NHTSA safety (when enriched), EPA Test Car List horsepower, heuristic valuation
- Default regional model: **Ontario, CAD**

---

## Table of contents

1. [Quick start](#quick-start)
2. [What you get](#what-you-get)
3. [Data coverage](#data-coverage)
4. [Data model](#data-model)
5. [Build the database](#build-the-database)
6. [Enrichment system](#enrichment-system)
7. [Taxonomy & fuel-type correction](#taxonomy--fuel-type-correction)
8. [NHTSA safety resolution](#nhtsa-safety-resolution)
9. [API reference](#api-reference)
10. [Routes & pages](#routes--pages)
11. [Navigation & user flows](#navigation--user-flows)
12. [Curated collections](#curated-collections)
13. [Browse taxonomy](#browse-taxonomy)
14. [Landing page systems](#landing-page-systems)
15. [Car detail / dossier UI](#car-detail--dossier-ui)
16. [Compare page](#compare-page)
17. [Smart search & persona quiz](#smart-search--persona-quiz)
18. [Garage & sharing](#garage--sharing)
19. [Spec glossary](#spec-glossary)
20. [KeySpecs groups](#keyspecs-groups)
21. [Ownership & valuation model](#ownership--valuation-model)
22. [Similar vehicles](#similar-vehicles)
23. [VIN decoder](#vin-decoder)
24. [Provenance system](#provenance-system)
25. [Missing-data policy & labels](#missing-data-policy--labels)
26. [Complete file inventory](#complete-file-inventory)
27. [State management](#state-management)
28. [Client utilities reference](#client-utilities-reference)
29. [Server utilities reference](#server-utilities-reference)
30. [Deployment](#deployment)
31. [Scripts reference](#scripts-reference)
32. [Dependencies](#dependencies)
33. [Code reference](#code-reference)
34. [Known limitations](#known-limitations)
35. [Roadmap](#roadmap)
36. [License](#license)

---

## Quick start

Requires **Node 24** (see `.nvmrc`; 22 also works) and npm.

```bash
npm ci
npm run dev          # client :3000, server :5000 (Vite proxies /api)
```

Production locally:

```bash
npm run build        # server, prebuilt cars-ready.json, client, sitemap
npm run start        # Express serves the API and the built SPA on :5000
```

Before pushing, run what CI runs:

```bash
npm run verify           # lint + typecheck + unit tests
npm run format:check
npm run validate:data    # corpus invariants over cars-ready.json
npm run test:e2e         # Playwright: trust path + axe accessibility sweep
```

The Postgres-backed suites (accounts, billing webhook) run when `TEST_DATABASE_URL`
points at a scratch database and skip otherwise.

### Reading source files (not diffs)

This README quotes **actual source** in [Code reference](#code-reference). To read or edit a file in the IDE:

1. Open it from the file tree (e.g. `client/src/pages/CarDetail.tsx`) — that is the real file.
2. If Cursor opens an **agent diff** (green/red) after a chat edit, click **Open File** or double-click the path in the explorer to see the full current code.
3. Use **Search** (`Ctrl+P` / `Cmd+P`) and type the filename to jump straight to source.

---

## What you get

| Data                                                                   | Source              | In UI            | Notes                        |
| ---------------------------------------------------------------------- | ------------------- | ---------------- | ---------------------------- |
| MPG/MPGe, engine, drive, transmission, CO₂, annual fuel cost, EV range | EPA FuelEconomy.gov | Verified         | In `cars.json`               |
| GHG score, barrels/yr, 5-yr fuel savings, PHEV dual-mode               | EPA `vehicles.csv`  | Verified         | `epa-enrichment.json`        |
| Rated horsepower                                                       | EPA Test Car List   | Verified         | `horsepower-enrichment.json` |
| EV horsepower (no test-car match)                                      | Manufacturer, by trim | **Est.**       | `ev-power-estimates.ts`      |
| Safety star ratings                                                    | NHTSA               | Verified         | When enriched                |
| Market value, running cost, TCO, resale                                | Depreciation model  | **Est.**         | Ontario/CAD                  |
| Predicted 0–60                                                         | HP/weight heuristic | **Est.**         | `predictZeroToSixty()`       |
| Shopping segment, ownership profile                                    | Taxonomy rules      | **Est.**         | `vehicle-taxonomy.ts`        |
| Dimensions, real 0–60, top speed, torque                               | Not in EPA bulk     | Omitted          | Compare hides empty rows     |
| Listing photos                                                         | N/A                 | Placeholder PNGs | Body-type illustrations only |

---

## Data coverage

### Database totals

| Metric                        | Count                           |
| ----------------------------- | ------------------------------- |
| Total vehicles                | 36,938 (36,936 after ID merges) |
| From EPA / from NRCan         | 36,314 / 624                    |
| Year range                    | 1995–2027 (2027 partial)        |
| Makes                         | 92                              |
| EPA enrichment records        | 36,314                          |
| Horsepower enrichment keys    | 20,043 (~55%)                   |
| NHTSA combo ratings           | 1,028 `make\|model\|year`       |
| NHTSA per-car index           | 4,617 (12.6%)                   |
| Turbocharged / supercharged   | 11,600                          |
| NHTSA cache lookups attempted | 13,842                          |

### Body style breakdown

| Body style | Count  |
| ---------- | ------ |
| sedan      | 16,599 |
| suv        | 10,584 |
| truck      | 4,132  |
| coupe      | 2,046  |
| wagon      | 1,869  |
| van        | 889    |
| minivan    | 601    |
| hatchback  | 39     |

### Fuel types

Stored in `cars.json` as EPA classifies them (`scripts/reconcile-fuel-types.ts`
re-derives them from EPA's `vehicles.csv`): gasoline, diesel, hybrid, plug-in
hybrid, electric, hydrogen, and natural gas (dedicated CNG, e.g. the Civic GX).
Bi-fuel and flex-fuel vehicles are gasoline, since their EPA figures are
gasoline figures. Mild hybrids (EPA's atvType "Hybrid" with "Mild Hybrid" in
the engine notes: 12-48 V motors that assist but never drive the car, 774
records from Audi S8s to Ram eTorques) are listed by their fuel with
`engine.mildHybrid`, so "hybrid" means a full hybrid; EPA also calls the Lexus
UX 250h "Mild Hybrid", and its Ni-MH pack keeps it a hybrid. The runtime rules in `fuel-type-inference.ts` remain as a
second line of defense and agree with EPA on every record (a test pins that).

### Field coverage in raw `cars.json`

| Field                | Records |
| -------------------- | ------- |
| trim                 | 36,938  |
| engine.configuration | 31,428  |
| engine.aspiration    | 11,618  |
| transmission.speeds  | 23,304  |
| countryOfOrigin      | 36,938  |
| epa.co2              | 18,921  |
| epa.charge240Hours   | 2,130   |
| epa.charge120Hours   | 1       |
| dimensions           | 0       |
| performance          | 0       |
| safetyRating         | 0       |
| engine.horsepower    | 0       |
| epa.ghgScore         | 0       |

Enrichment adds HP, GHG, safety, corrected PHEV/EV economy at load time.

### Vehicle ID format

Slug derived from EPA record, e.g. `acura-nsx-1995-nsx-2mode-clkup-automatic-4-spd`. Each `id` is unique per EPA configuration (trim/transmission variant).

### Data files

| File                                          | Keyed by            | Contents                                       | Git                          |
| --------------------------------------------- | ------------------- | ---------------------------------------------- | ---------------------------- |
| `server/data/cars.json`                       | `id`                | Master vehicle DB                              | Committed                    |
| `server/data/epa-enrichment.json`             | `epaId`             | GHG, barrels, PHEV, EV kWh/range, charge times | Committed                    |
| `server/data/horsepower-enrichment.json`      | `epaId`             | EPA test-car rated HP                          | Committed                    |
| `server/data/nhtsa-safety.json`               | `make\|model\|year` | NHTSA star ratings                             | Committed                    |
| `server/data/nhtsa-by-car-id.json`            | `id`                | Pre-resolved NHTSA per vehicle                 | New/untracked                |
| `server/data/raw/vehicles.csv`                | —                   | EPA source CSV                                 | Gitignored                   |
| `server/data/raw/nhtsa-enrichment-cache.json` | —                   | NHTSA API cache                                | Gitignored                   |
| `server/data/raw/nrcan/*.csv`                 | —                   | NRCan fuel consumption ratings                 | Gitignored                   |
| `server/data/raw/test-car-data/*.csv`         | —                   | EPA test car list per year                     | Gitignored                   |
| `server/data/manual-prices.json`              | —                   | Optional MSRP overrides keyed by car id        | Not present (build skips it) |

---

## Data model

Types live in `client/src/types/car.types.ts` and `server/src/types/car.types.ts` (mirrored).

### `CarSpecs` — core vehicle record

| Field                   | Type                   | Notes                                                                                                                                                                                                                                                                         |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | string                 | Unique slug                                                                                                                                                                                                                                                                   |
| `make`, `model`, `year` | string/number          |                                                                                                                                                                                                                                                                               |
| `trim`                  | string?                | EPA trim slug (cleaned for display)                                                                                                                                                                                                                                           |
| `countryOfOrigin`       | string?                | From NHTSA cache when available                                                                                                                                                                                                                                               |
| `epaId`                 | number?                | EPA `vehicles.csv` id                                                                                                                                                                                                                                                         |
| `provenance`            | `Provenance`           | Per-field source map                                                                                                                                                                                                                                                          |
| `vehicleCategory`       | `car\|suv\|truck\|van` | Computed                                                                                                                                                                                                                                                                      |
| `shoppingSegment`       | `ShoppingSegment`      | Computed                                                                                                                                                                                                                                                                      |
| `ownershipProfile`      | object?                | Label, tags, bestFor                                                                                                                                                                                                                                                          |
| `runningCostCad`        | number?                | Yearly running cost (energy, insurance, maintenance, tires, registration), CAD, Ontario baseline, for sorting; absent for hydrogen cars and cars the site does not value |
| `engine`                | object                 | displacement, hp, torque, fuelType, cylinders, configuration (the layout, "V6", "Flat-4", "W12", "Rotary", from the engine family by `utils/engine-layout.ts`: EPA records only a count, and the count alone made every six an "I6"), aspiration, `horsepowerBasis` (`manufacturer` for our manufacturer and EV motor ratings, `sibling` for a copy from the same engine in the same model), `mildHybrid` (a 12-48 V mild hybrid, listed by its fuel) |
| `performance`           | object?                | zeroToSixty, topSpeed, quarterMile (always empty in prod DB)                                                                                                                                                                                                                  |
| `dimensions`            | object?                | length, width, height, wheelbase, curbWeight (always empty in prod DB)                                                                                                                                                                                                        |
| `fuelEconomy`           | object                 | city, highway, combined                                                                                                                                                                                                                                                       |
| `epa`                   | object?                | co2, annualFuelCost, rangeMiles, kWhPer100Mi, charge times, vClass, ghgScore, fuelSavings5yrUsd, barrelsPerYear, phev                                                                                                                                                         |
| `transmission`          | object                 | type, speeds, description. EPA's `AV` and `AV-S7` codes are CVTs (the number is the simulated steps a select shift offers), read as `cvt` at load; `speeds` keeps the step count                                                                                              |
| `driveType`             | FWD/RWD/AWD/4WD        |                                                                                                                                                                                                                                                                               |
| `bodyStyle`             | BodyStyle              | May be corrected from EPA VClass                                                                                                                                                                                                                                              |
| `safetyRating`          | object?                | overall, frontal, side, rollover                                                                                                                                                                                                                                              |
| `price`                 | object?                | msrp, min, max, isEstimated, confidence                                                                                                                                                                                                                                       |
| `images`                | string[]?              | Unused in prod                                                                                                                                                                                                                                                                |
| `productionYears`       | object?                | start, end                                                                                                                                                                                                                                                                    |

### `CarDashboard` — dossier API response

| Field               | Description                                                                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `car`               | Enriched, normalized `CarSpecs` with display price                                                                                                                                                                                                |
| `segmentCount`      | Size of comparison segment                                                                                                                                                                                                                        |
| `ownership`         | Full `OwnershipEconomics`                                                                                                                                                                                                                         |
| `dealRating`        | Always `null` (disabled)                                                                                                                                                                                                                          |
| `annualRunningCost` | low/high/mid or null                                                                                                                                                                                                                              |
| `tco5Year`          | low/high/mid or null                                                                                                                                                                                                                              |
| `evCharge`          | charge120/240, kWh/100mi, range (EV/FCEV)                                                                                                                                                                                                         |
| `fieldProvenance`   | Merged provenance for analytics fields                                                                                                                                                                                                            |
| `zeroToSixty`       | `{ value, method: 'actual'\|'predicted', confidence }`                                                                                                                                                                                            |
| `competitiveClass`  | The class it is shopped in (`"Compact SUV"`), from `utils/competitive-sets.ts`, with a second that qualifies it where it has one (`"Full-size luxury SUV · Off-roader"`, `"Midsize SUV · Three-row SUV"`); absent for the ~1% of listings in none |
| `generation`        | The model's generation, from `utils/generations.ts` (`"E46 · 4th generation (1999–2006)"`, `"2nd generation (2005–2015)"`), for about 30% of listings; absent in a year two generations share (a 2006 3 Series is an E46 or an E90)               |
| `enginePosition`    | `"mid"` or `"rear"` from `utils/engine-position.ts`; absent for front-engined and electric cars                                                                                                                                                   |
| `classComparison`   | The car against its class (`utils/class-comparison.ts`): rivals in its first competitive set within a model year either side, one median per model line (the search's one-per-model key), for fuel use (L/100 km; kWh/100 km against EVs only), running cost, value and power; absent with fewer than three rival lines |

### Enums

**FuelType:** `gasoline` · `diesel` · `electric` · `hybrid` · `plug-in hybrid` · `hydrogen` · `natural gas`

**BodyStyle:** `sedan` · `suv` · `coupe` · `convertible` · `hatchback` · `wagon` · `truck` · `van` · `minivan`

**ShoppingSegment:** `hot-hatch` · `sport-compact` · `sport-sedan` · `muscle` · `sports-car` · `supercar` · `luxury` · `mainstream` · `utility` · `ev` · `truck`

**ProvenanceSource:** `epa` · `nrcan` · `nhtsa` · `estimated` · `curated`

---

## Build the database

### Typical full rebuild

```bash
npm install

# 1. EPA only (~30s) → server/data/cars.json
npm run build-verified-db:fast --workspace=server

# 2. Horsepower from EPA Test Car List
npm run build-horsepower --workspace=server

# 3. Backfill NHTSA gaps (slow, ~300ms/request)
npm run build-nhtsa-backfill --workspace=server -- --from=2011 --limit=500

# 4. Build enrichment indexes
npm run build-enrichment --workspace=server
```

**Restart the dev server** after rebuilding enrichment files.

### Refresh on GitHub (`.github/workflows/epa-refresh.yml`)

Every Monday, and on demand from the Actions tab, GitHub's runners add the cars EPA has listed since the last refresh (`backfill-epa-variants`), refresh the Canadian cars from NRCan (`import-nrcan`), check fuel types against EPA, fetch NHTSA ratings for the last two model years, rebuild enrichment and run the tests. When the data changed, the result is force-pushed to the `epa-refresh` branch with `epa-refresh-report.txt` (what was added and left out, by model) and the EPA file it read (`server/data/raw/vehicles.csv.gz`), and a pull request is opened; when nothing changed, no branch is made and the report is in the run's summary. Leave the report and the `.gz` out when merging.

### `build-verified-database.ts`

- Downloads EPA's current `https://fueleconomy.gov/feg/epadata/vehicles.csv` on every run (`--offline` reads the copy saved in `server/data/raw/`, which lacks any car EPA added since)
- Row mapping lives in `scripts/lib/epa-row.ts`, shared with the backfill below
- Maps EPA `VClass` → bodyStyle (sedan, suv, truck, wagon, minivan, van, coupe); EPA's
  "Special Purpose Vehicle" class (most 1990s–2000s SUVs and minivans) is read from the
  model name, and hearse, limousine, livery, taxi and postal conversions are left out
- Keeps one listing per configuration (`configurationKey`: engine, aspiration, fuel, drive,
  transmission). The first listing for a make-model-year-trim keeps the plain ID; another
  engine with the same transmission gets EPA's row ID appended (`…-epa41953`)
- Records turbo/supercharger (`engine.aspiration`) from EPA's flags
- Includes next model year's early certifications (years up to the calendar year + 1)
- Infers fuel type from EPA `fuelType`, `atvType`, `fuelType1`
- Estimates MSRP via `estimatePriceMsrp()` when not in EPA
- Optionally fetches NHTSA country + safety into cache

```bash
npm run build-verified-db:fast --workspace=server   # --skip-nhtsa
npm run build-verified-db --workspace=server
```

Flags: `--skip-nhtsa`, `--nhtsa-from=2011`, `--limit=N`, `--offline`

### `build-horsepower-enrichment.ts`

Downloads per-year EPA Test Car List CSVs to `server/data/raw/test-car-data/`, matches by make + engine + carline → `horsepower-enrichment.json`.

```bash
npm run build-horsepower --workspace=server
```

Flags: `--from=2010 --to=2026`, `--offline`, `--refresh`

**Re-run it.** The committed file predates three fixes. Its third matching tier accepted any engine with the same cylinder count when a listing's own engine was untested, so untested engines took a sibling's rating (2013 F-150 5.0 at the 6.2's 415 hp); the tier now tolerates only displacement rounding (±0.15 L). Its last tier took any same-make test car with the same engine size, even one that was plainly another model on file (the 2010 F-150 and Expedition 5.4 at the supercharged Mustang GT500's 540 hp); it now skips those. And the 7,547 listings restored from EPA's data in 2026 have no rating yet. A rebuild in October 2026 (with the 489 listings EPA had added) was not committed: it fixed some ratings (2008–10 Cayenne GTS at 405 hp, not 500 or 225) but broke others (a 2007 Cayenne 3.6 at 415, a 2009 Sport Trac V8 at 248) and moved about 420 existing cars, so it needs a review of its own; the weekly refresh leaves the file alone. Until the file is rebuilt, the runtime drops a rating that two engines of one model and year share (`dropRatingsSharedAcrossEngines`, 102 listings), a turbo rating that merely repeats the non-turbo sibling's (`dropInductionMismatchedHorsepower`, 118), and a rating out of line with the same engine's adjacent model years (`dropYearOverYearOutliers`, 42: a 2008 Titan at 417 hp between 305 and 317, a 2019 Corvette at the ZR1's 638), and a rating no engine of that size and induction makes (`dropImplausibleOutput`, 144: a naturally aspirated engine outside sports cars and luxury makes above 94 hp a litre, such as a 2014 F-150 5.0 at 600 hp, or a turbo from 2008 on below 70, such as a Lexus NX 300 at 112), so those read "not on file" rather than wrong. For best-selling engines the matcher got wrong, `utils/horsepower-corrections.ts` sets the manufacturer's rating (2,569 listings: hybrids and plug-in hybrids at their system output, as makers rate them (a RAV4 Prime read 203 hp for 302, a Wrangler 4xe 270 for 375, a Volvo T8 312 for 455, an SF90 770 for 986), where the test-car list gives the engine alone (a Prius read 96–98 hp for 121–134, a RAV4 Hybrid 176 for 219, an Accord Hybrid 146 for 204, a Tucson, Santa Fe or Sorento Hybrid 177 for 226–231, a Fusion or MKZ Hybrid the 2.0 EcoBoost's 240 for 188), which the segment rules do not read as a sporting engine in a four-door; the 2000–06 Golf GTI 1.8T and Golf TDI, which read the eight-valve 2.0's 115 hp; Porsche's 718 by trim, whose 2.0 turbo base car read the GTS's 361 hp and whose naturally aspirated 4.0 EPA sometimes flags as turbocharged; GM's full-size trucks and SUVs, whose 5.3 and 6.2 V8s and 3.0 Duramax were mostly unrated or off by 5-65 hp, Ram's Pentastar and Hemi, Toyota's i-Force Max hybrids at their system ratings; every 2017–22 CR-V turbo read the CR-V Hybrid's 143 hp engine rating instead of 190, Mazda's 2.5 read 207 instead of 186–191, Hyundai and Kia's 2.5 read 236–241 instead of 191, the STI read the WRX's 268, and the F-150's 5.0 the Raptor R's 650). `utils/maker-ratings.ts` carries the makers' US ratings further, to engines the file never matched or matched to another engine (8,809 listings in all now carry a maker's figure). An October 2026 audit of the whole catalogue (a supercharged or turbo engine at its plain sibling's figure or the reverse, a figure out of line with the same engine the years either side, a performance trim at the plain car's rating) added its own rows, first in the list: the 2008–10 Cayenne GTS read the Turbo's 500 hp, then 225 (405), the 2009–10 Jetta and CC 2.0 TSI the TDI's 140 (200), the 2011–13 Grand Cherokee and Durango 3.6 215 (290), the 2010–13 supercharged Range Rovers the 5.0's 375 (510), the 2009–10 XC70 T6 the 3.2's 235 (281), Buick's and Pontiac's 3800 V6s each other's figures, the 2004–07 STI the WRX's (EPA files both as "Impreza AWD"; the STI's manual has six speeds). The Canadian models NRCan rates (its files give no power) and listings too new for the test-car file take their makers' figures there too. Performance cars fared worst: every 2017–24 Camaro SS read 553 hp for 455, a 2019–23 Charger R/T the Scat Pack's 485 for 370, a 2017–19 Charger Hellcat the 392's 485 for 707, a C7 Corvette Z06 the Stingray's 455 for 650, an F90 M5 the M550i's 455 for 600, a 991 911 GTS the Carrera's 350 for 430 and a GR86 264 for 228; whole lines had no figure, such as every 2015–21 Volvo (EPA names them only by drive, so the supercharger flag tells a T5 from a T6), the 2011–20 Mustang GT and the Genesis V8s. Older best-sellers are covered too (the F-150, Explorer V8, Mustang, Camaro, Camry, Accord V6, Tacoma, Wrangler and GM's trucks and SUVs back to 1995, where a 2001–03 Camry V6 read the 2004 car's 210 hp and a 2001–04 Mustang GT 313), which took rated listings from 89% to 98% of 2015-on cars, 82% to 92% of 2005–14 ones and 47% to 57% of 1995–2004 ones. A row can hold a test (`when`) where one engine came in two tunes the name does not show: a 2010–15 Camaro SS made 426 hp with the manual and 400 with the automatic. Rows cover the years either side of a model change too, since the sibling fill below would otherwise copy a figure across generations (a 2018 A8 L took the 2019 car's 453 hp for 435). Fuel-cell cars (Mirai, Nexo, Clarity) are rated by their motor, as EVs are.

### `build-content-enrichment.ts`

Reads `vehicles.csv` columns:

- `ghgScore`, `youSaveSpend`, `barrels08` → GHG, 5-yr savings, barrels/yr
- PHEV: `comb08`, `combA08`, `city08`, `cityA08`, `highway08`, `highwayA08`, `rangeA`, `charge240`, `phevComb`
- EV: `comb08`, `city08`, `highway08`, `combE`, `range`, `charge120`, `charge240`

Writes `epa-enrichment.json`, `nhtsa-safety.json`, `nhtsa-by-car-id.json`. Ratings in the raw NHTSA cache add to and update the committed `nhtsa-safety.json`, so a cache that holds only recent years keeps every other year's ratings.

### `import-nrcan.ts` (Canadian cars EPA never rated)

Natural Resources Canada rates every car sold in Canada, so it has the ones EPA never saw: models built for Canada (Acura 1.6EL, 1.7EL and CSX, Chevrolet Orlando, Pontiac Firefly, Sunrunner and Pursuit, Mercedes A 250 and B-Class, Nissan Micra and X-Trail, VW City Golf and City Jetta, smart fortwo CDI, Kia EV4), years a model stayed on sale here after it left the US (2016 Venza, 2014–17 Rondo, 2013–14 Trax, 2007–09 Montana SV6, 2022 CX-3, 2024 MX-30, 2020 e-Golf) and Canadian names (Kia Magentis for the Optima, Mitsubishi RVR for the Outlander Sport, Nissan Qashqai for the Rogue Sport, Chrysler Grand Caravan for the Voyager, the Chrysler-badged Intrepid and Neon). NRCan's files also repeat most of EPA's catalogue under other spellings ("A8L", "TJ" for the Wrangler, "C1500 Silverado"), so only the models listed in `scripts/lib/nrcan.ts` are imported, each checked against `cars.json`; a row EPA has since listed is skipped and reported. It also fills model years EPA's file is missing though NRCan has them, 88 listings in October 2026: the 2026 GR86, the 2023 Range Rover and Range Rover Sport, the 2026 Cayenne Electric, 2025 911 GT3s, 2023 EQE and EQB, 2024 and 2026 VinFast VF8s, 2026 INEOS Grenadiers, and plug-in hybrids from the Lexus NX and RX 450h+ to the Ferrari 296. And it fills engines EPA's file is missing for models it lists (`missingEngine` entries, checked engine by engine: size, cylinders, plug-in or diesel), 91 listings: EPA's 2024 file left out most of the plug-in hybrids its 2023 and 2025 files have (X3 xDrive30e, X5 xDrive50e, Escape and Niro plug-ins, Mercedes-AMG's E Performance cars, Volvo's S90 and V60 T8), its file has none of Mercedes' 350 BlueTEC diesels, and it lacks the 2024 G70 3.3T, the 2026 Panamera GTS and E-Hybrids, the 2026 Prius and RAV4 plug-ins and the 2020 718s but the Spyder and GT4. Engines only Canada had come in the same way: the CX-5's and CX-30's 2.0, the 2022–23 Rogue's 2.5, the 2024 Trailblazer's 1.2, a V6 C 250 4MATIC, the GLE 550, a gasoline Tonale, the 2014 Fit and the 2015 ILX Hybrid. Before 2023, every NRCan row from 1995 to 2022 was matched against EPA's by name and by engine and fuel use; the real gaps it found are in too (88 listings): model years EPA's file has none of (every 1995–97 Bentley, the 2002 Azure and Continentals, the 2002 Corniche, the 1997 XK8 and XJR, the 1997–98 Prowler, the 2007 Alpina B7, the 2010 SL63, the 2015 ML550, the 2014–16 E 250 BlueTEC, the 2017 Revero, the 2022 I-Pace), years Canada had early or longer (2014 4C, 1999 X5 and Z8, 2012 X1, 2010 B4000) and models only Canada had (the 1995 and 2001–05 320i, the 2007–11 323i, the E 280 and S 450 4MATIC, Suzuki's Swift+, the Transporter and the 1996 EuroVan). NRCan's 2015 S 400 4MATIC row is left out: it gives the 3.0 V6 car a 4.7-litre engine. The other flagged rows are NRCan's names for cars EPA lists ("K1500 Avalanche", "Jeep TJ", the Ford-badged Cougar). Each of those entries names EPA's spelling of the model, so it retires on its own once EPA lists the year, and a year from NRCan takes EPA's spelling of the name where it differs only in spacing ("GR 86" for "GR86", "S580e 4matic" for "S 580e 4MATIC Sedan"). Plug-in hybrids store gas-mode figures as their fuel economy and electric range and MPGe in `epa.phev`, as EPA's do after enrichment.

Its figures are stored in EPA's units (L/100 km as mpg to a tenth, so the litres survive the trip back; Le/100 km as MPGe; g/km as g/mi) and credited to `nrcan`, which the site shows as an "NRCan" chip. IDs follow EPA's pattern with `-ca` at the end. Re-running replaces the Canadian listings with NRCan's current figures and never touches an EPA listing; run it after `backfill-epa-variants`.

```bash
npm run import-nrcan --workspace=server -- [path/to/folder] [--dry-run]   # downloads from open.canada.ca unless given a folder
```

### `build-nhtsa-backfill.ts`

Calls NHTSA Safety Ratings API:

1. `GET /SafetyRatings/modelyear/{year}/make/{make}/model/{model}`
2. `GET /SafetyRatings/VehicleId/{vehicleId}`

Uses canonical display model names. 300ms delay between requests.

```bash
npm run build-nhtsa-backfill --workspace=server -- --from=2011 --limit=500
```

Flags: `--from=2008`, `--limit=N`, `--refresh`

---

## Enrichment system

**File:** `server/src/services/content-enrichment.ts`  
**Trigger:** `car.service.ts` → `enrichCar()` on every load

Load order at startup:

1. `epa-enrichment.json`
2. `nhtsa-safety.json`
3. `nhtsa-by-car-id.json`
4. `horsepower-enrichment.json`

Per vehicle:

1. Merge EPA extras; fix EV/PHEV economy (kWh/100mi was wrongly in `combined`)
2. Resolve NHTSA: `nhtsaByCarId[id]` → `resolveNhtsaSafety()`
3. Add HP from test car list (`provenance: 'curated'`)
4. Estimate EV and fuel-cell HP if still missing (`provenance: 'estimated'`)

Before that, the build gives each make and model one spelling (`unifyMakeSpelling`, `unifyModelSpelling`): EPA filed a 2026 MINI as "Mini", which listed it as a make of its own, and a 2009 Nissan as "370z" beside the 2010–20 "370Z". Model spellings years apart are left alone, since they name different cars (the 2002–09 TrailBlazer, the 2021 Trailblazer).

Then `normalizeCarRecord()` applies fuel-type inference, MPGe labels, hydrogen notes.

---

## Taxonomy & fuel-type correction

### `vehicle-taxonomy.ts`

**Drive:** a name that says all-wheel drive (`4matic`, `xDrive`, `quattro`, `AWD`) wins over a two-wheel-drive record, as do Land Rovers and the first X5 (`correctDriveType` in `utils/car-normalize.ts`): EPA recorded a 2011 ML350 and R350 4matic, a 2000 X5 and a 2014 Range Rover Sport as rear-wheel drive.

**`canonicalizeDisplayModel()`** — disambiguates EPA slugs (Golf GTI vs Golf, Civic Type R, Cooper S, WRX, etc.). EPA files the Golf and GTI under one base model ("Golf/GTI"), so every trim slug reads "golf-gti": the GTI is told apart by EPA's model name ("GTI", "GTI VR6"), not the slug, which had made 21 Golf TDIs and 2.5-litre Golfs into 200 hp GTIs.

**`inferBodyStyle()`** — corrects EPA mislabels: hatchbacks listed as sedans, roadsters in the two-seater class listed as coupes (Boxster, MX-5, S2000, Z4, SL), four-door "Gran Coupes" as coupes, coupe-SUVs (GLE Coupe, Cayenne Coupe) and soft-top SUVs as coupes and convertibles, crossovers listed as wagons or sedans (CX-3, EX35), and the Magnum EPA files as an SUV. A model EPA files in different classes from year to year keeps one body style by name: Audi's Q models, Genesis's GVs, Mercedes' GL models (their Coupes too), the Cayenne and Macan, Volvo's XC40, 60 and 90, Land Rovers, the EV6, Urus, Bentayga, DBX, Levante, Stelvio, the Jaguar Paces and the Purosangue are SUVs (a 2015–19 Q3 read as a "Compact Car" sedan, a 2025 GLC 43 Coupe as a coupe); the AMG GT 43, 53 and 63 four-doors are sedans, the V60 and V90 Cross Country wagons, the Mazda5 a minivan, the 2025-on A5 and S5 (a four-door liftback; EPA's "S5 Sport Sedan" read as a coupe) sedans, the SX4 and every Impreza five-door since 2008 hatchbacks (EPA's "Impreza Wagon", "Impreza Sport" and, since the sedan went in 2024, plain "Impreza": `awd wagon` listed a 2026 Impreza first), and the Avalanche, Escalade EXT, Explorer Sport Trac and Baja, which EPA files as SUVs, pickups. Hatchback names match the make and model only, not the id or trim slugs that repeat a base name ("ioniq-6", "yaris-manual-6-spd"), so the Ioniq 6, Mirage G4 and Yaris iA stay sedans.

**`classifyShoppingSegment()`** — rules based on fuel type, body, names, horsepower, induction and make:

| Segment         | Triggers (simplified)                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ev`            | electric or hydrogen                                                                                                                                                           |
| `truck`         | bodyStyle truck                                                                                                                                                                |
| `utility`       | suv, van, minivan                                                                                                                                                              |
| `supercar`      | two-door from Ferrari, Lamborghini, McLaren…, or R8, NSX, Ford GT, MC20                                                                                                        |
| `hot-hatch`     | GTI, Type R, ST… on a hatchback or wagon, or a hatchback with 200+ hp                                                                                                          |
| `sport-sedan`   | WRX, Si, GLI, AMG, S/RS/M badges; or a sedan with 250+ hp that is turbocharged, makes 330+ hp or 95+ hp per litre (luxury makes need only the 250 hp, bar the ES, MKZ and RLX) |
| `luxury`        | flagships (S-Class, 7 Series, LS, CL, Genesis, K900…), then every car from a luxury make; luxury two-doors that are not sports cars (430i, E350 coupe, RC 350)                 |
| `muscle`        | Mustang, Camaro, Challenger, Firebird, GTO… with a V8 (4.5 L+ or 400+ hp)                                                                                                      |
| `sports-car`    | sports-car names and makes (911, Corvette, MX-5, Z4, AMG GT, GT-R, F-Type, Lotus…), performance badges, or a non-luxury two-door with 300+ hp                                  |
| `sport-compact` | hatchback with 195+ hp (most compact hatchbacks now make 150–190); two-doors with 180+ hp or a sporty badge (Civic Si coupe, Cobalt SS)                        |
| `mainstream`    | default, including family coupes (Accord, Solara) and city cars (smart)                                                                                                        |

**`ownershipProfileFor()`** — human label + tags + bestFor for sport-compact, sport-sedan, etc.

### `fuel-type-inference.ts`

Reclassifies mislabeled EPA records:

- **Hydrogen:** `isFuelCellVehicle()` patterns
- **PHEV:** name patterns (Volt, Prius Prime, T8, 4xe, etc.), gas displacement + short electric range (<50 mi)
- **BEV:** Tesla, Leaf, Model 3, Ioniq 5, etc.

### `car-normalize.ts`

- Applies effective fuel type
- Sets MPGe vs MPG labels
- Hydrogen: fuel cost from the region's posted pump price (B.C. ~$16.50/kg, HTEC), reading EPA MPGe as miles/kg; left out (not zero) where no price is posted (Ontario)
- Rounds fuel economy display values

---

## NHTSA safety resolution

**`resolveNhtsaSafety(car, safetyIndex, displayModel)`:**

1. Try exact keys from `nhtsaLookupKeys()` — raw model, canonical model, first token, ±2 years
2. Make-specific aliases (VW Golf/GTI, Honda Civic, Mini Cooper)
3. Fuzzy scan: same make, year ±2, `nhtsaModelsMatch()` on model names

**`buildNhtsaCarIndex()`** precomputes results per `car.id` → `nhtsa-by-car-id.json`.

Reality: NHTSA tests ~1,025 make/model/year combos vs 36k EPA configs. Fuzzy matching gets ~13% per-car coverage.

---

## API reference

Base: `/api` (Vite proxies to `:5000` in dev; Vercel routes to `api/index.ts`)

### Endpoints

| Method | Path                       | Limits          | Description                                     |
| ------ | -------------------------- | --------------- | ----------------------------------------------- |
| GET    | `/health`                  | —               | `{ status, carsTotal, dbFound }`                |
| GET    | `/cars/makes`              | —               | Sorted make list                                |
| GET    | `/cars/makes/:make/models` | —               | Models for make                                 |
| POST   | `/cars/search`             | max 500/request | Filtered search                                 |
| GET    | `/cars/search/suggestions` | max 20          | Autocomplete                                    |
| POST   | `/cars/compare`            | max 5 IDs       | Batch lookup                                    |
| GET    | `/cars/stats/overview`     | —               | DB statistics: versions, model lines, makes, years, NHTSA coverage |
| GET    | `/cars/stats/chart-points` | query params    | Scatter plot sample                             |
| GET    | `/cars/collections/previews` | —             | First three picks of every curated shortlist    |
| GET    | `/cars/:id`                | —               | Single vehicle                                  |
| GET    | `/cars/:id/dashboard`      | —               | Full dossier                                    |
| GET    | `/cars/:id/raw`            | —               | Debug: `{ raw, enriched, normalized }` pipeline |
| GET    | `/cars/:id/similar`        | `?limit=6`      | Similar vehicles                                |
| GET    | `/vin/:vin`                | `?year=YYYY`    | VIN decode                                      |

### Search

**Sort fields:** `make`, `model`, `year`, `horsepower`, `price`, `fuelEconomy`, `range`, `evScore`, `relevance`

**Filters:** make, model, year, countryOfOrigin, bodyStyle, fuelType, transmission, driveType, price, horsepower, displacement, fuelEconomy, safety (NHTSA overall stars: `{ min: 5 }`; a car NHTSA has not rated never matches), threeRow, rangeMiles. The GET form reads `safetyMin`/`safetyMax`; the search page's URL keeps `nhtsaMin`, `rows` (3 or 2) and `rangeMin` (miles).

**Natural language:** `"2024 camry"`, `"toyota rav4"` → parsed into filters (user filters win over parsed)

**Names EPA does not use** (`utils/fuzzy-search.ts`): model matching ignores hyphens and spaces (`f150`, `f 150` and `f-150` all find EPA's "F150 Pickup" and "F-150 Lightning"); lineup names resolve to the models that follow them (`3 series` → 318i…M340i, M3; `c class` → C300, AMG C43; `g wagon` → the G-Class); renamed models map to their family (`miata` → MX-5, `silverado 1500` → every half-ton Silverado). A make typo must be a near miss of a whole word of the make, so `gle` means the Mercedes GLE, not Eagle.

**Trims EPA leaves out of the name** (`utils/performance-trims.ts`): EPA files a Mustang GT as "Mustang" with a V8, a 2019+ Civic Type R as "Civic 5Dr" with a 2.0 turbo and a manual, and a 2015–21 STI as "WRX" with the 2.5 turbo. The normalizer derives a `variant` from the engine (Mustang GT/EcoBoost/GT500, Camaro SS/ZL1/Z28, Civic Si/Type R, WRX/STI, Challenger and Charger R/T/Scat Pack/Hellcat, Grand Cherokee SRT/Trackhawk, Stinger and K5 GT, Sonata N Line, Taurus SHO, Impala/Cobalt/HHR SS, Wrangler 392, Sentra SR Turbo, the C6 Corvette Z06 and ZR1 and C7 Z06 EPA filed as plain "Corvette"); titles show it and search matches it. A query ending in a trim (`mustang gt`, `civic type r`, `wrx sti`, `charger rt`) prefers cars where the trim follows the model name, so `mustang gt` is the V8 car rather than the Mach-E GT. The trim is peeled off before the make is looked for, because "STI" and "SRT" are also EPA makes.

**Body-style, fuel and drive words** become filters when the phrase is not a model name: `hybrid suv`, `mazda 3 hatchback`, `electric truck`, `awd sedan`, `minivan`. Model names that contain such words still win (`rav4 hybrid`, `bolt ev`), and a glued make splits only when the rest names one of its models (`mazda3`, but not `minivan` as MINI + "van").

**Years outside the data:** an empty search whose years are all off file returns `yearCoverage: { min, max }`, and the results page offers the same search in every year.

**Trim levels EPA does not record:** a search that finds nothing is retried without its last one to three free words, as long as what is left names a vehicle, so `honda civic ex`, `toyota 4runner trd pro` and `ford explorer limited` find the Civic, 4Runner and Explorer instead of nothing. Years, body/fuel/drive words and prices are never dropped. The response says what was set aside in `interpretation.ignored`, and the results page shows it.

**Prices:** `under 30k`, `below $25,000`, `over 40 000`, `less than 20k` filter on the estimated CAD value (an amount needs a `k`, a `$` or four digits outside the model-year range, so `civic under 2015` is not a price); `cheap`, `cheapest`, `affordable` and `budget` sort by estimated value, lowest first, within the last ten model years unless the query gives years. Both come back in `interpretation` for the page to state.

**Years, order, gearbox, engine, seats** (`utils/search-modifiers.ts`): year ranges and open ends (`2015-2018 accord`, `accord 2015 to 2018`, `rav4 2019+`, `civic since 2020`, `corvette before 2000`); `new` means the current model years unless it is part of a name (`new beetle`), and `used`, `certified`, `car` and `vehicle` are ignored; `most fuel efficient`, `best mpg` and `fastest`, `most powerful` sort by combined MPG or horsepower; `manual`, `stick shift`, `automatic`, `cvt` filter the gearbox; `4 cylinder`, `6 cylinder` the cylinder count; `v6`, `v8`, `v12`, `boxer`, `flat six`, `h6`, `straight six`, `inline 6`, `vr6`, `w12` and `rotary` the layout (`filters.layout`, from `engine.configuration`; a `v6` was any six, so BMW straight sixes led `twin turbo v6`, and now takes V6s and Volkswagen's VR6); an engine size with a decimal point (`f150 5.0`, `3.5 liter`, `2.0t`, which asks for a turbo too) the displacement, named in `interpretation.engineSize` and left out of the ranking words (`f150 5.0` had put a model named "F150 5.0L 2WD FFV GVWR>7599 LBS" first); `hemi`, `ecoboost`, `coyote`, `power stroke`, `duramax`, `ecodiesel` and `tdi` an engine family by its make and specifications (`utils/engine-families.ts`, named in `interpretation.engineFamily`: "hemi" matched a Model 3 "Premium" and a Cruze "Premier"); and `turbo`, `supercharged` the induction (after model names, so `911 turbo` stays a model); `third row`, `3 row`, `7 seater`, `8 passenger`, `seats 8` and `seating for 7` keep to minivans, passenger vans and the SUVs sold with a third row (`utils/three-row.ts`: EPA records no seating, so this is by model and year: the 2024 Land Cruiser is a two-row SUV in North America and led `7 seater hybrid`, the Santa Fe gained a third row in 2024 and the Tiguan had one from 2018 to 2024, the Highlander, Pathfinder, Sorento, Outlander and Explorer began with two rows; Lucid names the rows in the Gravity's name, and pickups, the Maybach GLS and the Wagoneer S have two), and `5 seater` or `two row` leave them out (`filters.threeRow: false`; `5 seater suv` had found one Isuzu with "5-passenger" in its name); `2 seater` keeps to EPA's two-seater class; `2 door`, `four-door` and `5 door` read doors from the name ("Wrangler 2dr", "Civic 5Dr") or else the body (coupes and convertibles two, sedans four, wagons five), and an SUV has four doors unless its name says otherwise or it is one of the two-doors named in `car.service.ts` (the Wrangler before "Unlimited" and "4dr", Explorer Sport, Defender 90, Amigo, soft-top Trackers: `2 door suv` had set the count aside), while beside a truck or van word the count is set aside; `mid engine`, `rear engine` and `front engine` keep to where the engine sits, by model (`utils/engine-position.ts`, `filters.enginePosition`: EPA records none, so "mid engine" found nothing and "rear engine" two Ferraris named "Berlinetta"; every McLaren, Lamborghini but the Urus, Ferrari's V8 berlinettas, the Boxster and Cayman, R8, NSX, i8 and the Corvette since 2020 are mid-engined, the 911 and the smart fortwo rear-engined); `rear wheel drive`, `four wheel drive`, `all-wheel drive`, `2wd`, `station wagon` and `twin turbo` read as their short forms, as do `plug in hybrid` and `fuel cell` (which found only models with those words in their names); `longest range` sorts by EPA range and `300 mile range` or `400 km range` sets a minimum. Figures with a unit set bounds, in the unit typed: `suv over 30 mpg`, `40 mpg highway`, `city mpg over 50`, `under 7 l/100km` (a ceiling in litres is a floor in MPG, and a bare figure is a ceiling), `over 100 mpge`, `300+ hp`, `hp over 300`, `200 to 300 horsepower`; a bare `300 hp` or `40 mpg` is a floor. An MPG or L/100 km bound leaves electric cars out (every EV's MPGe clears it), and a horsepower bound leaves out cars with no rating on file. A unit alone orders by it (`suv mpg`, `mustang horsepower`), as does `low fuel consumption`. Figures nothing on file records are set aside by name: `0-60 under 4 seconds` and `0 to 100 km/h` (most powerful first instead), torque in `lb-ft`, towing weights and `lightweight`. Results are ranked by the words left once figures and prices are read, so `camry over 200 hp` ranks by "camry" alone, and without the body, fuel and drive words read into filters, which every result has (`mercedes sedan` led with a 2004 "C320 4matic Sedan"); of equal scores in one year, the plainer name leads (`2004 camry` showed a Camry Solara convertible for its year, `bronco` a Bronco Sport). `honda accord vs toyota camry` searches both and takes results in turn, and names each side's base configuration in `interpretation.compareWith`, which the results page links to the compare page. A model asked for in a year it was not made (`2012 ford ranger`, `2010 tesla model 3`) shows its other years and names the runs on file in `interpretation.otherYears` (the Ranger: 1995–2011 and 2019–2026); years outside everything on file keep the `yearCoverage` notice. An empty search is also retried as one model name across makes (`hummer ev` read "hummer" as the old HUMMER make), and `lightning` covers both Ford trucks of that name.

**Kinds of vehicle** (`utils/search-modifiers.ts`): a size with a body (`compact suv`, `midsize sedan`, `full size truck`, `small suv`, `heavy duty truck`) keeps to that competitive set, mainstream unless `luxury` is said; `sports car`, `muscle car`, `supercar`, `hot hatch`, `sport sedan`, `off road` and `luxury` keep to a segment or to luxury makes. The response names the class in `interpretation.vehicleClass`. What a car is for reads as a kind too: `track car`, `fun to drive` and `driver's car` keep to sports cars and hot hatches ("track car" found the Chevrolet Tracker, "fun to drive" a Cherokee "Active Drive II"), `drift car` to rear-drive sports cars, `tow vehicle` and `truck for towing` to pickups and full-size SUVs (and say no towing capacity is on file), and `car for uber`, `lyft` or `rideshare` to sedans, hatchbacks, SUVs and minivans, cheapest to run first. When the words name a model or trim instead (`saab 9-3 sport sedan`, `cadillac xt5 luxury`), the empty search is retried with the words as words; `premium`, `big` and `large` are read only where they cannot be a trim (`outback premium`, `ram big horn`).

**Everyday words:** words with no search meaning are dropped (`for`, `the`, `my`, `for sale near me`: "for" was read as a prefix of Ford); judgements no data on file can make (`best`, `reliable`, `good`, `roomy`, `for dogs`, `for tall people`, the `work` in `work truck`), uses (`road trip`, which matched a Buick Roadmaster, and `delivery`, which emptied `delivery van`), flex fuel and `e85` (EPA's flex-fuel flag is not carried into the database), words about one car for sale (`like new`, `low mileage`, `one owner`) and equipment, which no source on file records (`sunroof`, `apple carplay`, `heated seats`, `backup camera`: each emptied the search), are set aside and named in `interpretation.unmeasured`; a stop word that begins a model code stays (`lexus is 350`, `i 4`, `a 220`), and codes typed with a space are joined (`rav 4`, `id 4`); words of one or two letters match only at the start of a word (`ix` no longer finds a Matrix); `family` keeps to three-row and mid-size SUVs, minivans or mid-size cars by the body word wherever it stands (`suv for my family`); and `safest` sorts by NHTSA overall stars. `snow`, `winter` and `icy` keep to all- and four-wheel drive (`interpretation.snow`); `first car`, `teenager`, `student` and `new driver` apply the First car preset's limits where the query sets none (`config/first-car.ts`, shared with the Browse preset: under $18,000, 28 MPG or better, 2010 or newer, no hydrogen or natural gas, cheapest first); `most`, `very` and `really` left over after the orders are read are dropped (`most reliable suv` matched a Mach-E and a Montero). Price ranges read `between 20k and 30k`, `20-30k` and `20,000 to 30,000 dollars` as well as dollar-sign amounts, and `dollars`, `cad` and `grand` mark an amount (`under 25k cad` read "cad" as Cadillac, `under 20000 dollars` found nothing). `cheap to run`, `cheapest suv to own`, `lowest running cost` and `cheap insurance` sort by `runningCostCad`, each car's yearly running cost at the Ontario baseline, set when the database is built (`utils/running-cost.ts`; hydrogen cars, whose fuel has no price, carry none); a cheapest-first order or a price ceiling (`honda under 10 grand` listed a lease-only FCX Clarity) leaves out hydrogen and natural gas unless asked (`interpretation.rareFuelsLeftOut`), and `gas`, `gasoline` and `petrol` now mean gasoline. `mild hybrid`, `mhev`, `48v` and `etorque` keep to mild hybrids (`interpretation.mildHybrid`); `hybrid` alone means full hybrids and plug-ins. `dual clutch`, `dct`, `dsg`, `pdk` and `automated manual` keep to EPA's automated manuals (`interpretation.automatedManual`), which are labelled "7-Speed Automated Manual" rather than "Automatic".

**Rivals:** `cars like a camry`, `alternatives to the rav4`, `similar to a model 3` and `miata competitors` list the rivals of the base configuration of the car named (the cheapest in its newest matching year, two-wheel drive at a tie), as its page lists them (`utils/similar-vehicles.ts`), and name it in `interpretation.similarTo` with its id. The car page's six rivals link to this search ("More rivals of the 2026 Honda Civic"). Words before `like` narrow the rivals (`awd cars like a camry`, `cheapest suvs like the cr-v`), as do the request's filters; `like new` is a condition, not a comparison.

**Plain words mean what they say:** a query made only of body, fuel, drive or induction words is read as filters before any model lookup (`truck` is every pickup, not the 1990s models EPA calls "Truck"), and a word that is a whole model name is never read as a typo or prefix of a make (`beetle` found every Bentley).

**Generations** (`utils/generations.ts`): chassis codes, nicknames and generation numbers set the model years, in North American years, and are named in `interpretation.generation` ("Read as the E46 BMW 3 Series, 1999–2006"): `e46 m3`, `w204 c63`, `b8 s4`, `mk7 gti`, `c7 corvette`, `s550 mustang`, `fk8 type r`, `nd miata`, `jl wrangler`, `996`, `new edge mustang`, `bugeye wrx`, `2nd gen tacoma`, `third generation prius` ("e46 m3" and "mk7 gti" found nothing, "c7 corvette" a 2026 C8). A code alone names its line (`e46` is a BMW 3 Series, `fk8` a Civic Type R, `jk` a Wrangler) unless it is itself a model's name or the rest of the query names another vehicle (`s550` stays a Mercedes, `mercedes e53` an AMG, `e85` is ethanol); a trim beside a code is that line's (`wk2 srt` is a Grand Cherokee SRT, `s550 gt` a Mustang GT); two-letter codes need the model beside them (`na miata`). Word matching reads the make, model and derived trim, not EPA's trim slug ("golf-gti-automatic" on a 2019 e-Golf put it in `gti`), and `porsche 911` covers the 2003–09 cars EPA named "Carrera 2 Coupe", "Targa" and "Turbo 4 911".

**Badges and bare trims:** a trim typed after the model also finds names with words between them (`911 gts` found only the 2011–12 "911 GTS"; it now finds the Carrera, Carrera 4 and Targa 4 GTS, newest first, and `accord sport` the 2023-on Accord Hybrid Sport) when some name begins with the phrase; badge-first names match without the badge (`g63` finds 2013–15 "G63 AMG" and 2016+ "AMG G63"; `viper` finds the 2013–14 "SRT Viper"), and a trim that names one car on its own (`gt500`, `hellcat`, `type r`, `trackhawk`, `zl1`) is searched as a trim, so `gt500` includes the 2007–14 cars EPA files as plain "Mustang". Generic trims (`gt`, `ss`, `si`, `rt`, `sti`) are not. Typo tolerance applies only when the exact words find nothing: `gt500` used to include the Mercedes G500. Searches made only of body/fuel/drive words (`electric pickup`) list newest first.

### Chart points query params

`priceMin`, `priceMax`, `bodyStyles` (comma-separated), `yearMin`, `yearMax`, `limit`

### Response envelope

```json
{ "success": true, "data": { ... } }
```

### Server indexes (`car.service.ts`)

Loaded once at startup into memory:

- `idIndex`, `makeIndex`, `modelIndex`, `bodyStyleIndex`, `fuelTypeIndex`
- `transmissionIndex`, `driveTypeIndex`, `countryIndex`
- Pre-computed `cachedMakes`, `cachedStats`

**Fallback:** 2 hardcoded cars (Camry, Mustang) if `cars.json` missing (Vercel safety net).

**One row per model** (`collapseByModel`, on by default for one-word searches): the best-ranked car of each model line. An engine code is not a model, so BMW's 330i, M340i and 330e are one 3 Series and Mercedes' E350 and E450 one E-Class (`bmw` listed 122 "models", now 44; `mercedes` 140, now 62); models that share a first word stay apart (`audi rs` showed one row for the RS 3, 5, 6, 7 and Q8, and `jeep` hid the Grand Cherokee under the Grand Wagoneer), as do the Mach-E, Bronco Sport, Santa Cruz, GR 86, Corolla Cross, Camry Solara, Eclipse Cross, Discovery Sport, the electric Equinox, Blazer, Silverado and A6, each AMG line, the Maybachs and the EQS and EQE SUVs; EPA's "New" generations join their line (the 2023 "New Range Rover Sport" is a Range Rover Sport), and Range Rovers split only into the Sport, Evoque and Velar, not by engine.

**Pagination:** the server caps `limit` at 500 per request; clients page with `offset`. Search is also available as `GET /api/cars/search?q=…&make=…&sort=price:asc`, which is CDN-cacheable and linkable.

---

## Routes & pages

| Route                              | File               | Layout | Description                                              |
| ---------------------------------- | ------------------ | ------ | -------------------------------------------------------- |
| `/`                                | `Landing.tsx`      | No     | Promise, search, quiz, sample car card, start paths, shortlist previews |
| `/browse`                          | `Browse.tsx`       | Yes    | Situations, body styles, classes, budgets, years, makes, shortlists |
| `/explore/:category`               | `Explore.tsx`      | Yes    | Category drill-down                                      |
| `/vehicles/:category/:subcategory` | `VehicleGrid.tsx`  | Yes    | Filtered grid + sidebar                                  |
| `/car/:id`                         | `CarDetail.tsx`    | Yes    | Vehicle dossier                                          |
| `/home`                            | `Home.tsx`         | Yes    | Main search                                              |
| `/compare`                         | `Compare.tsx`      | Yes    | Side-by-side table (members; dashboard API, provenance)  |
| `/collection/:collectionId`        | `Collection.tsx`   | Yes    | Curated collection                                       |
| `/smart-search`                    | `SmartSearch.tsx`  | Yes    | Persona-ranked search                                    |
| `/garage`                          | `DreamGarage.tsx`  | Yes    | Saved garage (members)                                   |
| `/shared-garage`                   | `SharedGarage.tsx` | Yes    | `?cars=id1,id2`                                          |
| `/battle`                          | `BattleMode.tsx`   | Yes    | 2-car head-to-head (members)                             |
| `/value-matrix`                    | `ValueMatrix.tsx`  | Yes    | Recharts scatter (members; lazy-loaded chunk)            |
| `/methodology`                     | `Methodology.tsx`  | Yes    | Data pipeline, PHEV correction, valuation model          |
| `/vin`                             | `VinDecoder.tsx`   | Yes    | VIN lookup (members)                                     |
| `/account`                         | `Account.tsx`      | Yes    | Garage sync, plan, password, sign-out, delete            |
| `/sign-in` · `/sign-up`            | `SignIn.tsx` …     | Yes    | Email and password, or Google; `?next=` returns there    |
| `/forgot-password`                 | `ForgotPassword…`  | Yes    | Emails a reset link (when email is configured)           |
| `/reset-password`                  | `ResetPassword…`   | Yes    | Where the reset link lands                               |

`Layout.tsx` wraps all non-landing routes with `SiteHeader`.

**Who sees what.** Car pages, search, browsing, collections and the methodology
are open to everyone. The tools (Compare, Dream Garage, Battle Mode, the Value
Matrix and the VIN decoder) ask for a free account (`RequireAccount.tsx`), and
the VIN API refuses requests without a session. Pro lifts the garage's
10-car limit, and is shown only where Stripe is configured. A deployment without
accounts configured gates nothing.

### UI conventions

- **Records first:** every page leads with what EPA and NHTSA recorded (fuel use or range, crash ratings) and rated power, each marked with its source (`ProvenanceChip`: EPA, NHTSA, Curated, Est.). Estimated value and running costs follow, labelled as estimates, with the region picker (`RegionSelect`) beside them; they no longer lead a card, a car page, a shortlist or a comparison.
- **One accent**, `--color-accent` in the `@theme` block of `client/src/index.css` (#34d399): main buttons, active filters and nav, "better than its class", compare's "Best", focus rings. Everything else stays neutral.
- **Type roles** in `index.css`: nothing under 12px; labels and buttons in sentence case; capitals only for `.eyebrow` section labels; figures in the text face with tabular numerals (`.tabular-nums`), not the monospace face.
- **Canadian units first:** fuel use in L/100 km (kWh/100 km for EVs, kg/100 km for hydrogen) with EPA's MPG as the secondary line (`utils/efficiency.ts`); range in km; money in CAD, said once per section (`utils/money.ts`) rather than "CAD (est.)" on each figure.
- **Results** (`CarCard.tsx`): a thumbnail, fuel use or EPA range, power and the NHTSA rating, the estimated value in small type beneath, a "why this matched" line (`utils/matchReasons.ts`) and a compare toggle, as a grid or a list (`useResultsView`; phones start on the list). The garage and shared garages use the same card.
- **Filters** (`Home.tsx`): a bar under the search box, sticky while the results scroll, with a Filters button, the filters in use (tap to remove) and one-tap common filters (`utils/quickFilters.ts`: SUV, Sedan, Pickup, Hybrid, Electric, NHTSA 5 stars, AWD, 2020+, Three rows, Manual). On a phone or tablet the button opens every filter full screen (`FilterSheet`), applied as they are tapped, with a button that counts the results ("Show 49 models"); a wide screen shows them beside the results (`FilterSidebar`). Records first: vehicle type, make, model year, powertrain, EPA fuel use (and EPA range once Electric is picked), NHTSA stars (with the share of versions NHTSA has rated), power, drive, seats and gearbox, then the estimated value, then origin, engine size and shortcuts. On a phone the filters used to be a "Show" link above the results that scrolled away with them and opened a 6,000-pixel panel in front of them; Make was under "More filters", and there was no filter for crash ratings, power, seats or gearbox.
- **Visits** are still counted once per session (`useRecordVisit`, readable at `GET /api/stats`) but no longer printed in every footer.

---

## Navigation & user flows

### Site header links

Search · Browse · Compare (badge) · VIN · Garage (badge). The phone menu adds the value chart and Methodology, and the footer links both. The region ("Costs for") is chosen where estimates are shown, in a car page's Estimated costs and compare's Estimates rows, not in the header. ("Guides" used to open a page titled "Start from a situation".)

### Primary flows

1. **Landing** → search / persona quiz → smart-search or `/home`
2. **Browse** → lifestyle preset → VehicleGrid
3. **Search** → filter/sort → CarDetail → compare/garage
4. **CarDetail** → expandables, TCO calc, similar cars
5. **Compare** → up to 5 cars; loads full `CarDashboard` per vehicle (provenance + confidence). Share copies `/compare?cars=id1,id2`.
6. **Garage** → save locally → share URL → SharedGarage
7. **Battle** → pick 2 fighters → stat duel
8. **Value Matrix** → scatter plot with presets
9. **VIN** → decode → link to search if match

---

## Curated collections

Defined in `server/src/shared/collections.ts` (re-exported by `client/src/config/collections.ts`), with each list's ranking, so the home page's previews (`GET /api/cars/collections/previews`, the first three picks, worked out once per data version) are the first three of `/collection/:id`. Each list ranks one car per model on the records, by what it promises: EPA fuel economy, NHTSA stars, rated power, EPA range, newer model years among equals. An estimated price only bounds a list (its search); it never ranks one. The first score multiplied MPG by safety and divided by price, so EVs' MPGe led "Gas savers" and a 1995 Mitsubishi pickup led "Work horses"; the next ranked on price plus running costs. Beside each pick, previews and list pages show the record the list ranks on (`utils/rankedFigure.ts`), where the estimated price was.

| ID                 | Title              | Search                                                            | Ranked by                                   |
| ------------------ | ------------------ | ----------------------------------------------------------------- | ------------------------------------------- |
| `goldilocks`       | The Goldilocks zone | Gas/hybrid cars and SUVs, 2021+, $20–35k                         | NHTSA stars, then EPA combined MPG          |
| `gas-savers`       | Gas savers         | Gas/hybrid, 2019+, 40+ MPG, under $40k                            | EPA combined MPG                            |
| `luxury-less`      | Luxury for less    | Ten luxury makes, gas/hybrid/diesel, 2018–2023, under $50k        | Newest, then NHTSA stars                    |
| `family-fortress`  | Family fortress    | Three rows (`filters.threeRow`), 2020+                            | NHTSA stars, then EPA combined MPG          |
| `weekend-warriors` | Weekend warriors   | "sports car", carmakers (not tuners), gasoline, 2018+, under $70k | Rated power                                 |
| `work-horses`      | Work horses        | "full size pickup", six truck makes, 4WD/AWD, 2019+, under $70k   | Rated power                                 |
| `future-proof`     | Future-proof       | EVs, 2022+, 250+ mi range (`filters.rangeMiles`), under $60k      | EPA range                                   |

Prices here are estimated CAD values. A star outweighs any MPG gap in the NHTSA-first lists, so a 4-star hybrid never leads 5-star cars in "the best crash ratings".

The search API reads `filters.threeRow` and `filters.rangeMiles` from a request body as well as from words; it dropped them before, so "Family fortress" listed every car of 2020 on.

---

## Browse taxonomy

Defined in `client/src/config/browseTaxonomy.ts`.

### Lifestyle presets (8)

| ID             | Label           | Filters                     |
| -------------- | --------------- | --------------------------- |
| `daily-driver` | Daily driver    | sedan+suv, <$35k, 26+ MPG   |
| `first-car`    | First car       | <$18k, 28+ MPG, 2010+       |
| `family`       | Family hauler   | suv, minivan, wagon         |
| `commuter`     | Long commute    | 40+ MPG, <$45k              |
| `work-truck`   | Work & tow      | truck, AWD/4WD              |
| `weekend`      | Weekend fun     | coupe, 3.0L+                |
| `eco`          | Go electric     | EV/hybrid/PHEV, 2018+       |
| `luxury-value` | Luxury for less | premium makes, <$50k, 2015+ |

### Buckets

- **Price:** under $15k · $15–25k · $25–40k · $40–60k · $60k+
- **Year:** 2024 · 2020+ · 2015+ · 2010–2019 · 2000–2009 · 1995–1999
- **Efficiency:** under 9.4 · under 6.7 · under 5.2 L/100 km (25+, 35+, 45+ MPG) · electric (100+ MPGe)

### Reference lists

- **Body types:** sedan, hatchback, suv, truck, coupe, wagon, minivan, van
- **Fuel types:** gasoline, hybrid, plug-in hybrid, electric, hydrogen, diesel
- **Drive types:** FWD, RWD, AWD, 4WD
- **Top makes:** Toyota, Honda, Ford, Chevrolet, BMW, Mercedes-Benz, Audi, Tesla, Nissan, Hyundai, Kia, Subaru, Mazda, Lexus, Jeep, Ram
- **Popular searches:** newest-year Camry (from `LATEST_MODEL_YEAR`), Honda Civic, Ford F-150, Toyota RAV4

---

## Landing page systems

### Hero (`Landing.tsx`)

- The promise as the headline ("Car specs from the EPA and NHTSA"; the header already says CarInfo), a line on what is on record and that estimates are labelled, `SearchBar`, and the quiz
- VIN detect: 17-char pattern → `/vin`
- `CatalogueStats`: what is on file, live from `/cars/stats/overview` (36,936 versions tested, 1,127 models, 91 makes, 1995–2027), labelled for what each counts: EPA lists each engine, gearbox and drive of a model year separately, so "35,000 cars" would promise more than the models a shopper thinks of as cars. Rounded figures hold the space until the counts load. It ends in a link that opens search with the filters open (`/home?filters=open`).
- `SampleCarCard`: a real car's page in miniature (the hero preview car's key figures: fuel use, crash rating, power and engine, each with its source), in place of a large grey drawing of the same car
- Start paths as bordered panels of chips (I know the car · I'm still deciding · I have a VIN · I'm comparing options), not underlined words
- `ShortlistCards`: each shortlist with its first three picks and the record each is ranked on

### Persona quiz → `/smart-search?persona=...&minPrice=...&maxPrice=...&priority=...&usage=...`

3 steps: budget · priority (mpg/power/safety/space) · usage (commute/family/fun/work)

Personas: `commuter` · `gearhead` · `family` · `work`

### Hero preview car (`landingShowcase.ts`)

`isLandingShowcaseEligible()` requires price, MPG, and (safety or HP). **Priority:** Camry → Civic → Accord → RAV4 → F-150. (The fuel/power/safety showcase it replaced led with a 1,250 hp Corvette ZR1X.)

### `AboutData.tsx`

Modal explaining EPA vs estimated data. Dismissible per session (`sessionStorage`).

---

## Car detail / dossier UI

**File:** `client/src/pages/CarDetail.tsx`

### Layout order

1. **Hydrogen banner** — FCEV disclaimer (amber) when applicable
2. **Header** — back; the name as the page title and tab title (`displayVehicleTitle`: the top bar said "Civic 4Dr" while the heading said "Civic Si"); body, class and fuel; a spec line (gearbox, drive, and a 0–60 time only when one is measured: a predicted time waits with the estimates); Add to compare and Save to garage
3. **KeyFigures** (`utils/keyFigures.ts`) — fuel use (L/100 km, the EPA MPG beneath), the NHTSA crash rating, power and engine, each with its source chip; an EV shows EPA range in km, energy use, crash rating and power. Fuel use is set against a typical car of its class from `classComparison` ("1.3 L/100 km less than a typical midsize car"; green better, amber worse) and power as a fact in grey ("23 hp more than…"). Power's chip says where the figure comes from (an EPA test-car or manufacturer rating is Curated; one borrowed from the same engine is Est.). One line names the rivals and links to the estimates further down.
4. **PinnedCarBar** — once the figures scroll away: name, fuel use or range, crash rating, power, compare and garage
5. **Ownership profile** — when taxonomy provides it
6. **City and highway** (in L/100 km; a longer bar is a thirstier car), crash tests, tailpipe
7. **Estimated costs** (`#costs`) — the estimated value range, yearly and five-year costs under one note ("Estimates in CAD for Ontario…"), not "CAD (est.)" on every row, with the region picker; the calculator as a button
8. **More specs** (`KeySpecs`) — what the header does not already show; EPA's vehicle category ("Car") is gone
9. **DataTrustPanel**, **Other configurations** (named by engine, fuel, gearbox and drive, since EPA lists configurations rather than trim names), **SimilarCars** (L/100 km)
10. **TCOCalculator** modal

### Missing-data rules on dossier

- No NHTSA chip or KeySpecs group when unrated: the crash-rating figure says "Not rated"
- No "not on file" rows in KeySpecs (`pushIf` skips empty)
- Value expandable hidden entirely when no data

---

## Compare page

**File:** `client/src/pages/Compare.tsx` · max 5 cars from `carStore`

On load, fetches a full `CarDashboard` per compared car (same depth as the dossier), in the reader's cost region. The current set is persisted locally and synced to `/compare?cars=id1,id2` so a refresh or share keeps the same lineup.

**In short** (`utils/compareSummary.ts`): a sentence per car on what it has that the others do not ("The SUV: the only AWD (better in snow) and the only one NHTSA has rated (5/5)"), from the records; near-ties crown nobody, and the cheapest or cheapest to run is not a reason. It replaced "Body styles: sedan, suv" and "Different shape — the sedan in this set".

### Rows, records first (rows with no data for any car are dropped)

**From EPA and NHTSA:** Fuel use, City, Highway (L/100 km or kWh/100 km, the EPA figure beneath) · EPA range (km) · NHTSA rating · Power · Torque · Engine · Gearbox · Drive · Fuel · Body · CO₂ (g/km) · Origin.

**Estimates** (CAD, the reader's region, with the region picker in the group heading): Est. value · Yearly cost · Fuel a year · 5-year cost · 0–60 mph. EPA's US-dollar fuel cost and the Year row (the column heading says it) are gone.

"Best" marks a record ahead of the runner-up by 5% or more, and only across one unit; estimates get no "Best". On a phone the label column is pinned and narrow, so two cars show whole; more scroll sideways (the second car used to be cut off mid-word).

---

## Smart search & persona quiz

**File:** `client/src/pages/SmartSearch.tsx`

### URL params

`persona`, `minPrice`, `maxPrice`, `priority`, `usage`

### Smart sort modes

`best-value` · `bang-for-buck` · `lowest-tco` · `daily-driver` · `weekend` · `resale` · `eco` · `track`

### Behavior

- Fetches a bounded candidate pool with `searchCars()` (widening the query if the first pass is thin), then ranks it client-side
- Client-side fuel type filter + persona defaults
- Shows the top-ranked picks, not an infinite list
- Each pick says why it fits the answers (`utils/quizReasons.ts`: its fuel use for a commuter, its NHTSA stars when safety comes first, its budget), then how it differs from the other two; the answers are restated in words ("For a daily commute · fuel economy matters most · $20k–$35k")

---

## Garage & sharing

### Dream Garage (`/garage`)

- Zustand + `localStorage` key `dreamGarage`
- Add/remove/clear; a summary of NHTSA 5-star cars, the most power and the makes, with the estimated total value last (an "Avg MPG" averaged an EV's MPGe with a pickup's MPG); saved cars as result cards (`CarCard`) with Remove
- Empty: the leading pick of each shortlist, each savable in one tap (it showed a padlock)
- **Share:** copies `/shared-garage?cars=id1,id2,...`

### Shared Garage (`/shared-garage`)

- Parses `?cars=` comma-separated IDs
- Fetches via `compareCars()` API
- Option to merge into local garage

### Compare store

- `carStore.comparedCars` — max 5, persisted in `localStorage` (`carinfo-compare`) and mirrored to `/compare?cars=`

---

## Spec glossary

**File:** `client/src/utils/specGlossary.ts`

Click `?` via `SpecExplain.tsx` (what + why from `getSpecEntry`)

### Keys

`engine` · `displacement` · `configuration` · `cylinders` · `horsepower` · `torque` · `drivetrain` · `transmission` · `fuel` · `body` · `category` · `epaClass` · `mpgCity` · `mpgHighway` · `mpgCombined` · `mpge` · `epaRange` · `co2` · `ghgScore` · `annualFuelCost` · `barrelsPerYear` · `fuelSavings5yr` · `kwhPer100mi` · `charge240` · `charge120` · `phevElectricRange` · `phevGasMpg` · `phevElectricMpge` · `phevBlendedMpge` · `zeroToSixty` · `safetyOverall` · `safetyFrontal` · `safetySide` · `safetyRollover` · `countryOfOrigin` · `trim` · `shoppingSegment` · `msrp` · `power` · `efficiency` · `range`

---

## KeySpecs groups

**File:** `client/src/components/KeySpecs.tsx` · only rows with data

| Group            | Fields (when present)                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Powertrain**   | Engine, displacement, layout, cylinders, HP, torque, drivetrain, transmission, fuel                                                                                    |
| **Vehicle**      | Trim, body, category, EPA class, origin, shopping segment                                                                                                              |
| **Market**       | Est. MSRP, value confidence                                                                                                                                            |
| **Fuel economy** | City/hwy/combined MPG or MPGe, PHEV electric MPGe, electric range, gas-mode MPG, blended MPGe, L2 charge, EPA range, kWh/100mi, 120V/240V charge, EPA annual fuel cost |
| **Crash safety** | NHTSA overall, frontal, side, rollover                                                                                                                                 |
| **Performance**  | Predicted 0–60                                                                                                                                                         |
| **Emissions**    | CO₂, emissions score, oil use, 5-yr fuel vs average                                                                                                                    |

Group order: Powertrain → Vehicle → Market → Fuel → Safety → Performance → **Emissions last**

---

## Ownership & valuation model

**Files:** `ownership-economics.ts`, `vehicle-valuation.ts`, `regional-assumptions.ts`

### Outputs (all CAD; Ontario by default, B.C. selectable)

- **Market value** — low/high/mid, confidence, condition bands, battery health (EV), retention tier
- **Annual cost** — energy, insurance, maintenance, tires, registration, total range
- **Resale** — 5-year projected resale, estimated loss
- **TCO** — 5-year or operating-only mode
- **Derived** — fuel cost/mile, effective cost/mile

### Regional assumptions include

Insurance by body style (coupes and convertibles share the two-door rate; luxury-brand two-doors take the luxury-performance tier for insurance, maintenance and tires) + luxury multipliers + a value factor (above 30,000 CAD the premium rises 0.4% per 1,000 of value, to at most half again: collision and comprehensive cover grow with value, liability does not; it used to step up a fifth at 110,000 only) + Tesla, Lucid, Rivian and Polestar at 1.27× for repair costs (Bankrate: a Model 3 costs 27% more to insure than the average car) · maintenance by fuel type + age · tire costs · registration · energy prices (gas, diesel, electricity, hydrogen note) · depreciation curves by segment, with one listing-fitted EV curve · CAD FX from USD EPA fuel costs

Calibration sources are cited next to each figure in `regional-assumptions.ts`: Statistics Canada pump prices, FSRA (Ontario) and ICBC (B.C.) average premiums, and the AAA/CAA driving-cost studies for maintenance and tires. Ontario registration is $0 (plate renewal fees ended March 2022); B.C.'s licence-fee figure has not been re-checked against the weight-based fee regulation.

### Disabled

`getDealRating()` → `null` on both client and server

### 0–60 prediction

`predictZeroToSixty()` — server `market-intelligence.ts` only; method `predicted` with confidence string. (A divergent client copy that returned a fabricated 0.0 s when data was missing was removed — it had no callers.)

---

## Similar vehicles

**File:** `server/src/utils/similar-vehicles.ts`

Scores candidates first by competitive set (`utils/competitive-sets.ts`: about thirty classes shoppers compare within, such as compact cars, midsize sedans, compact and three-row SUVs, full-size pickups, off-roaders, pony cars and premium sports cars, covering 98% of listings since 2005), then shopping segment affinity, body style, brand tier (except for sports cars; Tesla's Model 3 and Model Y count in both tiers, so a Model Y meets an Ioniq 5 and an EV6 as well as a Q4), price, horsepower, fuel type and model year. EPA's size class counts only when no set is known: it measures interior volume, so a Civic and a Camry are both "Midsize".

Suggestions leave out the anchor's own model line (a Huracán Sterrato for a Huracán, a Model 3 Performance for a Model 3), collector cars and cars never sold to the public (they carry no estimate, and a leased Fit EV is no alternative to a Leaf) and tuners' versions of other makes' cars (a Roush F-150); keep one car per model line and two per make; and cross between exotics and other cars only at 60% of the price or closer.

---

## VIN decoder

**Route:** `GET /api/vin/:vin?year=YYYY`  
**Page:** `/vin`  
**Source:** NHTSA vPIC (free)

### Decoded fields

VIN, year, make, model, trim, series, body class, vehicle type, drive type, doors, engine (HP, kW, cylinders, displacement, turbo, fuel, electrification), transmission, plant country/city, manufacturer

HP often absent in VIN record — UI explains this is "not on file", not zero power.

Landing detects 17-char VIN in search → redirects to `/vin`.

---

## Provenance system

`car.provenance` maps field paths to source:

| Source      | Meaning              |
| ----------- | -------------------- |
| `epa`       | EPA FuelEconomy.gov  |
| `nrcan`     | Natural Resources Canada's fuel consumption ratings (cars EPA never rated) |
| `nhtsa`     | NHTSA crash tests    |
| `curated`   | EPA test-car or manufacturer HP |
| `estimated` | Model/heuristic      |

`ProvenanceChip.tsx` shows the source beside each key figure on car pages and the home page's sample car. Dashboard adds `fieldProvenance` for analytics fields (`analytics.annualCost`, `price.msrp`, etc.).

---

## Missing-data policy & labels

**File:** `client/src/utils/dataValue.ts`

| Constant                  | Text                              |
| ------------------------- | --------------------------------- |
| `UNAVAILABLE_LABEL`       | "Not on file"                     |
| `NHTSA_CHIP_UNAVAILABLE`  | "No NHTSA rating"                 |
| `NHTSA_UNAVAILABLE_VALUE` | "No rating found"                 |
| `SAFETY_UNAVAILABLE_NOTE` | Long explanation for absent NHTSA |
| `PERFORMANCE_GAP_NOTE`    | Torque/0–60 not in EPA            |

**Dossier:** omit slots silently  
**Compare:** show "Not on file", drop all-empty rows

---

## Search engines and link previews

The site is a single-page app, so before this existed every URL served the
same empty `<div id="root">` with a generic title. Link unfurlers (Slack,
iMessage, X, Facebook) never run JavaScript, so a shared vehicle link always
previewed as "CarInfo".

`server/src/seo/` now renders the HTML shell for the pages that get shared and
indexed. The SPA is unchanged — it boots from the same `index.html` and replaces
the server-rendered content on mount.

| Route               | What the server adds                                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/car/:id`          | Title, description, canonical, Open Graph, schema.org `Car` JSON-LD, and a readable spec summary inside `#root` (also what no-JS visitors see). Unknown ids get a real **404** with `noindex`. |
| `/compare?cars=a,b` | "Compare: X vs Y" title and description for link previews, a normalized canonical, `noindex` (combinations of indexed pages). Fewer than two known cars serves the plain SPA shell.            |

Structured data deliberately has **no `offers`**: our prices are estimates, and
schema.org `Offer` asserts a real sale price.

The build writes `robots.txt` and a chunked `sitemap.xml` (every vehicle, newest
model years first) into `client/dist`. Both need an absolute origin — set
`SITE_URL` (or `APP_ORIGIN`; Vercel's production domain is used otherwise).

On Vercel, `vercel.json` rewrites `/car/*` and `/compare` to the API function,
and the rendered HTML is CDN-cached (`s-maxage`), so the function runs once per
page per cache period rather than per visit.

---

## Shared code between client and server

The client reuses server modules through three Vite/TypeScript aliases. Each
points at a directory whose modules must stay **pure** (no Node APIs, no I/O):

| Alias             | Directory           | Holds                                                                       |
| ----------------- | ------------------- | --------------------------------------------------------------------------- |
| `@carinfo/types`  | `server/src/types`  | The API contract. `client/src/types/car.types.ts` only re-exports it.       |
| `@carinfo/config` | `server/src/config` | Regional assumptions (prices, km, insurance tiers), model-year slugs.       |
| `@carinfo/shared` | `server/src/shared` | Logic both sides run: `energy-cost.ts`, the single fuel/energy cost engine. |

Two ESLint rules keep the boundary honest: the client may not import server code
by relative path, and `server/src/shared` may not import Node built-ins or
server-only modules (it is bundled into the browser).

This replaced hand-maintained copies that had drifted: the client's types were
an 18-line-diff copy of the server's, and its cost function priced hydrogen as
gasoline, so the dossier and its own TCO calculator showed different totals.

---

## Complete file inventory

### Root

| File                     | Purpose                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| `package.json`           | Workspace root, `dev`/`build`/`start`                                 |
| `vercel.json`            | Vercel build, routes, serverless config                               |
| `api/index.ts`           | Vercel entry → `server/dist/app`                                      |
| `.gitignore`             | Ignores `node_modules`, `dist`, `server/data/raw/`, `.env`, `.vercel` |
| `.cursor/worktrees.json` | Cursor worktree config                                                |

### Client — pages (21)

`Landing.tsx` · `Browse.tsx` · `Explore.tsx` · `VehicleGrid.tsx` · `CarDetail.tsx` · `Home.tsx` · `Compare.tsx` · `Collection.tsx` · `SmartSearch.tsx` · `DreamGarage.tsx` · `SharedGarage.tsx` · `BattleMode.tsx` · `ValueMatrix.tsx` · `VinDecoder.tsx` · `Methodology.tsx` · `Account.tsx` · `NotFound.tsx` · `SignIn.tsx` · `SignUp.tsx` · `ForgotPassword.tsx` · `ResetPassword.tsx`

### Client — components (42)

`AboutData` · `AccountControls` · `AccountSync` · `AuthForm` · `AuthHeaderSlot` · `AuthProvider` · `BodyTypeIllustration` · `CarCard` · `CatalogueStats` · `CompareTray` · `DataTrustPanel` · `DataValue` · `ErrorBoundary` · `FilterPills` · `FilterSheet` · `FilterSidebar` · `KeyFigures` · `KeySpecs` · `Layout` · `PageHeader` · `PageShell` · `PersonaQuiz` · `PinnedCarBar` · `ProvenanceChip` · `RegionSelect` · `RequireAccount` · `SampleCarCard` · `ScrollToTop` · `SearchBar` · `SelectMenu` · `ShortlistCards` · `SiblingConfigs` · `SimilarCars` · `SiteHeader` · `SpecExplain` · `TCOCalculator` · `ToolPageHeader` · `ui` · `ValuationLinks` · `ValueMatrixHeatmap` · `VehiclePlaceholder` · `VinScanner`

### Client — utils (31)

`bodyStyleLabel` · `carImages` · `collectionCuration` · `compareIds` · `compareSummary` · `currency` · `dataTrust` · `dataValue` · `differentiateCars` · `efficiency` · `epaContent` · `filterState` · `fuelDisplay` · `fuelEconomyUnits` · `fuelLabels` · `keyFigures` · `landingShowcase` · `matchReasons` · `money` · `pageMeta` · `quickFilters` · `quizReasons` · `rankedFigure` · `searchInterpretation` · `searchParams` · `specGlossary` · `staleBuildRecovery` · `tco` · `trimLabel` · `vin` · `visualTiers`

### Client — config (2)

`collections.ts` · `browseTaxonomy.ts`

### Client — other

`App.tsx` · `main.tsx` · `index.css` · `services/api.ts` · `stores/carStore.ts` · `stores/garageStore.ts` · `types/car.types.ts` · `vite.config.ts` · `postcss.config.js` · `tsconfig.json`

### Client — assets

Body-type PNGs: `sedan` · `suv` · `truck` · `coupe` · `hatchback` · `wagon` · `van` · `minivan`

### Server — src (29 files)

**Entry:** `index.ts` (listen + serve `client/dist`) · `app.ts` (Express setup)

**Routes:** `car.routes.ts` · `vin.routes.ts`

**Controllers:** `car.controller.ts` · `vin.controller.ts`

**Services:** `car.service.ts` · `dashboard.service.ts` · `content-enrichment.ts` · `nhtsa.service.ts`

**Utils:** `car-normalize.ts` · `data-paths.ts` · `ev-power-estimates.ts` · `ev-scoring.ts` · `fuel-cell-detection.ts` · `fuel-type-inference.ts` · `market-intelligence.ts` · `ownership-economics.ts` · `performance-hp-estimates.ts` · `search-validation.ts` · `similar-vehicles.ts` · `trim-label.ts` · `vehicle-taxonomy.ts` · `vehicle-taxonomy-apply.ts` · `vehicle-valuation.ts`

**Config:** `regional-assumptions.ts`

**Types:** `car.types.ts`

### Server — scripts (13)

| Script                           | Status                                   |
| -------------------------------- | ---------------------------------------- |
| `build-verified-database.ts`     | **Production**                           |
| `build-content-enrichment.ts`    | **Production**                           |
| `build-horsepower-enrichment.ts` | **Production**                           |
| `build-nhtsa-backfill.ts`        | **Production** (new)                     |
| `audit-nhtsa-coverage.mjs`       | Audit                                    |
| `audit-content-sources.mjs`      | Audit                                    |
| `audit-valuation-integrity.mjs`  | Audit                                    |
| `verify-valuation-fixes.mjs`     | Audit                                    |
| `measure-value-shift.mjs`        | Audit                                    |
| `build-runtime-database.ts`      | **Production** (pre-enriches for deploy) |

> Four deprecated generators — `generate-massive-database.ts`,
> `generate-portfolio-database.ts`, `generate-comprehensive-database.cjs` and
> `fetch-nhtsa-real-data.ts` — were removed. They synthesised horsepower,
> 0–60 times, dimensions and MSRP with `Math.random()` and wrote the results
> into `cars.json` with no provenance marker, which is the opposite of what
> this project promises. They were still wired to `npm run generate-db`, so
> running that command silently replaced the verified EPA database with
> invented numbers.

---

## State management

### `carStore` (Zustand, memory)

- `searchResults`, `searchQuery`, `isSearching`, `searchError`
- `comparedCars` (max 5), `availableMakes`, `availableModels`
- Actions: `performSearch`, `addCarToComparison`, `removeCarFromComparison`, `clearComparison`, `loadMakes`, `loadModels`

### `garageStore` (Zustand + persist)

- `cars[]` in `localStorage` key `dreamGarage`
- Actions: `add` (duplicate check), `remove`, `clear`, `mergeMany`

---

## Client utilities reference

| File                    | Key exports                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tco.ts`                | `computeTco`, `defaultTcoInputs`, `monthlyPayment` — the Custom TCO calculator; reproduces the dossier's 5-year figure at default inputs |
| `epaContent.ts`         | `ghgFraming`, `phevModes`, `fiveYearFuelSavings`, `fuelSavingsSentence`                                                                  |
| `fuelLabels.ts`         | `efficiencyUnit`, `annualFuelCostDetail`                                                                                                 |
| `fuelDisplay.ts`        | `formatFuelBadge`, `formatPowertrainLabel`, `usesMpge`                                                                                   |
| `trimLabel.ts`          | `displayModelLabel`, `displayTrimLabel`, `displayListingSubtitle`, `formatTransmissionLabel`                                             |
| `collectionCuration.ts` | `dedupeByModel`, ranking for collections                                                                                                 |
| `filterState.ts`        | `filtersMatchExactly`                                                                                                                    |
| `searchParams.ts`       | URL ↔ `SearchQuery` conversion                                                                                                           |
| `carImages.ts`          | Body type → image path                                                                                                                   |

---

## Server utilities reference

| File                          | Role                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `ownership-economics.ts`      | `computeOwnershipEconomics`, `estimateMarketValue`, `correctedKWhPer100Mi` |
| `vehicle-valuation.ts`        | MSRP estimation, depreciation, condition bands                             |
| `market-intelligence.ts`      | Segments, `predictZeroToSixty`, `getSegment`                               |
| `ev-scoring.ts`               | `computeEvScore` for search sort                                           |
| `ev-power-estimates.ts`       | EV HP by trim and year from the makers' ratings (EPA publishes none); a name that does not say which version gets none |
| `performance-hp-estimates.ts` | Performance HP heuristics                                                  |
| `fuel-cell-detection.ts`      | FCEV pattern detection                                                     |
| `data-paths.ts`               | `resolveDataFile()` — works locally and on Vercel                          |
| `trim-label.ts`               | Server-side trim cleanup                                                   |
| `search-validation.ts`        | `normalizeSearchQuery()` — validates POST body                             |

---

## Deployment

### Local dev

```bash
npm run dev      # concurrently: client :3000, server :5000
```

Vite proxy: `/api` → `http://localhost:5000`

Vite alias: `@carinfo/config` → `server/src/config` (shared regional assumptions)

### Production local

```bash
npm run build
npm run start    # Express on :5000 serves API + client/dist
```

### Vercel

`vercel.json` uses `rewrites` (not the legacy `routes`, which Vercel does not
allow alongside `headers`):

- `/api/*`, `/car/:id` and `/compare` go to the Express function (`api/index.ts`),
  which server-renders the vehicle and compare pages for crawlers and link
  previews; everything else is the SPA shell. Missing `/assets/*` files are real
  404s, never the HTML shell.
- The function bundles only `cars-ready.json` and `client/dist/index.html`
  (about 31 MB); raw inputs such as `cars.json` are excluded.
- Hashed assets are cached for a year; security headers (HSTS, nosniff, frame
  denial, a baseline CSP) apply to every response.
- Node is pinned by `engines` (`>=22 <25`, so Vercel runs 24 and never jumps a
  major unannounced).

### Environment variables

[`.env.example`](.env.example) is the annotated source of truth. In summary:

| Variable                                                          | Default                                                               | Purpose                                                                                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `SITE_URL`                                                        | `APP_ORIGIN`, then Vercel's production domain                         | Public origin for canonical URLs, Open Graph, sitemap, robots.txt. Without one, absolute URLs are omitted rather than guessed. |
| `APP_ORIGIN`                                                      | —                                                                     | Public origin for Stripe return URLs and the CORS allowlist. **Required in production.**                                       |
| `ADDITIONAL_ORIGINS`                                              | —                                                                     | Extra browser origins allowed to call the API (comma-separated)                                                                |
| `BETTER_AUTH_SECRET`                                              | —                                                                     | With `DATABASE_URL`, turns on accounts (32+ random characters: `openssl rand -base64 32`)                                      |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                       | —                                                                     | Adds "Continue with Google"                                                                                                    |
| `RESEND_API_KEY` / `EMAIL_FROM`                                   | —                                                                     | Password reset and email confirmation, sent through Resend                                                                     |
| `BETTER_AUTH_URL`                                                 | the request's host, if one of the site's                              | Fixes the sign-in origin (only needed behind an unusual proxy)                                                                 |
| `DATABASE_URL`                                                    | —                                                                     | Postgres for accounts, sessions and garages; tables are created on first use                                                   |
| `DATABASE_SSL`                                                    | unset: TLS **without** certificate verification (warns in production) | Set `verify` in production (plus `DATABASE_CA_CERT` for a private CA); `false` for local Postgres                              |
| `DATABASE_POOL_MAX` / `DATABASE_CONNECT_TIMEOUT_MS`               | `5` / `5000`                                                          | Per-instance pool size and connect timeout                                                                                     |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | —                                                                     | CarInfo Pro billing                                                                                                            |
| `VITE_API_BASE_URL` / `VITE_API_TIMEOUT_MS`                       | `/api` / `60000`                                                      | Client API origin and request timeout                                                                                          |
| `SLOW_REQUEST_MS`                                                 | `1000`                                                                | Log requests slower than this                                                                                                  |
| `DISABLE_RATE_LIMIT`                                              | `false`                                                               | Tests and load tests only                                                                                                      |
| `PORT`                                                            | `5000`                                                                | `npm start` port                                                                                                               |

The public catalog needs none of these.

### Enabling accounts

Sign-in runs in this server with [Better Auth](https://better-auth.com), its
accounts and sessions in the site's own Postgres: no sign-in service to pay per
user, and the sign-in pages are the site's own. It turns on once two values exist:

1. **Postgres** — create a free database (Neon, Vercel Postgres, or Supabase) and copy its connection string. Tables are created automatically on first request; no migration step.
2. **Vercel** — Project → Settings → Environment Variables, add:
   - `DATABASE_URL` = the Postgres connection string
   - `BETTER_AUTH_SECRET` = 32 or more random characters (`openssl rand -base64 32`); changing it signs everyone out

   Then redeploy. For local dev, put the same two in a root `.env`.

3. **Google sign-in (optional)** — in Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID (Web application) with the redirect URI `https://<your domain>/api/auth/callback/google`, then add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. **Email (optional)** — for "Forgot your password?" and address confirmation, add a [Resend](https://resend.com) `RESEND_API_KEY` and an `EMAIL_FROM` on a domain verified there (`CarInfo <accounts@your-domain>`).
5. **Stripe (optional, for Pro)** — add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` with a webhook pointed at `/api/billing/webhook`.

Accounts made under Clerk, which this replaced, are kept: signing up again with
the same address moves their garage, plan and Stripe customer across once the
address is confirmed (by Google, or the emailed link).

**Accounts API:** `/api/auth/*` (Better Auth: sign-in, sign-up, sign-out, password reset, Google's callback), `GET /api/me/status`, `GET/PUT /api/me/garage`, `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook`.

No `.env` required for local development of the public catalog.

---

## Scripts reference

### Root

| Script                    | What it does                                          |
| ------------------------- | ----------------------------------------------------- |
| `dev`                     | Client (:3000) and server (:5000) together            |
| `build`                   | Server, prebuilt `cars-ready.json`, client, sitemap   |
| `start`                   | Express serves the API and `client/dist`              |
| `verify`                  | `lint` + `typecheck` + `test`                         |
| `lint` / `lint:fix`       | ESLint (CI fails on any warning)                      |
| `format` / `format:check` | Prettier                                              |
| `typecheck`               | Server `src/` and `scripts/`, and the client          |
| `test` / `test:watch`     | Vitest (server `node` + client `jsdom` projects)      |
| `test:e2e`                | Playwright: trust path and axe accessibility sweep    |
| `validate:data`           | Corpus invariants over what ships (`cars-ready.json`) |
| `build:sitemap`           | `sitemap.xml` + `robots.txt` for `SITE_URL`           |

### Server data pipeline

| Script                                    | What it does                                                                                                                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `build-verified-db` (`:fast` skips NHTSA) | Rebuild `cars.json` from EPA (+ NHTSA). Needs network access to EPA and NHTSA.                                                                                                                                                                                     |
| `build-horsepower`                        | Horsepower from EPA's Test Car List, with placeholder ratings filtered out                                                                                                                                                                                         |
| `build-enrichment`                        | EPA extras (GHG, PHEV modes) and NHTSA indexes                                                                                                                                                                                                                     |
| `build-nhtsa-backfill`                    | NHTSA safety backfill                                                                                                                                                                                                                                              |
| `reconcile-fuel-types`                    | Re-derive fuel types from EPA's `vehicles.csv` and fix `cars.json` in place (`-- --write`)                                                                                                                                                                         |
| `backfill-epa-variants`                   | Add EPA listings `cars.json` is missing (other engines, Special Purpose SUVs/minivans, next model year) without touching existing IDs, and record aspiration. Downloads EPA's current file unless given one: `-- [path/to/vehicles.csv] [--dry-run]`. Reports, by model, what it adds, what it leaves out and why (before 1995, specialty conversions, no fuel economy), and cars whose EPA row is gone, so `--dry-run` checks the site is missing nothing; then run `build-enrichment -- --csv=…` and `build-runtime-db` |
| `import-nrcan`                            | Add the Canadian cars EPA never rated from NRCan's fuel consumption ratings (`scripts/lib/nrcan.ts` lists them); downloads NRCan's current files unless given a folder: `-- [path/to/folder] [--dry-run]`. Run after `backfill-epa-variants` |
| `build-runtime-db`                        | Enrich + normalize into `cars-ready.json` (format 2: provenance maps interned)                                                                                                                                                                                     |

## Dependencies

- **Client:** React 18, React Router 7, Zustand, Recharts (Value Matrix only), the
  Better Auth client (lazy), `@zxing` (VIN scanner, lazy), self-hosted `@fontsource`
  fonts. HTTP is a small typed wrapper over `fetch` (`services/http.ts`).
- **Server:** Express, helmet, express-rate-limit, compression, `pg`, Stripe,
  Better Auth. Data scripts use `csv-parse` and `exceljs`, and `fetch` for
  downloads.
- **Tooling:** TypeScript 5.9, Vite 6, Vitest 4 (+ coverage), Playwright,
  axe-core, ESLint 9, Prettier.

## Testing

**Runner:** Vitest (root `vitest.config.ts`; server `node` and client `jsdom`
projects). **CI** (`.github/workflows/ci.yml`, Node 24): static checks (lint,
typecheck, format), unit tests with a Postgres service and coverage, build with
the bundle budget and `validate:data`, Playwright E2E, and `npm audit`.

Highlights:

| Suite                                                                    | Pins                                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `fuel-type-inference.test.ts`                                            | Rules agree with EPA on every record; stale-label corrections (Cayenne, Karma, i3 REx)                                  |
| `validate-data.ts` (CI)                                                  | IDs, enums, physics: CO₂ × MPG vs fuel, BEVs without engines, plausible horsepower                                      |
| `energy-cost.test.ts` / `tco.test.ts`                                    | One cost engine for dossier and calculator; natural gas and hydrogen from EPA's figure                                  |
| `runtime-db.test.ts`                                                     | `cars-ready.json` format 2 round-trip; shared provenance frozen                                                         |
| `seo.test.ts`                                                            | Server-rendered shells, JSON-LD, escaping, real 404s                                                                    |
| `billing.webhook.test.ts`, `user-store.test.ts`, `me.controller.test.ts` | Real Postgres, per-file schema                                                                                          |
| `auth/auth.test.ts`                                                      | Sign-in, cross-site refusal, password reset, account deletion, the Clerk-era account move, the tables Better Auth needs |
| `carStore.test.ts`, `SearchBar.test.tsx`, `garageStore.test.ts`          | Latest-wins search, suggestion cancellation, garage sync rollback                                                       |
| `e2e/accessibility.spec.ts`                                              | Zero WCAG 2.2 A/AA axe violations on 14 pages, desktop and phone, signed in                                             |
| `e2e/trust-flow.spec.ts`                                                 | Search → dossier → compare, provenance labels throughout                                                                |
| `e2e/accounts.spec.ts`                                                   | Visitors see the gate on each tool; sign-up returns to the tool; sign-in and sign-out; axe on the sign-in pages         |

## Client bundle

Route pages are code-split; the sign-in client, Recharts and the VIN scanner load only where
used. `scripts/check-bundle-size.mjs` fails CI if the critical path (entry chunk
plus modulepreloads) exceeds **95 KB gzip**; it is ~84 KB today. After a deploy,
a tab still running the previous build reloads once instead of failing on a
renamed chunk (`utils/staleBuildRecovery.ts`).

## Known limitations

| Gap                                      | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NHTSA safety                             | ~13% per-car; NHTSA tests far fewer configs than EPA                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Horsepower                               | 86% coverage: 48% EPA test-car ratings, 22% makers' figures (`utils/horsepower-corrections.ts`, `utils/maker-ratings.ts`), 3% EV and fuel-cell motor ratings, and 12% the rating of the same engine in the same model from a sibling or a year either side (`fillHorsepowerFromSiblings`, when those agree within 10%). Cylinder counts EPA mistyped are put back first (`correctCylinderCount` in `utils/car-normalize.ts`: the 2025 M340i, M440i and X3 M50 listed their 3.0-litre straight six as a four, which also kept other years' ratings from filling them; the 2025 Panamera E-Hybrids, a 2019 S560e, a 2007 Sebring and a 2000 LX 470 likewise). Most of the 5,038 listings still without one are older trucks, vans and SUVs, and cars from the 7,547 listings restored from EPA, until `build-horsepower` is re-run against EPA's test-car files, which are keyed by EPA ID. Its matcher compares displacement and cylinders, not aspiration, so a turbo engine could take the non-turbo rating (the 2005 Legacy GT had the 2.5i's 168 hp); `dropInductionMismatchedHorsepower` drops those 118 ratings at build time, and the matcher should compare aspiration when re-run. 31 placeholder ratings (999, 1, 11 hp…) were dropped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Dimensions / weight / torque / real 0–60 | Not in EPA bulk data; 0–60 is predicted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Market value                             | Calibrated against Canadian MSRPs and listing averages (`valuation-calibration.test.ts`, 74 references across compact cars and SUVs, minivans, luxury, performance, supercars, pickups, plug-in hybrids and EVs, all within 25%). Size class is a coarse price signal; trims are distinguished only where the engine gives them away (Mustang GT, Camaro ZL1, Challenger Hellcat, Civic Type R). Exotics, flagships (S-Class, 7 Series, A8, G90), Land Rovers, Cadillac V and Alfa Quadrifoglio models are priced by model line (a 570S apart from a 765LT, a Maybach S 680 apart from an S 450); flagships, big luxury SUVs and Range Rovers then lose value on an age-ramped penalty fitted to US listing averages at the ~1.2 Canada/US listing ratio the reference cars show (a 2018 S 560 ~US$37,200, a 2023 S 580 ~US$79,000, a 2019 Q7 ~US$20,400); full-size SUVs without a V8 have model anchors, since the size class priced a 2024 Expedition at $40,000 against a $66,849 CarGurus.ca average and a 2024 Sequoia at $52,000 against ~$90,500 (both now within 5%, and in `valuation-calibration.test.ts`), as do Maserati's Grecale by trim and Karma, a thin market kept at low confidence, and the Avalanche and Explorer Sport Trac, pickups that anchored on SUV classes (a 2012 Avalanche read $12,000 against ~$15,000); older Tacomas, JK and TJ Wranglers, the FJ Cruiser and the 370Z hold level late in life (a 2010 FJ Cruiser read $12,000 against ~US$20,600, a 2008 Tacoma $11,250 against ~US$13,300), and a Civic EPA filed as a subcompact no longer falls on the economy curve (a 2008 read $4,900 against ~US$6,500); C5 and C6 Corvettes hold value like the later cars and anchor at today's prices (a 2008 read $17,000 against a ~US$33,000 average, a C6 Z06 was priced as a base car), in `valuation-calibration.test.ts` at the ~1.2 Canada/US listing ratio; supercars, BMW M2/M3/M4 and the GT-R follow a flatter curve than the exotic one (a 2017 Huracán keeps ~80% of today's sticker, a Bentayga ~30%), checked against a handful of US listing averages, and are never labelled better than medium confidence. Collector cars (`utils/collector-cars.ts`: first-gen NSX, MkIV Supra, air-cooled 911, limited-run 911s, SLS, Elise, Lancer Evolution, STI S209, Viper (Dodge's and SRT's), Chevrolet SS, Ford GT, 20-year-old Ferraris and Lamborghinis, hypercars…, and the first RAV4 EV, whose 328 retail cars trade among enthusiasts) are deliberately not valued, and neither are cars never sold to the public (`utils/not-retailed.ts`: the leased EV1, EV Plus, Fit EV, Clarity EV and fuel-cell cars, the MINI E and ActiveE trials, fleet cars such as the Ranger EV, EPIC minivans, BYD e6, Lordstown Endurance and Motional's Ioniq 5 robotaxi, and the Postal Service's Explorers): with no used market, the depreciation figure (a 1999 EV1 read $8,750) is a price nobody can pay. Both carry `ownership.unvalued` (`utils/unvalued.ts`) with the reason, which the car page shows in place of its value and costs. |
| Hydrogen and natural gas fuel cost       | EPA's own annual figure, converted to CAD; the calculator's price inputs do not apply                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Rate limits                              | In-memory per instance; on serverless each instance counts separately                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| CSP                                      | Baseline only (`base-uri`, `object-src`, `frame-ancestors`); no third-party scripts remain, so `script-src 'self'` is now possible                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Photos                                   | Body-type illustrations only (documented on `/methodology`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `server/data/raw/`                       | Gitignored; the data pipeline needs network access to EPA and NHTSA                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Outstanding work

### Data

- [ ] Re-run `build-horsepower` to restore correct ratings for the 31 dropped placeholders
- [ ] Full NHTSA backfill → `build-enrichment`
- [ ] A source for dimensions, weight and torque

### Product and platform

- [ ] Model-year landing pages. `config/modelYearSlug.ts` is built and tested but unwired, and
      should stay that way until models are grouped into families: EPA names are so granular
      ("Civic 4Dr", "Civic 5Dr") that it yields 17,409 pages for 28,276 cars, a median of one
      configuration per page, and 9,818 pages that would duplicate a single dossier. Group by
      model family first (without merging, say, Mustang Mach-E into Mustang), then publish only
      pages with several configurations.
- [ ] `script-src 'self'` CSP (no third-party scripts since Clerk left)
- [ ] Shared rate-limit store if abuse appears on serverless

## Git & deployment notes

CI runs on pushes to `main`, on pull requests, and on manual dispatch.

---

## License

ISC
