import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCarStore } from '../stores/carStore';
import * as api from '../services/api';
import FilterPills from './FilterPills';
import { ExpandableSection } from './ui';
import type { CarFilter, SearchQuery } from '../types/car.types';
import {
  LIFESTYLE_PRESETS,
  PRICE_BUCKETS,
  YEAR_BUCKETS,
  MPG_BUCKETS,
  POWER_BUCKETS,
  SAFETY_BUCKETS,
  RANGE_BUCKETS,
  BODY_TYPES,
  FUEL_TYPES,
  DRIVE_TYPES,
  TOP_MAKES,
  matchingLifestylePreset,
  type BucketOption,
} from '../config/browseTaxonomy';
import {
  bucketMatches,
  countActiveFilterFields,
  mergeFilterFields,
  sortForFilters,
  stripFilterFields,
  toggleRangeBucket,
} from '../utils/filterState';

type RangeKey = 'price' | 'year' | 'fuelEconomy' | 'horsepower' | 'safety' | 'rangeMiles';

const GEARBOXES = [
  { id: 'automatic', label: 'Automatic' },
  { id: 'manual', label: 'Manual' },
  { id: 'cvt', label: 'CVT' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs text-zinc-300 mb-3 font-bold">{children}</h3>;
}

function RangeInputs({
  value,
  onCommit,
  step = 1,
  label,
}: {
  value?: { min?: number; max?: number };
  onCommit: (range: { min?: number; max?: number } | undefined) => void;
  step?: number;
  /** Names the inputs for screen readers: "Minimum estimated value". */
  label: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const inputClass =
    'w-full bg-black border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors';

  const commitDraft = () => {
    const min = draft?.min;
    const max = draft?.max;
    if (min == null && max == null) {
      onCommit(undefined);
      return;
    }
    onCommit({ min, max });
  };

  const updateDraft = (side: 'min' | 'max', raw: string) => {
    const parsed = raw ? parseFloat(raw) : undefined;
    setDraft((prev) => {
      const next = { ...prev, [side]: parsed };
      if (next.min == null && next.max == null) return undefined;
      return next;
    });
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        placeholder="Min"
        aria-label={`Minimum ${label}`}
        className={inputClass}
        value={draft?.min ?? ''}
        onChange={(e) => updateDraft('min', e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <input
        type="number"
        inputMode="decimal"
        step={step}
        placeholder="Max"
        aria-label={`Maximum ${label}`}
        className={inputClass}
        value={draft?.max ?? ''}
        onChange={(e) => updateDraft('max', e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
}

/**
 * Every filter the search offers, the records first: body, make, year,
 * powertrain, EPA fuel use and range, NHTSA stars, power, drive, seats and
 * gearbox, then the estimated value, then the rest. Shown beside the results
 * on a wide screen and in a full-screen sheet on a phone (FilterSheet).
 *
 * It used to open with presets and the estimated budget and keep Make under
 * "More filters", with no way to ask for crash ratings, power, a third row or
 * a manual gearbox, all of which the search API reads.
 */
export default function FilterSidebar({
  onFiltersApplied,
  variant = 'sidebar',
}: {
  /** After a change; `text` when the search words changed too (a preset's "third row"). */
  onFiltersApplied?: (text?: string) => void;
  /** `sheet`: no card or heading of its own; the sheet has both. */
  variant?: 'sidebar' | 'sheet';
}) {
  const { searchQuery, setSearchQuery, performSearch, availableMakes, loadMakes } = useCarStore();
  const [filters, setFilters] = useState<CarFilter>(searchQuery.filters || {});
  const [countries, setCountries] = useState<string[]>([]);
  const [makeSearch, setMakeSearch] = useState('');
  const [ratedShare, setRatedShare] = useState<number | null>(null);

  useEffect(() => {
    setFilters(searchQuery.filters || {});
  }, [searchQuery.filters]);

  useEffect(() => {
    loadMakes();
    api
      .getStatistics()
      .then((stats) => {
        if (Array.isArray(stats.countries) && stats.countries.length > 0) {
          setCountries(stats.countries);
        }
        if (stats.totalCars > 0 && stats.coverage) {
          setRatedShare(stats.coverage.nhtsaSafety / stats.totalCars);
        }
      })
      .catch(() => {
        setCountries(['USA', 'Japan', 'Germany', 'Italy', 'South Korea', 'UK', 'Sweden']);
      });
  }, [loadMakes]);

  const commitFilters = useCallback(
    (next: CarFilter, sortOverride?: SearchQuery['sort'], text?: string) => {
      setFilters(next);
      const query = text !== undefined ? text || undefined : searchQuery.query;
      const sort = sortOverride ?? sortForFilters(next, query, searchQuery.sort);
      setSearchQuery({ ...searchQuery, query, filters: next, offset: 0, sort });
      performSearch();
      onFiltersApplied?.(text);
    },
    [onFiltersApplied, performSearch, searchQuery, setSearchQuery],
  );

  const activeLifestyle = matchingLifestylePreset(filters, searchQuery.query);

  const activeBucket = useCallback(
    (buckets: BucketOption[], key: RangeKey) =>
      buckets.find((b) => bucketMatches(filters[key], b.filters[key]))?.id ?? null,
    [filters],
  );

  const toggleBucket = (buckets: BucketOption[], key: RangeKey, id: string) => {
    const bucket = buckets.find((b) => b.id === id);
    if (!bucket) return;
    commitFilters(
      toggleRangeBucket(filters, key, bucket.filters[key], activeBucket(buckets, key), id),
    );
  };

  const toggleLifestyle = (id: string) => {
    const preset = LIFESTYLE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    // A preset's words ("third row", "sports car") replace the search words.
    if (activeLifestyle === id) {
      commitFilters(
        stripFilterFields(filters, preset.filters),
        { field: 'year', order: 'desc' },
        preset.query ? '' : undefined,
      );
    } else {
      commitFilters(mergeFilterFields(filters, preset.filters), preset.sort, preset.query);
    }
  };

  const toggleArrayFilter = (key: keyof CarFilter, value: string) => {
    const current = (filters[key] as string[] | undefined) || [];
    const nextArr = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const next = { ...filters, [key]: nextArr.length ? nextArr : undefined };
    commitFilters(next);
  };

  const toggleThreeRow = () => {
    const next = { ...filters };
    if (filters.threeRow === true) delete next.threeRow;
    else next.threeRow = true;
    commitFilters(next);
  };

  const clearFilters = () => {
    commitFilters({}, { field: 'year', order: 'desc' });
    setMakeSearch('');
  };

  const selectedMakes = useMemo(() => filters.make ?? [], [filters.make]);
  // Typing narrows every make on file; otherwise the best-known makes, one tap each.
  const makeOptions = useMemo(() => {
    const pool = makeSearch
      ? availableMakes.filter((m) => m.toLowerCase().includes(makeSearch.toLowerCase()))
      : TOP_MAKES.filter((m) => availableMakes.length === 0 || availableMakes.includes(m));
    return [...new Set([...selectedMakes, ...pool])].slice(0, makeSearch ? 30 : 20);
  }, [availableMakes, makeSearch, selectedMakes]);

  const activeFilterCount = countActiveFilterFields(filters);
  const electricOnly = filters.fuelType?.includes('electric');

  const bucketPills = (buckets: BucketOption[], key: RangeKey) => (
    <FilterPills
      options={buckets.map((b) => ({ id: b.id, label: b.label, description: b.description }))}
      activeIds={[activeBucket(buckets, key)].filter((id): id is string => id != null)}
      onToggle={(id) => toggleBucket(buckets, key, id)}
      compact
    />
  );

  const isSheet = variant === 'sheet';

  return (
    <div
      className={
        isSheet
          ? 'space-y-7'
          : 'surface-card p-5 space-y-7 lg:max-h-[calc(100vh-var(--header-height)-2rem)] lg:overflow-y-auto rounded-none'
      }
    >
      {!isSheet && (
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h2 className="text-base font-bold tracking-tight text-white">
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
          </h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-zinc-400 hover:text-white min-h-[32px]"
            >
              Clear all
            </button>
          )}
        </div>
      )}
      {isSheet && activeFilterCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} on
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-zinc-300 hover:text-white underline underline-offset-4 min-h-[40px]"
          >
            Clear all
          </button>
        </div>
      )}

      <div>
        <SectionLabel>Vehicle type</SectionLabel>
        <FilterPills
          // No counts: the whole catalogue's ("SUV (10,508)") misled beside a
          // search of 49, and the sheet's button counts the results as they change.
          options={BODY_TYPES.map((t) => ({
            id: t.id,
            label: t.label,
            description: t.description,
          }))}
          activeIds={filters.bodyStyle ?? []}
          onToggle={(id) => toggleArrayFilter('bodyStyle', id)}
        />
      </div>

      <div>
        <SectionLabel>Make</SectionLabel>
        <input
          type="search"
          placeholder="Find a make…"
          aria-label="Find a make"
          value={makeSearch}
          onChange={(e) => setMakeSearch(e.target.value)}
          className="w-full bg-black border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 mb-3"
        />
        {makeOptions.length > 0 ? (
          <FilterPills
            options={makeOptions.map((m) => ({ id: m, label: m }))}
            activeIds={selectedMakes}
            onToggle={(id) => toggleArrayFilter('make', id)}
            compact
          />
        ) : (
          <p className="text-xs text-zinc-500">No make on file matches “{makeSearch}”.</p>
        )}
      </div>

      <div>
        <SectionLabel>Model year</SectionLabel>
        {bucketPills(YEAR_BUCKETS, 'year')}
      </div>

      <div>
        <SectionLabel>Powertrain</SectionLabel>
        <FilterPills
          options={FUEL_TYPES.map((t) => ({
            id: t.id,
            label: t.label,
            description: t.description,
          }))}
          activeIds={filters.fuelType ?? []}
          onToggle={(id) => toggleArrayFilter('fuelType', id)}
          compact
        />
      </div>

      <div>
        <SectionLabel>Fuel use (EPA)</SectionLabel>
        {bucketPills(MPG_BUCKETS, 'fuelEconomy')}
      </div>

      {electricOnly && (
        <div>
          <SectionLabel>EPA range</SectionLabel>
          {bucketPills(RANGE_BUCKETS, 'rangeMiles')}
        </div>
      )}

      <div>
        <SectionLabel>Safety (NHTSA)</SectionLabel>
        {bucketPills(SAFETY_BUCKETS, 'safety')}
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
          {ratedShare != null
            ? `NHTSA has crash-tested ${Math.round(ratedShare * 100)}% of the versions on file, mostly from 2011 on. `
            : ''}
          A car it hasn&apos;t rated is left out here, not judged unsafe.
        </p>
      </div>

      <div>
        <SectionLabel>Power</SectionLabel>
        {bucketPills(POWER_BUCKETS, 'horsepower')}
      </div>

      <div>
        <SectionLabel>Drive</SectionLabel>
        <FilterPills
          options={DRIVE_TYPES.map((d) => ({ id: d, label: d }))}
          activeIds={filters.driveType ?? []}
          onToggle={(id) => toggleArrayFilter('driveType', id)}
          compact
        />
      </div>

      <div>
        <SectionLabel>Seats and gearbox</SectionLabel>
        <FilterPills
          options={[
            { id: 'three-row', label: 'Three rows', description: 'Minivans and three-row SUVs' },
            ...GEARBOXES,
          ]}
          activeIds={[
            ...(filters.threeRow === true ? ['three-row'] : []),
            ...(filters.transmission ?? []),
          ]}
          onToggle={(id) =>
            id === 'three-row' ? toggleThreeRow() : toggleArrayFilter('transmission', id)
          }
          compact
        />
      </div>

      <div>
        <SectionLabel>Estimated value (CAD)</SectionLabel>
        {bucketPills(PRICE_BUCKETS, 'price')}
        <p className="text-xs text-zinc-500 mt-2 mb-3">
          Our model&apos;s estimate, not an asking price.
        </p>
        <RangeInputs
          label="estimated value"
          value={filters.price}
          step={1000}
          onCommit={(range) => commitFilters({ ...filters, price: range })}
        />
      </div>

      <div className="pt-5 border-t border-zinc-800">
        <ExpandableSection title="More filters" summary="Origin, engine size, shortcuts">
          <div className="space-y-6">
            <div>
              <SectionLabel>Country of origin</SectionLabel>
              <FilterPills
                options={countries.map((c) => ({ id: c, label: c }))}
                activeIds={filters.countryOfOrigin ?? []}
                onToggle={(id) => toggleArrayFilter('countryOfOrigin', id)}
                compact
              />
            </div>

            <div>
              <SectionLabel>Engine size (L)</SectionLabel>
              <RangeInputs
                label="engine size in litres"
                value={filters.displacement}
                step={0.5}
                onCommit={(range) => commitFilters({ ...filters, displacement: range })}
              />
              <p className="text-xs text-zinc-400 mt-2">Excludes EVs</p>
            </div>

            <div>
              <SectionLabel>Shortcuts</SectionLabel>
              <FilterPills
                options={LIFESTYLE_PRESETS.map((p) => ({
                  id: p.id,
                  label: p.label,
                  description: p.description,
                }))}
                activeIds={activeLifestyle ? [activeLifestyle] : []}
                onToggle={toggleLifestyle}
                compact
              />
            </div>
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
}
