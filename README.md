# CarInfo

A full-stack car discovery and comparison platform powered by **EPA FuelEconomy.gov data** (~28,000 vehicles, 1995–2026), with optional NHTSA safety enrichment and clearly labeled **estimated** market analytics.

## What you get

| Data | Source | In UI |
|------|--------|-------|
| MPG/MPGe, engine, drive, transmission, CO₂, annual fuel cost, EV range | EPA FuelEconomy.gov | Verified |
| Rated horsepower | EPA Test Car List (when enriched) | Verified |
| Safety star ratings | NHTSA (when enriched) | Verified |
| Market value, cost/mile, TCO, percentiles, deal scores | Depreciation / heuristics | **Est.** |

Horsepower is **not** in the EPA FuelEconomy.gov bulk dataset, so it is matched per engine
from the official **EPA Test Car List** (a separate public dataset) — see
[Horsepower enrichment](#horsepower-enrichment). 0–60, dimensions, and listing photos are
still **not** available from these sources — we omit them rather than invent values.

## Build the database

```bash
npm install

# EPA only (~30s) — writes server/data/cars.json
npm run build-verified-db:fast --workspace=server

# EPA + NHTSA safety enrichment (slow, cached in server/data/raw/)
npm run build-verified-db --workspace=server
```

The build script resolves `server/data/` relative to the script path (works from repo root or `server/` workspace).

Flags: `--skip-nhtsa`, `--nhtsa-from=2011`, `--limit=N`

### Horsepower enrichment

`cars.json` carries no horsepower (the EPA FuelEconomy.gov bulk file doesn't include it).
`scripts/build-horsepower-enrichment.ts` fills it from the official, free **EPA Test Car List
Data** (the `Rated Horsepower` / `VC_RTD_HP_MSR` column), matched to each vehicle by make +
engine (displacement & cylinders) + carline. This is verified government data — chosen over
scraping Edmunds/Car and Driver, which would violate their ToS and break on every site change.

```bash
# Downloads per-year EPA test-car files to server/data/raw/test-car-data/ (cached/gitignored)
# and writes server/data/horsepower-enrichment.json (keyed by epaId).
npm run build-horsepower --workspace=server

# Useful flags:
#   --from=2010 --to=2026   limit model years
#   --offline               reuse already-downloaded files (no network)
#   --refresh               re-download cached files
```

The result is merged into records at load time by `services/content-enrichment.ts`
(`provenance: 'epa'`), alongside `epa-enrichment.json` and `nhtsa-safety.json`. Coverage is
~71% of all vehicles (≈80%+ for 2010+); electric vehicles have no rated-HP figure in this
dataset, and turbo/NA trims the EPA lumps under one carline+displacement resolve to a central
value. Re-run after rebuilding `cars.json`.

## Run

```bash
npm run dev        # client :3000, server :5000 (Vite proxies /api)
npm run build      # client + server
npm run start      # Express serves API + built SPA
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/cars/makes` | All makes |
| GET | `/api/cars/makes/:make/models` | Models for a make |
| POST | `/api/cars/search` | Filtered search (max 500/request) |
| GET | `/api/cars/stats/chart-points` | Scatter plot points (server-side sample) |
| GET | `/api/cars/:id` | Single vehicle |
| GET | `/api/cars/:id/dashboard` | Vehicle + analytics + provenance |
| POST | `/api/cars/compare` | Batch lookup (max 5) |
| GET | `/api/cars/stats/overview` | Database stats |

## User flows

- **Landing** → persona quiz, curated collections, browse by type/make/purpose/era
- **Search** (`/home`) → filters, sort, compare, open dossier
- **Car detail** → glance metrics + expandable EPA specs, safety, market position, TCO
- **Compare / Garage / Battle / Value matrix** → shortlist, share, head-to-head, scatter plot

## Tech stack

React 18 + TypeScript + Vite + Tailwind + Zustand · Express + TypeScript · Vercel serverless (`api/`) · static JSON DB

## License

ISC
