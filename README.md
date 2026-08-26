# CarInfo

A full-stack car discovery and comparison platform. **Specs-first** — EPA fuel economy, engine, emissions, and safety (when available) — with clearly labeled **estimated** market value, running cost, and TCO analytics.

- **~28,278 vehicles** (1995–2026) across **90 makes**
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

```bash
npm install
npm run dev          # client :3000, server :5000 (Vite proxies /api)
```

Production:

```bash
npm run build        # client + server
npm run start        # Express serves API + built SPA
```

Fresh clone with no `server/data/raw/` cache? Run the [database build](#build-the-database) first.

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
| Total vehicles | 28,278 |
| Year range | 1995–2026 |
| Makes | 90 |
| EPA enrichment records | 28,278 |
| Horsepower enrichment keys | 20,074 (~71%) |
| NHTSA combo ratings | 1,025 `make\|model\|year` |
| NHTSA per-car index | 3,753 (13.3%) |
| NHTSA cache lookups attempted | 13,842 |

### Body style breakdown

| Body style | Count |
|------------|-------|
| sedan | 13,603 |
| suv | 7,898 |
| truck | 2,503 |
| coupe | 1,870 |
| wagon | 1,506 |
| van | 522 |
| minivan | 376 |

### Fuel types

**In raw `cars.json`:** gasoline 24,469 · diesel 278 · hybrid 1,687 · electric 1,844

PHEV and hydrogen are **not stored** in raw JSON — reclassified at runtime via `fuel-type-inference.ts` and `car-normalize.ts`.

### Field coverage in raw `cars.json`

| Field | Records |
|-------|---------|
| trim | 28,278 |
| engine.configuration | 26,826 |
| transmission.speeds | 15,178 |
| countryOfOrigin | 25,570 |
| epa.co2 | 14,818 |
| epa.charge240Hours | 1,824 |
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
| `server/data/manual-prices.json` | — | Referenced in build script | **Does not exist** |

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

**FuelType:** `gasoline` · `diesel` · `electric` · `hybrid` · `plug-in hybrid` · `hydrogen`

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
- Maps EPA `VClass` → bodyStyle (sedan, suv, truck, wagon, minivan, van, coupe)
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

Reality: NHTSA tests ~1,025 make/model/year combos vs 28k EPA configs. Fuzzy matching gets ~13% per-car coverage.

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

**Client pagination:** `searchAllCars()` in `api.ts` pages at 500, cap 3000.

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
5. **Compare** → up to 5 cars; loads full `CarDashboard` per vehicle (provenance + confidence)
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
- **Popular searches:** 2024 Camry, Honda Civic, Ford F-150, Toyota RAV4

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

### `HeroDossierPreview.tsx`

Live dossier card with glance metrics (filters unavailable), fuel bar, link to `/car/:id`

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

On load, fetches a full `CarDashboard` per compared car (same depth as the dossier). Uses `fieldProvenance`, `ownership.marketValue.confidenceLabel`, and per-field `ProvenanceChip` on analytics rows.

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

- Loads up to 3,000 cars via `searchAllCars()`
- Client-side fuel type filter + persona defaults
- `getDealRating()` always null (UI may still reference deal badges elsewhere)
- `AggregateStats` bar, infinite scroll (50 per page)

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

- `carStore.comparedCars` — max 5, memory only (not persisted)

---

## Spec glossary

**File:** `client/src/utils/specGlossary.ts`

Click `?` via `SpecExplain.tsx` · body via `SpecTipBody.tsx` (what + why)

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

### Outputs (all CAD, Ontario baseline)

- **Market value** — low/high/mid, confidence, condition bands, battery health (EV), retention tier
- **Annual cost** — energy, insurance, maintenance, tires, registration, total range
- **Resale** — 5-year projected resale, estimated loss
- **TCO** — 5-year or operating-only mode
- **Derived** — fuel cost/mile, effective cost/mile

### Regional assumptions include

Insurance by body style + luxury multipliers · maintenance by fuel type + age · tire costs · registration · energy prices (gas, diesel, electricity, hydrogen note) · depreciation tiers A/B/C · CAD FX from USD EPA fuel costs

### Disabled

`getDealRating()` → `null` on both client and server

### 0–60 prediction

`predictZeroToSixty()` — server `market-intelligence.ts` + client mirror; method `predicted` with confidence string

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
**HeroDossierPreview:** filters metrics matching unavailable patterns

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

`Landing.tsx` · `Browse.tsx` · `Explore.tsx` · `VehicleGrid.tsx` · `CarDetail.tsx` · `Home.tsx` · `Compare.tsx` · `Collection.tsx` · `SmartSearch.tsx` · `DreamGarage.tsx` · `SharedGarage.tsx` · `BattleMode.tsx` · `ValueMatrix.tsx` · `VinDecoder.tsx`

### Client — components (30)

`AboutData` · `AggregateStats` · `BodyTypeIllustration` · `CarCard` · `DataValue` · `FilterPills` · `FilterSidebar` · `GlanceMetricCell` · `GlanceRow` · `HeroDossierPreview` · `KeySpecs` · `Layout` · `PageHeader` · `PersonaQuiz` · `ProvenanceChip` · `ScrollToTop` · `SearchBar` · `SimilarCars` · `SiteHeader` · `SpecExplain` · `SpecTipBody` · `TCOCalculator` · `ui` · `ValuationLinks` · `VehiclePlaceholder`

### Client — utils (18)

`carImages` · `collectionCuration` · `currency` · `dataValue` · `epaContent` · `filterState` · `fuelDisplay` · `fuelEconomyUnits` · `fuelLabels` · `glanceMetrics` · `landingShowcase` · `marketIntelligence` · `searchParams` · `specGlossary` · `trimLabel`

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
| `generate-massive-database.ts` | **Deprecated** |
| `generate-portfolio-database.ts` | **Deprecated** |
| `generate-comprehensive-database.cjs` | **Deprecated** |
| `fetch-nhtsa-real-data.ts` | **Deprecated** |

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
| `marketIntelligence.ts` | `calculateCostPerMile`, `calculateReliabilityScore`, `getSegment`, `getDealRating` (null), `predictZeroToSixty`, `calculateAggregateStats`, `filterCarsByFuelType`, `estimatePrice`, `generateMatchReasons` |
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

```json
{
  "buildCommand": "npm run build --workspace=server && npm run build --workspace=client",
  "outputDirectory": "client/dist",
  "routes": [
    { "src": "/api(?:/(.*))?", "dest": "/api/index" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "functions": {
    "api/index.ts": {
      "includeFiles": "server/data/**",
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5000` | Server port |
| `VITE_API_BASE_URL` | `/api` | Client API base URL |
| `VITE_CLERK_PUBLISHABLE_KEY` | — | Clerk publishable key (enables Sign in UI) |
| `CLERK_SECRET_KEY` | — | Clerk secret (verifies session JWTs on `/api/me/*`) |
| `DATABASE_URL` | — | Postgres connection string for users + garage_items |
| `DATABASE_SSL` | (on) | Set `false` for local Postgres without SSL |
| `STRIPE_SECRET_KEY` | — | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | — | Recurring Price ID for CarInfo Pro |
| `APP_ORIGIN` | request host | Public origin for Checkout / portal return URLs |

See [`.env.example`](.env.example). Core browse/dossier works without these; account sync and billing need Clerk + Postgres (+ Stripe for Pro).

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

| Script | Command |
|--------|---------|
| `dev` | concurrently client + server |
| `dev:client` | vite |
| `dev:server` | tsx watch |
| `build` | client build + server build |
| `start` | node server dist |
| `test` | vitest run (server + client unit tests) |
| `test:watch` | vitest watch |
| `test:e2e` | playwright test |

### npm scripts — server

| Script | Command |
|--------|---------|
| `build-verified-db` | EPA + NHTSA build |
| `build-verified-db:fast` | EPA only |
| `build-horsepower` | Test car list HP |
| `build-enrichment` | EPA extras + NHTSA indexes |
| `build-nhtsa-backfill` | NHTSA API backfill |
| `fetch-nhtsa` | deprecated fetch |
| `generate-db` | deprecated synthetic |

### npm scripts — client

| Script | Command |
|--------|---------|
| `dev` | vite |
| `build` | tsc && vite build |
| `preview` | vite preview |

---

## Dependencies

### Root

`express`, `cors`, `dotenv`, `concurrently`

### Dev (root)

`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`

### Client

`react`, `react-dom`, `react-router-dom`, `axios`, `zustand`, `recharts`

### Server

`express`, `cors`, `dotenv`, `axios`, `csv-parse`, `xlsx`, `tsx`, `typescript`

**Not included:** ESLint, Prettier, Docker

---

## Testing

**Runner:** Vitest (root `vitest.config.ts`, server `node` + client `jsdom` projects)

**CI:** `.github/workflows/ci.yml` runs `npm run build`, `npm test`, and Playwright E2E smoke.

### Characterization tests (server)

| Suite | Pins |
|-------|------|
| `fuel-type-inference.test.ts` | **419** raw `electric` → `plug-in hybrid`; Cayenne transition; Tesla stays BEV |
| `car-normalize.test.ts` | PHEV correction + `engine.fuelType: 'estimated'` provenance |
| `vehicle-valuation.test.ts` | Ontario/CAD bands (Corolla, RAV4, Macan, Cayenne, Camry XSE, Model 3); **0** degenerate resale |
| `content-enrichment.test.ts` | EV MPGe correction; curated HP; no fabrication |
| `vehicle-taxonomy.test.ts` | Segment rules; Golf hatchback correction |
| `search-validation.test.ts` | Malformed POST bodies dropped safely |
| `car.service.search.test.ts` | Full DB load; make/PHEV filters |

### Client unit tests

| Suite | Covers |
|-------|--------|
| `glanceMetrics.test.ts` | Dossier omit-when-empty |
| `KeySpecs.test.tsx` | No "Not on file" rows when data absent |
| `DataTrustPanel.test.tsx` | Provenance panel + filters |
| `Compare.test.tsx` | Dashboard provenance rendering |
| `Methodology.test.tsx` | Methodology page trust copy |

### E2E

`e2e/trust-flow.spec.ts`: search → dossier (`DataTrustPanel`) → compare (provenance chips).

---

## Client bundle

Production build code-splits route pages and isolates Recharts to the Value Matrix chunk.

| Asset (approx.) | Size |
|-----------------|------|
| Main `index-*.js` | ~286 KB (~95 KB gzip) |
| `ValueMatrix-*.js` (Recharts) | ~400 KB (on demand) |

Landing stays eager; other layout routes lazy-load via `React.lazy`.

---

## Known limitations

| Gap | Detail |
|-----|--------|
| NHTSA safety | ~13% per-car; NHTSA tests far fewer configs than EPA |
| Horsepower | ~71%; EVs estimated; shared carlines share HP |
| Dimensions / weight | 0 records — not in EPA bulk |
| Torque / real 0–60 | Not in EPA — predicted only on dossier |
| Photos | Body-type illustrations only (documented on `/methodology`) |
| PHEV in raw JSON | Runtime reclassification required (419 records; pinned by test) |
| Hydrogen fuel cost | Not modeled (price varies too widely) |
| `manual-prices.json` | Referenced but missing |
| `server/data/raw/` | Gitignored — rebuild needed on fresh clone |
| Vercel cold start | Full 28k JSON loaded into memory on first request (sharding deferred) |
| Deal rating | Disabled (`getDealRating` returns null); UI removed |

---

## Outstanding work

### Data

- [ ] Run full NHTSA backfill without limit → `build-enrichment`
- [ ] Add or remove `manual-prices.json` reference
- [ ] New source for dimensions/weight/torque
- [ ] IIHS or other safety sources (not started)
- [ ] **Deferred (hard stop):** shard `cars.json` by make for Vercel cold start

### Product

- Battle Mode and Value Matrix surface EPA vs estimated provenance on playful views (shipped).

---

## Git & deployment notes

CI runs on push/PR via GitHub Actions. Commit `nhtsa-by-car-id.json` and enrichment scripts so NHTSA per-car resolution works in production.

---

## License

ISC
