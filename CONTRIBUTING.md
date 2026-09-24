# Contributing

Setup, scripts and architecture are in the [README](README.md#quick-start). A
few conventions matter more than style:

**Provenance is the product.** Every figure on the site says where it came
from: EPA, NHTSA, curated, or estimated. A model estimate is never shown as a
verified value, and a missing value is shown as missing rather than filled with
a plausible default. Tests and `npm run validate:data` enforce much of this;
reviewers enforce the rest.

**Fix data at its source.** `server/data/cars.json` is generated. Change the
pipeline scripts in `server/scripts/` (or add a reconcile script, like
`reconcile-fuel-types.ts`, when a full rebuild needs network access you do not
have), then run `npm run build-runtime-db` and `npm run validate:data`. When
you find a new class of bad data, add an invariant to `validate-data.ts` so it
cannot come back.

**One implementation per rule.** Cost math lives in
`server/src/shared/energy-cost.ts` and is shared with the client; the client
never carries its own copy of a server calculation.

**Tests pin regressions.** A bug fix comes with a test that fails without it.

**Dependencies.** npm 10.9's resolver can crash with "Cannot read properties
of null (reading 'edgesOut')" when resolving the lockfile from scratch (e.g.
`npm audit fix`). Edit `package.json` and run a plain `npm install`, which
updates the existing lockfile incrementally; pin transitive fixes in the root
`overrides`.
