# CarInfo

A full-stack car discovery and comparison platform. **Specs-first** — EPA fuel economy, engine, emissions, and safety (when available) — with clearly labeled **estimated** market value, running cost, and TCO analytics.

- **~35,800 vehicles** (1995–2027) across **92 makes**
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
20. [Glance metrics](#glance-metrics)
21. [KeySpecs groups](#keyspecs-groups)
22. [Ownership & valuation model](#ownership--valuation-model)
23. [Similar vehicles](#similar-vehicles)
24. [VIN decoder](#vin-decoder)
25. [Provenance system](#provenance-system)
26. [Missing-data policy & labels](#missing-data-policy--labels)
27. [Complete file inventory](#complete-file-inventory)
28. [State management](#state-management)
29. [Client utilities reference](#client-utilities-reference)
30. [Server utilities reference](#server-utilities-reference)
31. [Deployment](#deployment)
32. [Scripts reference](#scripts-reference)
33. [Dependencies](#dependencies)
34. [Code reference](#code-reference)
35. [Known limitations](#known-limitations)
36. [Roadmap](#roadmap)
37. [License](#license)

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

| Data | Source | In UI | Notes |
|------|--------|-------|-------|
| MPG/MPGe, engine, drive, transmission, CO₂, annual fuel cost, EV range | EPA FuelEconomy.gov | Verified | In `cars.json` |
| GHG score, barrels/yr, 5-yr fuel savings, PHEV dual-mode | EPA `vehicles.csv` | Verified | `epa-enrichment.json` |
| Rated horsepower | EPA Test Car List | Verified | `horsepower-enrichment.json` |
| EV horsepower (no test-car match) | Heuristic | **Est.** | `ev-power-estimates.ts` |
| Safety star ratings | NHTSA | Verified | When enriched |
| Market value, running cost, TCO, resale | Depreciation model | **Est.** | Ontario/CAD |
| Predicted 0–60 | HP/weight heuristic | **Est.** | `predictZeroToSixty()` |
| Shopping segment, ownership profile | Taxonomy rules | **Est.** | `vehicle-taxonomy.ts` |
| Dimensions, real 0–60, top speed, torque | Not in EPA bulk | Omitted | Compare hides empty rows |
| Listing photos | N/A | Placeholder PNGs | Body-type illustrations only |

---

## Data coverage

### Database totals

| Metric | Count |
|--------|-------|
| Total vehicles | 35,825 (35,823 after ID merges) |
| Year range | 1995–2027 (2027 partial) |
| Makes | 92 |
| EPA enrichment records | 35,825 |
| Horsepower enrichment keys | 20,043 (~56%) |
| NHTSA combo ratings | 1,025 `make\|model\|year` |
| NHTSA per-car index | 4,518 (12.6%) |
| Turbocharged / supercharged | 11,369 |
| NHTSA cache lookups attempted | 13,842 |

### Body style breakdown

| Body style | Count |
|------------|-------|
| sedan | 16,264 |
| suv | 10,141 |
| truck | 4,095 |
| coupe | 2,013 |
| wagon | 1,816 |
| van | 889 |
| minivan | 586 |
| hatchback | 21 |

### Fuel types

Stored in `cars.json` as EPA classifies them (`scripts/reconcile-fuel-types.ts`
re-derives them from EPA's `vehicles.csv`): gasoline, diesel, hybrid, plug-in
hybrid, electric, hydrogen, and natural gas (dedicated CNG, e.g. the Civic GX).
Bi-fuel and flex-fuel vehicles are gasoline, since their EPA figures are
gasoline figures. The runtime rules in `fuel-type-inference.ts` remain as a
second line of defense and agree with EPA on every record (a test pins that).

### Field coverage in raw `cars.json`

| Field | Records |
|-------|---------|
| trim | 35,825 |
| engine.configuration | 31,428 |
| engine.aspiration | 11,369 |
| transmission.speeds | 22,489 |
| countryOfOrigin | 32,457 |
| epa.co2 | 17,859 |
| epa.charge240Hours | 1,874 |
| epa.charge120Hours | 1 |
| dimensions | 0 |
| performance | 0 |
| safetyRating | 0 |
| engine.horsepower | 0 |
| epa.ghgScore | 0 |

Enrichment adds HP, GHG, safety, corrected PHEV/EV economy at load time.

### Vehicle ID format

Slug derived from EPA record, e.g. `acura-nsx-1995-nsx-2mode-clkup-automatic-4-spd`. Each `id` is unique per EPA configuration (trim/transmission variant).

### Data files

| File | Keyed by | Contents | Git |
|------|----------|----------|-----|
| `server/data/cars.json` | `id` | Master vehicle DB | Committed |
| `server/data/epa-enrichment.json` | `epaId` | GHG, barrels, PHEV, EV kWh/range, charge times | Committed |
| `server/data/horsepower-enrichment.json` | `epaId` | EPA test-car rated HP | Committed |
| `server/data/nhtsa-safety.json` | `make\|model\|year` | NHTSA star ratings | Committed |
| `server/data/nhtsa-by-car-id.json` | `id` | Pre-resolved NHTSA per vehicle | New/untracked |
| `server/data/raw/vehicles.csv` | — | EPA source CSV | Gitignored |
| `server/data/raw/nhtsa-enrichment-cache.json` | — | NHTSA API cache | Gitignored |
| `server/data/raw/test-car-data/*.csv` | — | EPA test car list per year | Gitignored |
| `server/data/manual-prices.json` | — | Optional MSRP overrides keyed by car id | Not present (build skips it) |

---

## Data model

Types live in `client/src/types/car.types.ts` and `server/src/types/car.types.ts` (mirrored).

### `CarSpecs` — core vehicle record

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Unique slug |
| `make`, `model`, `year` | string/number | |
| `trim` | string? | EPA trim slug (cleaned for display) |
| `countryOfOrigin` | string? | From NHTSA cache when available |
| `epaId` | number? | EPA `vehicles.csv` id |
| `provenance` | `Provenance` | Per-field source map |
| `vehicleCategory` | `car\|suv\|truck\|van` | Computed |
| `shoppingSegment` | `ShoppingSegment` | Computed |
| `ownershipProfile` | object? | Label, tags, bestFor |
| `engine` | object | displacement, hp, torque, fuelType, cylinders, configuration |
| `performance` | object? | zeroToSixty, topSpeed, quarterMile (always empty in prod DB) |
| `dimensions` | object? | length, width, height, wheelbase, curbWeight (always empty in prod DB) |
| `fuelEconomy` | object | city, highway, combined |
| `epa` | object? | co2, annualFuelCost, rangeMiles, kWhPer100Mi, charge times, vClass, ghgScore, fuelSavings5yrUsd, barrelsPerYear, phev |
| `transmission` | object | type, speeds, description |
| `driveType` | FWD/RWD/AWD/4WD | |
| `bodyStyle` | BodyStyle | May be corrected from EPA VClass |
| `safetyRating` | object? | overall, frontal, side, rollover |
| `price` | object? | msrp, min, max, isEstimated, confidence |
| `images` | string[]? | Unused in prod |
| `productionYears` | object? | start, end |

### `CarDashboard` — dossier API response

| Field | Description |
|-------|-------------|
| `car` | Enriched, normalized `CarSpecs` with display price |
| `segmentCount` | Size of comparison segment |
| `ownership` | Full `OwnershipEconomics` |
| `dealRating` | Always `null` (disabled) |
| `annualRunningCost` | low/high/mid or null |
| `tco5Year` | low/high/mid or null |
| `evCharge` | charge120/240, kWh/100mi, range (EV/FCEV) |
| `fieldProvenance` | Merged provenance for analytics fields |
| `zeroToSixty` | `{ value, method: 'actual'\|'predicted', confidence }` |

### Enums

**FuelType:** `gasoline` · `diesel` · `electric` · `hybrid` · `plug-in hybrid` · `hydrogen` · `natural gas`

**BodyStyle:** `sedan` · `suv` · `coupe` · `convertible` · `hatchback` · `wagon` · `truck` · `van` · `minivan`

**ShoppingSegment:** `hot-hatch` · `sport-compact` · `sport-sedan` · `muscle` · `sports-car` · `luxury` · `mainstream` · `utility` · `ev` · `truck`

**ProvenanceSource:** `epa` · `nhtsa` · `estimated` · `curated`

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

### `build-verified-database.ts`

- Downloads `https://fueleconomy.gov/feg/epadata/vehicles.csv`
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

Flags: `--skip-nhtsa`, `--nhtsa-from=2011`, `--limit=N`

### `build-horsepower-enrichment.ts`

Downloads per-year EPA Test Car List CSVs to `server/data/raw/test-car-data/`, matches by make + engine + carline → `horsepower-enrichment.json`.

```bash
npm run build-horsepower --workspace=server
```

Flags: `--from=2010 --to=2026`, `--offline`, `--refresh`

### `build-content-enrichment.ts`

Reads `vehicles.csv` columns:

- `ghgScore`, `youSaveSpend`, `barrels08` → GHG, 5-yr savings, barrels/yr
- PHEV: `comb08`, `combA08`, `city08`, `cityA08`, `highway08`, `highwayA08`, `rangeA`, `charge240`, `phevComb`
- EV: `comb08`, `city08`, `highway08`, `combE`, `range`, `charge120`, `charge240`

Writes `epa-enrichment.json`, `nhtsa-safety.json`, `nhtsa-by-car-id.json`.

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
4. Estimate EV HP if still missing (`provenance: 'estimated'`)

Then `normalizeCarRecord()` applies fuel-type inference, MPGe labels, hydrogen notes.

---

## Taxonomy & fuel-type correction

### `vehicle-taxonomy.ts`

**`canonicalizeDisplayModel()`** — disambiguates EPA slugs (Golf GTI vs Golf, Civic Type R, Cooper S, WRX, etc.)

**`inferBodyStyle()`** — corrects EPA mislabels (hatchbacks listed as sedans, etc.)

**`classifyShoppingSegment()`** — rules based on fuel type, body, HP, displacement, make, price:

| Segment | Triggers (simplified) |
|---------|----------------------|
| `ev` | electric or hydrogen |
| `truck` | bodyStyle truck |
| `utility` | suv, van, minivan |
| `hot-hatch` | GTI, Type R, ST, etc. |
| `sport-sedan` | WRX, Si, AMG, etc. |
| `muscle` | coupe + HP≥400 or disp≥5L |
| `sports-car` | coupe/convertible otherwise |
| `luxury` | premium make + MSRP >$55k |
| `sport-compact` | hatchback + HP≥150 |
| `mainstream` | default |

**`ownershipProfileFor()`** — human label + tags + bestFor for sport-compact, sport-sedan, etc.

### `fuel-type-inference.ts`

Reclassifies mislabeled EPA records:

- **Hydrogen:** `isFuelCellVehicle()` patterns
- **PHEV:** name patterns (Volt, Prius Prime, T8, 4xe, etc.), gas displacement + short electric range (<50 mi)
- **BEV:** Tesla, Leaf, Model 3, Ioniq 5, etc.

### `car-normalize.ts`

- Applies effective fuel type
- Sets MPGe vs MPG labels
- Hydrogen: "Not rated — hydrogen price varies by station & region" for fuel cost
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

| Method | Path | Limits | Description |
|--------|------|--------|-------------|
| GET | `/health` | — | `{ status, carsTotal, dbFound }` |
| GET | `/cars/makes` | — | Sorted make list |
| GET | `/cars/makes/:make/models` | — | Models for make |
| POST | `/cars/search` | max 500/request | Filtered search |
| GET | `/cars/search/suggestions` | max 20 | Autocomplete |
| POST | `/cars/compare` | max 5 IDs | Batch lookup |
| GET | `/cars/stats/overview` | — | DB statistics |
| GET | `/cars/stats/chart-points` | query params | Scatter plot sample |
| GET | `/cars/:id` | — | Single vehicle |
| GET | `/cars/:id/dashboard` | — | Full dossier |
| GET | `/cars/:id/raw` | — | Debug: `{ raw, enriched, normalized }` pipeline |
| GET | `/cars/:id/similar` | `?limit=6` | Similar vehicles |
| GET | `/vin/:vin` | `?year=YYYY` | VIN decode |

### Search

**Sort fields:** `make`, `model`, `year`, `horsepower`, `price`, `fuelEconomy`, `range`, `evScore`, `relevance`

**Filters:** make, model, year, countryOfOrigin, bodyStyle, fuelType, transmission, driveType, price, horsepower, displacement, fuelEconomy

**Natural language:** `"2024 camry"`, `"toyota rav4"` → parsed into filters (user filters win over parsed)

**Names EPA does not use** (`utils/fuzzy-search.ts`): model matching ignores hyphens and spaces (`f150`, `f 150` and `f-150` all find EPA's "F150 Pickup" and "F-150 Lightning"); lineup names resolve to the models that follow them (`3 series` → 318i…M340i, M3; `c class` → C300, AMG C43; `g wagon` → the G-Class); renamed models map to their family (`miata` → MX-5, `silverado 1500` → every half-ton Silverado). A make typo must be a near miss of a whole word of the make, so `gle` means the Mercedes GLE, not Eagle.

**Years outside the data:** an empty search whose years are all off file returns `yearCoverage: { min, max }`, and the results page offers the same search in every year.

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

**Pagination:** the server caps `limit` at 500 per request; clients page with `offset`. Search is also available as `GET /api/cars/search?q=…&make=…&sort=price:asc`, which is CDN-cacheable and linkable.

---

## Routes & pages

| Route | File | Layout | Description |
|-------|------|--------|-------------|
| `/` | `Landing.tsx` | No | Hero, stats, search, persona quiz, collections, showcase |
| `/browse` | `Browse.tsx` | Yes | Lifestyle presets + taxonomy |
| `/explore/:category` | `Explore.tsx` | Yes | Category drill-down |
| `/vehicles/:category/:subcategory` | `VehicleGrid.tsx` | Yes | Filtered grid + sidebar |
| `/car/:id` | `CarDetail.tsx` | Yes | Vehicle dossier |
| `/home` | `Home.tsx` | Yes | Main search |
| `/compare` | `Compare.tsx` | Yes | Side-by-side table (dashboard API, full provenance) |
| `/collection/:collectionId` | `Collection.tsx` | Yes | Curated collection |
| `/smart-search` | `SmartSearch.tsx` | Yes | Persona-ranked search |
| `/garage` | `DreamGarage.tsx` | Yes | Saved garage |
| `/shared-garage` | `SharedGarage.tsx` | Yes | `?cars=id1,id2` |
| `/battle` | `BattleMode.tsx` | Yes | 2-car head-to-head (provenance-aware) |
| `/value-matrix` | `ValueMatrix.tsx` | Yes | Recharts scatter (lazy-loaded chunk) |
| `/methodology` | `Methodology.tsx` | Yes | Data pipeline, PHEV correction, valuation model |
| `/vin` | `VinDecoder.tsx` | Yes | VIN lookup |
| `/account` | `Account.tsx` | Yes | Clerk garage sync and billing (when keys exist) |

`Layout.tsx` wraps all non-landing routes with `SiteHeader`.

---

## Navigation & user flows

### Site header links

Browse · Search · Compare (badge) · Value Chart · VIN Lookup · Methodology · Garage (badge)

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

Defined in `client/src/config/collections.ts`. Used by Landing (cards + counts) and `/collection/:id`.

| ID | Title | Filters (summary) |
|----|-------|-------------------|
| `goldilocks` | The Goldilocks Zone | $15–35k, 30+ MPG, dedupe by model, rank best-value |
| `gas-savers` | Best Gas Savers | 35+ MPG, <$40k |
| `luxury-less` | Luxury for Less | Mercedes/BMW/Audi/Lexus/etc., <$50k, 2015+ |
| `family-fortress` | Family Fortress | SUV + minivan |
| `weekend-warriors` | Weekend Warriors | Coupe, 3.0L+ |
| `work-horses` | Work Horses | Truck, AWD/4WD |
| `future-proof` | Future Proof | EV/hybrid/PHEV, 2018+ |

---

## Browse taxonomy

Defined in `client/src/config/browseTaxonomy.ts`.

### Lifestyle presets (8)

| ID | Label | Filters |
|----|-------|---------|
| `daily-driver` | Daily driver | sedan+suv, <$35k, 26+ MPG |
| `first-car` | First car | <$18k, 28+ MPG, 2010+ |
| `family` | Family hauler | suv, minivan, wagon |
| `commuter` | Long commute | 40+ MPG, <$45k |
| `work-truck` | Work & tow | truck, AWD/4WD |
| `weekend` | Weekend fun | coupe, 3.0L+ |
| `eco` | Go electric | EV/hybrid/PHEV, 2018+ |
| `luxury-value` | Luxury for less | premium makes, <$50k, 2015+ |

### Buckets

- **Price:** under $15k · $15–25k · $25–40k · $40–60k · $60k+
- **Year:** 2024 · 2020+ · 2015+ · 2010–2019 · 2000–2009 · 1995–1999
- **MPG:** 25+ · 35+ · 45+ · 100+ MPGe

### Reference lists

- **Body types:** sedan, hatchback, suv, truck, coupe, wagon, minivan, van
- **Fuel types:** gasoline, hybrid, plug-in hybrid, electric, hydrogen, diesel
- **Drive types:** FWD, RWD, AWD, 4WD
- **Top makes:** Toyota, Honda, Ford, Chevrolet, BMW, Mercedes-Benz, Audi, Tesla, Nissan, Hyundai, Kia, Subaru, Mazda, Lexus, Jeep, Ram
- **Popular searches:** newest-year Camry (from `LATEST_MODEL_YEAR`), Honda Civic, Ford F-150, Toyota RAV4

---

## Landing page systems

### Hero (`Landing.tsx`)

- Specs-first copy, database stats, `SearchBar`
- Quick chips: Electric, SUV, Under $20k, Best MPG (live counts)
- VIN detect: 17-char pattern → `/vin`

### Persona quiz → `/smart-search?persona=...&minPrice=...&maxPrice=...&priority=...&usage=...`

3 steps: budget · priority (mpg/power/safety/space) · usage (commute/family/fun/work)

Personas: `commuter` · `gearhead` · `family` · `work`

### Showcase cards (`landingShowcase.ts`)

Queries for fuel / power / safety insights. `isLandingShowcaseEligible()` requires price, MPG, and (safety or HP).

**Hero preview priority:** Camry → Civic → Accord → RAV4 → F-150

### Dossier example cards

Topic labels: Engine & displacement · Horsepower · NHTSA safety · Fuel economy

### `AboutData.tsx`

Modal explaining EPA vs estimated data. Dismissible per session (`sessionStorage`).

---

## Car detail / dossier UI

**File:** `client/src/pages/CarDetail.tsx`

### Layout order

1. **Nav bar** — back, title, +Garage, +Compare
2. **Hydrogen banner** — FCEV disclaimer (amber) when applicable
3. **Hero** — year, make, model, trim, chips (body, drive, fuel, powertrain, HP, NHTSA if rated, origin)
4. **Ownership profile** — when taxonomy provides it (label, tags, bestFor)
5. **ValuationLinks** — compact market/assumptions
6. **GlanceRow** — up to 4 metrics (filterable via trust filter)
7. **DataTrustPanel** — field-level provenance + confidence; All / Verified / Estimated filter
8. **KeySpecs** — grouped spec grid
8. **Mobile actions** — Garage, TCO calc
9. **Expandables:**
   - Fuel economy (EPA bars, PHEV dual-mode, EV charge)
   - Emissions (CO₂, GHG score, oil use, 5-yr savings) — **kept, not top priority**
   - Crash safety (only when NHTSA rated)
   - Value & ownership (only when market value or cost data exists)
10. **SimilarCars**
11. **TCOCalculator** modal

### Missing-data rules on dossier

- No NHTSA chip, glance cell, KeySpecs group, or expandable when unrated
- No "not on file" rows in KeySpecs (`pushIf` skips empty)
- Value expandable hidden entirely when no data

---

## Compare page

**File:** `client/src/pages/Compare.tsx` · max 5 cars from `carStore`

On load, fetches a full `CarDashboard` per compared car (same depth as the dossier). Uses `fieldProvenance`, `ownership.marketValue.confidenceLabel`, and per-field `ProvenanceChip` on analytics rows. The current set is persisted locally and synced to `/compare?cars=id1,id2` so a refresh or share keeps the same lineup.

### Spec rows (rows with zero data across all cars are dropped)

YEAR · ORIGIN · TYPE · ENGINE · POWER · TORQUE · FUEL · TRANS · DRIVE · 0-60 · TOP SPEED · EFF CITY/HWY/AVG · FUEL $/YR · CO2 G/MI · EST. VALUE

Trust filter: All fields · Verified only · Estimates only.

Best value highlighted when 2+ cars have numeric data. Missing cells use `UNAVAILABLE_LABEL` with muted styling when some cars have data.

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

---

## Garage & sharing

### Dream Garage (`/garage`)

- Zustand + `localStorage` key `dreamGarage`
- Add/remove/clear, total value, avg MPG, unique makes
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

## Glance metrics

**File:** `client/src/utils/glanceMetrics.ts` · up to **4 cells**

### Profiles (what leads)

| Profile | Priority order |
|---------|----------------|
| `ev` | range → mpg → power → engine → safety |
| `performance` | power → engine → mpg → safety |
| `efficient` | mpg → power → engine → safety |
| `standard` | power → engine → mpg → safety |

Performance marques: Porsche, Ferrari, Lamborghini, Aston Martin, McLaren, Maserati, Bentley, Rolls-Royce, Lotus, Alfa Romeo, Jaguar, Dodge

### Candidate metrics

Engine · Horsepower · Est. value · Combined MPG/MPGe · EPA range · Running cost · Safety (NHTSA only)

PHEV MPG cell shows gas-mode MPG with electric range detail.

**Fallback** (`GlanceRow`): categorical chips only — no "data not available" message.

---

## KeySpecs groups

**File:** `client/src/components/KeySpecs.tsx` · only rows with data

| Group | Fields (when present) |
|-------|----------------------|
| **Powertrain** | Engine, displacement, layout, cylinders, HP, torque, drivetrain, transmission, fuel |
| **Vehicle** | Trim, body, category, EPA class, origin, shopping segment |
| **Market** | Est. MSRP, value confidence |
| **Fuel economy** | City/hwy/combined MPG or MPGe, PHEV electric MPGe, electric range, gas-mode MPG, blended MPGe, L2 charge, EPA range, kWh/100mi, 120V/240V charge, EPA annual fuel cost |
| **Crash safety** | NHTSA overall, frontal, side, rollover |
| **Performance** | Predicted 0–60 |
| **Emissions** | CO₂, emissions score, oil use, 5-yr fuel vs average |

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

Insurance by body style + luxury multipliers · maintenance by fuel type + age · tire costs · registration · energy prices (gas, diesel, electricity, hydrogen note) · depreciation curves by segment, with one listing-fitted EV curve · CAD FX from USD EPA fuel costs

Calibration sources are cited next to each figure in `regional-assumptions.ts`: Statistics Canada pump prices, FSRA (Ontario) and ICBC (B.C.) average premiums, and the AAA/CAA driving-cost studies for maintenance and tires. Ontario registration is $0 (plate renewal fees ended March 2022); B.C.'s licence-fee figure has not been re-checked against the weight-based fee regulation.

### Disabled

`getDealRating()` → `null` on both client and server

### 0–60 prediction

`predictZeroToSixty()` — server `market-intelligence.ts` only; method `predicted` with confidence string. (A divergent client copy that returned a fabricated 0.0 s when data was missing was removed — it had no callers.)

---

## Similar vehicles

**File:** `server/src/utils/similar-vehicles.ts`

Scores candidates by: shopping segment affinity, body style, price tier, HP similarity, fuel type match, exotic make isolation, dedupe by base model key.

Exotic makes never cross-shop with mainstream.

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

| Source | Meaning |
|--------|---------|
| `epa` | EPA FuelEconomy.gov |
| `nhtsa` | NHTSA crash tests |
| `curated` | EPA test car list HP |
| `estimated` | Model/heuristic |

`ProvenanceChip.tsx` shows badges on cards. Dashboard adds `fieldProvenance` for analytics fields (`analytics.annualCost`, `price.msrp`, etc.).

---

## Missing-data policy & labels

**File:** `client/src/utils/dataValue.ts`

| Constant | Text |
|----------|------|
| `UNAVAILABLE_LABEL` | "Not on file" |
| `NHTSA_CHIP_UNAVAILABLE` | "No NHTSA rating" |
| `NHTSA_UNAVAILABLE_VALUE` | "No rating found" |
| `SAFETY_UNAVAILABLE_NOTE` | Long explanation for absent NHTSA |
| `PERFORMANCE_GAP_NOTE` | Torque/0–60 not in EPA |

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

| Route | What the server adds |
|-------|---------------------|
| `/car/:id` | Title, description, canonical, Open Graph, schema.org `Car` JSON-LD, and a readable spec summary inside `#root` (also what no-JS visitors see). Unknown ids get a real **404** with `noindex`. |
| `/compare?cars=a,b` | "Compare: X vs Y" title and description for link previews, a normalized canonical, `noindex` (combinations of indexed pages). Fewer than two known cars serves the plain SPA shell. |

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

| Alias | Directory | Holds |
|-------|-----------|-------|
| `@carinfo/types` | `server/src/types` | The API contract. `client/src/types/car.types.ts` only re-exports it. |
| `@carinfo/config` | `server/src/config` | Regional assumptions (prices, km, insurance tiers), model-year slugs. |
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

| File | Purpose |
|------|---------|
| `package.json` | Workspace root, `dev`/`build`/`start` |
| `vercel.json` | Vercel build, routes, serverless config |
| `api/index.ts` | Vercel entry → `server/dist/app` |
| `.gitignore` | Ignores `node_modules`, `dist`, `server/data/raw/`, `.env`, `.vercel` |
| `.cursor/worktrees.json` | Cursor worktree config |

### Client — pages (16)

`Landing.tsx` · `Browse.tsx` · `Explore.tsx` · `VehicleGrid.tsx` · `CarDetail.tsx` · `Home.tsx` · `Compare.tsx` · `Collection.tsx` · `SmartSearch.tsx` · `DreamGarage.tsx` · `SharedGarage.tsx` · `BattleMode.tsx` · `ValueMatrix.tsx` · `VinDecoder.tsx` · `Methodology.tsx` · `Account.tsx` · `NotFound.tsx`

### Client — components (30)

`AboutData` · `BodyTypeIllustration` · `CarCard` · `DataValue` · `FilterPills` · `FilterSidebar` · `GlanceMetricCell` · `GlanceRow` · `KeySpecs` · `Layout` · `PageHeader` · `PersonaQuiz` · `ProvenanceChip` · `ScrollToTop` · `SearchBar` · `SimilarCars` · `SiteHeader` · `SpecExplain` · `TCOCalculator` · `ui` · `ValuationLinks` · `VehiclePlaceholder`

### Client — utils (18)

`carImages` · `collectionCuration` · `currency` · `dataValue` · `epaContent` · `filterState` · `fuelDisplay` · `fuelEconomyUnits` · `fuelLabels` · `glanceMetrics` · `landingShowcase` · `searchParams` · `tco` · `specGlossary` · `trimLabel`

### Client — config (2)

`collections.ts` · `browseTaxonomy.ts`

### Client — other

`App.tsx` · `main.tsx` · `index.css` · `services/api.ts` · `stores/carStore.ts` · `stores/garageStore.ts` · `types/car.types.ts` · `vite.config.ts` · `tailwind.config.js` · `postcss.config.js` · `tsconfig.json`

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

| Script | Status |
|--------|--------|
| `build-verified-database.ts` | **Production** |
| `build-content-enrichment.ts` | **Production** |
| `build-horsepower-enrichment.ts` | **Production** |
| `build-nhtsa-backfill.ts` | **Production** (new) |
| `audit-nhtsa-coverage.mjs` | Audit |
| `audit-content-sources.mjs` | Audit |
| `audit-valuation-integrity.mjs` | Audit |
| `verify-valuation-fixes.mjs` | Audit |
| `measure-value-shift.mjs` | Audit |
| `build-runtime-database.ts` | **Production** (pre-enriches for deploy) |

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

| File | Key exports |
|------|-------------|
| `tco.ts` | `computeTco`, `defaultTcoInputs`, `monthlyPayment` — the Custom TCO calculator; reproduces the dossier's 5-year figure at default inputs |
| `epaContent.ts` | `ghgFraming`, `phevModes`, `fiveYearFuelSavings`, `fuelSavingsSentence` |
| `fuelLabels.ts` | `efficiencyUnit`, `annualFuelCostDetail` |
| `fuelDisplay.ts` | `formatFuelBadge`, `formatPowertrainLabel`, `usesMpge` |
| `trimLabel.ts` | `displayModelLabel`, `displayTrimLabel`, `displayListingSubtitle`, `formatTransmissionLabel` |
| `collectionCuration.ts` | `dedupeByModel`, ranking for collections |
| `filterState.ts` | `filtersMatchExactly` |
| `searchParams.ts` | URL ↔ `SearchQuery` conversion |
| `carImages.ts` | Body type → image path |

---

## Server utilities reference

| File | Role |
|------|------|
| `ownership-economics.ts` | `computeOwnershipEconomics`, `estimateMarketValue`, `correctedKWhPer100Mi` |
| `vehicle-valuation.ts` | MSRP estimation, depreciation, condition bands |
| `market-intelligence.ts` | Segments, `predictZeroToSixty`, `getSegment` |
| `ev-scoring.ts` | `computeEvScore` for search sort |
| `ev-power-estimates.ts` | EV HP when test car list has no match |
| `performance-hp-estimates.ts` | Performance HP heuristics |
| `fuel-cell-detection.ts` | FCEV pattern detection |
| `data-paths.ts` | `resolveDataFile()` — works locally and on Vercel |
| `trim-label.ts` | Server-side trim cleanup |
| `search-validation.ts` | `normalizeSearchQuery()` — validates POST body |

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

| Variable | Default | Purpose |
|----------|---------|---------|
| `SITE_URL` | `APP_ORIGIN`, then Vercel's production domain | Public origin for canonical URLs, Open Graph, sitemap, robots.txt. Without one, absolute URLs are omitted rather than guessed. |
| `APP_ORIGIN` | — | Public origin for Stripe return URLs and the CORS allowlist. **Required in production.** |
| `ADDITIONAL_ORIGINS` | — | Extra browser origins allowed to call the API (comma-separated) |
| `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | — | Enable sign-in and cloud garage sync |
| `DATABASE_URL` | — | Postgres for users and garages; tables are created on first use |
| `DATABASE_SSL` | unset: TLS **without** certificate verification (warns in production) | Set `verify` in production (plus `DATABASE_CA_CERT` for a private CA); `false` for local Postgres |
| `DATABASE_POOL_MAX` / `DATABASE_CONNECT_TIMEOUT_MS` | `5` / `5000` | Per-instance pool size and connect timeout |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | — | CarInfo Pro billing |
| `VITE_API_BASE_URL` / `VITE_API_TIMEOUT_MS` | `/api` / `60000` | Client API origin and request timeout |
| `SLOW_REQUEST_MS` | `1000` | Log requests slower than this |
| `DISABLE_RATE_LIMIT` | `false` | Tests and load tests only |
| `PORT` | `5000` | `npm start` port |

The public catalog needs none of these.

### Enabling accounts

The code ships ready — sign-in, the `/account` page, and cloud garage sync all appear automatically once three keys exist:

1. **Clerk** — create a free app at [dashboard.clerk.com](https://dashboard.clerk.com), then copy the **Publishable key** (`pk_...`) and **Secret key** (`sk_...`) from API Keys.
2. **Postgres** — create a free database (Neon, Vercel Postgres, or Supabase) and copy its connection string. Tables are created automatically on first request; no migration step.
3. **Vercel** — Project → Settings → Environment Variables, add:
   - `VITE_CLERK_PUBLISHABLE_KEY` = the `pk_...` key (baked in at build time)
   - `CLERK_SECRET_KEY` = the `sk_...` key
   - `DATABASE_URL` = the Postgres connection string

   Then redeploy. For local dev, put the same three in a root `.env`.
4. **Stripe (optional, for Pro)** — add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` with a webhook pointed at `/api/billing/webhook`.

**Accounts API:** `GET /api/me/status`, `GET/PUT /api/me/garage`, `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook`.

No `.env` required for local development of the public catalog.

---

## Scripts reference

### Root

| Script | What it does |
|--------|--------------|
| `dev` | Client (:3000) and server (:5000) together |
| `build` | Server, prebuilt `cars-ready.json`, client, sitemap |
| `start` | Express serves the API and `client/dist` |
| `verify` | `lint` + `typecheck` + `test` |
| `lint` / `lint:fix` | ESLint (CI fails on any warning) |
| `format` / `format:check` | Prettier |
| `typecheck` | Server `src/` and `scripts/`, and the client |
| `test` / `test:watch` | Vitest (server `node` + client `jsdom` projects) |
| `test:e2e` | Playwright: trust path and axe accessibility sweep |
| `validate:data` | Corpus invariants over what ships (`cars-ready.json`) |
| `build:sitemap` | `sitemap.xml` + `robots.txt` for `SITE_URL` |

### Server data pipeline

| Script | What it does |
|--------|--------------|
| `build-verified-db` (`:fast` skips NHTSA) | Rebuild `cars.json` from EPA (+ NHTSA). Needs network access to EPA and NHTSA. |
| `build-horsepower` | Horsepower from EPA's Test Car List, with placeholder ratings filtered out |
| `build-enrichment` | EPA extras (GHG, PHEV modes) and NHTSA indexes |
| `build-nhtsa-backfill` | NHTSA safety backfill |
| `reconcile-fuel-types` | Re-derive fuel types from EPA's `vehicles.csv` and fix `cars.json` in place (`-- --write`) |
| `backfill-epa-variants` | Add EPA listings `cars.json` is missing (other engines, Special Purpose SUVs/minivans, next model year) without touching existing IDs, and record aspiration. `-- path/to/vehicles.csv [--dry-run]`; then run `build-enrichment -- --csv=…` and `build-runtime-db` |
| `build-runtime-db` | Enrich + normalize into `cars-ready.json` (format 2: provenance maps interned) |

## Dependencies

- **Client:** React 18, React Router 7, Zustand, Recharts (Value Matrix only), Clerk
  (lazy, app shell only), `@zxing` (VIN scanner, lazy), self-hosted `@fontsource`
  fonts. HTTP is a small typed wrapper over `fetch` (`services/http.ts`).
- **Server:** Express, helmet, express-rate-limit, compression, `pg`, Stripe,
  Clerk backend. Data scripts use `csv-parse` and `exceljs`, and `fetch` for
  downloads.
- **Tooling:** TypeScript 5.9, Vite 6, Vitest 4 (+ coverage), Playwright,
  axe-core, ESLint 9, Prettier.

## Testing

**Runner:** Vitest (root `vitest.config.ts`; server `node` and client `jsdom`
projects). **CI** (`.github/workflows/ci.yml`, Node 24): static checks (lint,
typecheck, format), unit tests with a Postgres service and coverage, build with
the bundle budget and `validate:data`, Playwright E2E, and `npm audit`.

Highlights:

| Suite | Pins |
|-------|------|
| `fuel-type-inference.test.ts` | Rules agree with EPA on every record; stale-label corrections (Cayenne, Karma, i3 REx) |
| `validate-data.ts` (CI) | IDs, enums, physics: CO₂ × MPG vs fuel, BEVs without engines, plausible horsepower |
| `energy-cost.test.ts` / `tco.test.ts` | One cost engine for dossier and calculator; natural gas and hydrogen from EPA's figure |
| `runtime-db.test.ts` | `cars-ready.json` format 2 round-trip; shared provenance frozen |
| `seo.test.ts` | Server-rendered shells, JSON-LD, escaping, real 404s |
| `billing.webhook.test.ts`, `user-store.test.ts`, `me.controller.test.ts` | Real Postgres, per-file schema |
| `carStore.test.ts`, `SearchBar.test.tsx`, `garageStore.test.ts` | Latest-wins search, suggestion cancellation, garage sync rollback |
| `e2e/accessibility.spec.ts` | Zero WCAG 2.1 A/AA axe violations on 11 pages, desktop and phone |
| `e2e/trust-flow.spec.ts` | Search → dossier → compare, provenance labels throughout |

## Client bundle

Route pages are code-split; Clerk, Recharts and the VIN scanner load only where
used. `scripts/check-bundle-size.mjs` fails CI if the critical path (entry chunk
plus modulepreloads) exceeds **95 KB gzip**; it is ~84 KB today. After a deploy,
a tab still running the previous build reloads once instead of failing on a
renamed chunk (`utils/staleBuildRecovery.ts`).

## Known limitations

| Gap | Detail |
|-----|--------|
| NHTSA safety | ~13% per-car; NHTSA tests far fewer configs than EPA |
| Horsepower | ~56% coverage; EVs estimated. The 7,547 listings restored from EPA (other engines, Special Purpose SUVs/minivans) have none until `build-horsepower` is re-run against EPA's test-car files, which are keyed by EPA ID. Its matcher compares displacement and cylinders, not aspiration, so a turbo engine could take the non-turbo rating (the 2005 Legacy GT had the 2.5i's 168 hp); `dropInductionMismatchedHorsepower` drops those 118 ratings at build time, and the matcher should compare aspiration when re-run. 31 placeholder ratings (999, 1, 11 hp…) were dropped. |
| Dimensions / weight / torque / real 0–60 | Not in EPA bulk data; 0–60 is predicted |
| Market value | Calibrated against Canadian MSRPs and listing averages (`valuation-calibration.test.ts`, 58 references across compact cars and SUVs, minivans, luxury, performance, pickups, plug-in hybrids and EVs, all within 25%). Size class is a coarse price signal; trims are distinguished only where the engine gives them away (Mustang GT, Camaro ZL1, Challenger Hellcat, Civic Type R); exotic values are marque-level guesses labelled low confidence. Collector cars (`utils/collector-cars.ts`: first-gen NSX, MkIV Supra, air-cooled 911, Viper, Ford GT, 20-year-old Ferraris and Lamborghinis, hypercars…) are deliberately not valued. |
| Hydrogen and natural gas fuel cost | EPA's own annual figure, converted to CAD; the calculator's price inputs do not apply |
| Rate limits | In-memory per instance; on serverless each instance counts separately |
| CSP | Baseline only (`base-uri`, `object-src`, `frame-ancestors`); `script-src` would need the Clerk Frontend API host allowlisted |
| Photos | Body-type illustrations only (documented on `/methodology`) |
| `server/data/raw/` | Gitignored; the data pipeline needs network access to EPA and NHTSA |

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
- [ ] `script-src` CSP with the deployment's Clerk host
- [ ] Shared rate-limit store if abuse appears on serverless

## Git & deployment notes

CI runs on pushes to `main`, on pull requests, and on manual dispatch.

---

## License

ISC
