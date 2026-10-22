import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCarStore } from '../stores/carStore';
import * as api from '../services/api';
import FilterPills from './FilterPills';
import { ExpandableSection } from './ui';
import type { CarFilter, SearchQuery } from '../types/car.types';
import {
  PRICE_BUCKETS,
  YEAR_BUCKETS,
  MPG_BUCKETS,
  POWER_BUCKETS,
  SAFETY_BUCKETS,
  RANGE_BUCKETS,
  BODY_TYPES,
  FUEL_TYPES,
  DRIVE_TYPES,
  DRIVE_LABELS,
  TOP_MAKES,
  type BucketOption,
} from '../config/browseTaxonomy';
import { isFcwStandard } from '../utils/searchParams';
import {
  bucketMatches,
  countActiveFilterFields,
  filterFieldHasValue,
  sortForFilters,
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

/** A yes-or-no filter with a line saying what it rests on. */
function CheckRow({
  checked,
  onChange,
  label,
  note,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  note: string;
}) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent cursor-pointer"
      />
      <span className="min-w-0">
        <span className="block text-[13px] text-zinc-200 group-hover:text-white">{label}</span>
        <span className="block text-xs text-zinc-500 leading-snug mt-0.5">{note}</span>
      </span>
    </label>
  );
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
    'w-full bg-black border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400 transition-colors';

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
 * Every filter a shopper reaches for, in plain words: the type, make, year
 * and fuel, EPA's fuel use, the drive, then the records (NHTSA's crash tests
 * and safety features, Transport Canada's recalls, Équité's most-stolen
 * list), seats and gearbox. Power and the estimated value are under More.
 * Shown beside the results on a wide screen and in a full-screen sheet on a
 * phone (FilterSheet).
 *
 * Country of origin, engine size and the lifestyle shortcuts are gone from
 * the panel: a brand's country is not where the car was built, litres say
 * little to most buyers, and the shortcuts were price bands on an estimate.
 * Links that carry them still work, and their chips can be removed.
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
        const rated = stats.coverage?.nhtsaSafety;
        if (
          typeof rated === 'number' &&
          typeof stats.totalCars === 'number' &&
          stats.totalCars > 0
        ) {
          setRatedShare(rated / stats.totalCars);
        }
      })
      .catch(() => setRatedShare(null));
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

  const toggleNoRecalls = () => {
    const next = { ...filters };
    if (filters.noRecalls) delete next.noRecalls;
    else next.noRecalls = true;
    commitFilters(next);
  };

  // Off the list only: "on the most-stolen list" is a search ("most stolen suv").
  const toggleNotStolen = () => {
    const next = { ...filters };
    if (filters.theftListed === false) delete next.theftListed;
    else next.theftListed = false;
    commitFilters(next);
  };

  const toggleCollisionWarning = () => {
    const next = { ...filters };
    if (isFcwStandard(filters)) delete next.safetyTech;
    else next.safetyTech = { features: ['fcw'], standard: true };
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
        <SectionLabel>Type</SectionLabel>
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
          className="w-full bg-black border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-400 mb-3"
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
        <SectionLabel>Fuel</SectionLabel>
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
        <SectionLabel>Fuel use</SectionLabel>
        {/* Electric is under Fuel: "100+ MPGe" said the same in jargon. */}
        {bucketPills(
          MPG_BUCKETS.filter((b) => b.id !== 'mpg-100'),
          'fuelEconomy',
        )}
        <p className="text-xs text-zinc-500 mt-2">EPA&apos;s combined rating.</p>
      </div>

      {electricOnly && (
        <div>
          <SectionLabel>Range on a charge</SectionLabel>
          {bucketPills(RANGE_BUCKETS, 'rangeMiles')}
          <p className="text-xs text-zinc-500 mt-2">EPA&apos;s rating, new.</p>
        </div>
      )}

      <div>
        <SectionLabel>Drive</SectionLabel>
        <FilterPills
          options={DRIVE_TYPES.map((d) => ({ id: d, label: DRIVE_LABELS[d] }))}
          activeIds={filters.driveType ?? []}
          onToggle={(id) => toggleArrayFilter('driveType', id)}
          compact
        />
      </div>

      <div>
        <SectionLabel>Safety and records</SectionLabel>
        <p className="text-xs text-zinc-400 mb-2">Crash-test stars</p>
        {bucketPills(SAFETY_BUCKETS, 'safety')}
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
          NHTSA&apos;s overall rating.{' '}
          {ratedShare != null
            ? `It has crash-tested ${Math.round(ratedShare * 100)}% of the versions on file, mostly from 2011 on. `
            : ''}
          A car it hasn&apos;t rated is left out here, not judged unsafe.
        </p>
        <div className="mt-3 border-t border-zinc-900 pt-1">
          <CheckRow
            checked={isFcwStandard(filters)}
            onChange={toggleCollisionWarning}
            label="Collision warning standard"
            note="Standard on the car, not an option, as NHTSA lists it."
          />
          <CheckRow
            checked={filters.noRecalls === true}
            onChange={toggleNoRecalls}
            label="No recalls in Canada"
            note="None for its model year, as Transport Canada lists them. Newer cars have had less time to be recalled."
          />
          <CheckRow
            checked={filters.theftListed === false}
            onChange={toggleNotStolen}
            label="Not on the most-stolen list"
            note="Leaves out the 10 models Équité Association counted as most stolen in Canada in 2024."
          />
        </div>
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

      <div className="pt-5 border-t border-zinc-800">
        <ExpandableSection
          title="More filters"
          summary="Power, estimated value"
          defaultOpen={
            filterFieldHasValue(filters.horsepower) || filterFieldHasValue(filters.price)
          }
        >
          <div className="space-y-6">
            <div>
              <SectionLabel>Power</SectionLabel>
              {bucketPills(POWER_BUCKETS, 'horsepower')}
            </div>

            <div>
              <SectionLabel>Estimated value (CAD)</SectionLabel>
              {bucketPills(PRICE_BUCKETS, 'price')}
              <p className="text-xs text-zinc-500 mt-2 mb-3">
                Our model&apos;s estimate, not an asking price: a car can sell for more or less.
              </p>
              <RangeInputs
                label="estimated value"
                value={filters.price}
                step={1000}
                onCommit={(range) => commitFilters({ ...filters, price: range })}
              />
            </div>
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
}
