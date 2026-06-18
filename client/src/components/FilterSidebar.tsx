import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCarStore } from '../stores/carStore';
import * as api from '../services/api';
import FilterPills from './FilterPills';
import type { CarFilter, SearchQuery } from '../types/car.types';
import {
  LIFESTYLE_PRESETS,
  PRICE_BUCKETS,
  YEAR_BUCKETS,
  MPG_BUCKETS,
  BODY_TYPES,
  FUEL_TYPES,
  DRIVE_TYPES,
  matchingLifestylePreset,
} from '../config/browseTaxonomy';
import {
  bucketMatches,
  countActiveFilterFields,
  mergeFilterFields,
  sortForFilters,
  stripFilterFields,
  toggleRangeBucket,
} from '../utils/filterState';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs tracking-[0.2em] text-zinc-300 uppercase mb-3 font-bold">
      {children}
    </h3>
  );
}

function RangeInputs({
  value,
  onCommit,
  step = 1,
}: {
  value?: { min?: number; max?: number };
  onCommit: (range: { min?: number; max?: number } | undefined) => void;
  step?: number;
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
        step={step}
        placeholder="Min"
        className={inputClass}
        value={draft?.min ?? ''}
        onChange={(e) => updateDraft('min', e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <input
        type="number"
        step={step}
        placeholder="Max"
        className={inputClass}
        value={draft?.max ?? ''}
        onChange={(e) => updateDraft('max', e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
}

export default function FilterSidebar({ onFiltersApplied }: { onFiltersApplied?: () => void }) {
  const { searchQuery, setSearchQuery, performSearch, availableMakes, loadMakes } = useCarStore();
  const [filters, setFilters] = useState<CarFilter>(searchQuery.filters || {});
  const [countries, setCountries] = useState<string[]>([]);
  const [makeSearch, setMakeSearch] = useState('');
  const [facetCounts, setFacetCounts] = useState<{ bodyStyles?: Record<string, number>; fuelTypes?: Record<string, number> }>({});

  useEffect(() => {
    setFilters(searchQuery.filters || {});
  }, [searchQuery.filters]);

  useEffect(() => {
    loadMakes();
    api.getStatistics().then((stats) => {
      if (Array.isArray(stats.countries) && stats.countries.length > 0) {
        setCountries(stats.countries);
      }
      setFacetCounts({ bodyStyles: stats.bodyStyles, fuelTypes: stats.fuelTypes });
    }).catch(() => {
      setCountries(['USA', 'Japan', 'Germany', 'Italy', 'South Korea', 'UK', 'Sweden']);
    });
  }, [loadMakes]);

  const commitFilters = useCallback(
    (next: CarFilter, sortOverride?: SearchQuery['sort']) => {
      setFilters(next);
      const sort = sortOverride ?? sortForFilters(next, searchQuery.query, searchQuery.sort);
      setSearchQuery({ ...searchQuery, filters: next, offset: 0, sort });
      performSearch();
      onFiltersApplied?.();
    },
    [onFiltersApplied, performSearch, searchQuery, setSearchQuery],
  );

  const activeLifestyle = matchingLifestylePreset(filters);

  const activePriceBucket = useMemo(
    () => PRICE_BUCKETS.find((b) => bucketMatches(filters.price, b.filters.price))?.id ?? null,
    [filters.price],
  );

  const activeYearBucket = useMemo(
    () => YEAR_BUCKETS.find((b) => bucketMatches(filters.year, b.filters.year))?.id ?? null,
    [filters.year],
  );

  const activeMpgBucket = useMemo(
    () => MPG_BUCKETS.find((b) => bucketMatches(filters.fuelEconomy, b.filters.fuelEconomy))?.id ?? null,
    [filters.fuelEconomy],
  );

  const toggleLifestyle = (id: string) => {
    const preset = LIFESTYLE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (activeLifestyle === id) {
      commitFilters(stripFilterFields(filters, preset.filters), { field: 'year', order: 'desc' });
    } else {
      commitFilters(mergeFilterFields(filters, preset.filters), preset.sort);
    }
  };

  const togglePriceBucket = (id: string) => {
    const bucket = PRICE_BUCKETS.find((b) => b.id === id);
    if (!bucket) return;
    commitFilters(toggleRangeBucket(filters, 'price', bucket.filters.price, activePriceBucket, id));
  };

  const toggleYearBucket = (id: string) => {
    const bucket = YEAR_BUCKETS.find((b) => b.id === id);
    if (!bucket) return;
    commitFilters(toggleRangeBucket(filters, 'year', bucket.filters.year, activeYearBucket, id));
  };

  const toggleMpgBucket = (id: string) => {
    const bucket = MPG_BUCKETS.find((b) => b.id === id);
    if (!bucket) return;
    commitFilters(
      toggleRangeBucket(filters, 'fuelEconomy', bucket.filters.fuelEconomy, activeMpgBucket, id),
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

  const clearFilters = () => {
    commitFilters({}, { field: 'year', order: 'desc' });
    setMakeSearch('');
  };

  const filteredMakes = makeSearch
    ? availableMakes.filter((m) => m.toLowerCase().includes(makeSearch.toLowerCase()))
    : availableMakes.slice(0, 40);

  const activeFilterCount = countActiveFilterFields(filters);

  const bodyPillOptions = BODY_TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    count: facetCounts.bodyStyles?.[t.id],
  }));

  const fuelPillOptions = FUEL_TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    count: facetCounts.fuelTypes?.[t.id],
  }));

  return (
    <div className={`surface-card p-5 space-y-7 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:max-h-[calc(100vh-var(--header-height)-2rem)] lg:overflow-y-auto rounded-xl`}>
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <h2 className="text-base font-black tracking-tight text-white uppercase">
          Refine{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </h2>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[10px] tracking-[0.2em] text-zinc-400 hover:text-white uppercase"
          >
            Clear
          </button>
        )}
      </div>

      <div>
        <SectionLabel>Shop by need</SectionLabel>
        <FilterPills
          options={LIFESTYLE_PRESETS.map((p) => ({ id: p.id, label: p.label, description: p.description }))}
          activeIds={activeLifestyle ? [activeLifestyle] : []}
          onToggle={toggleLifestyle}
          compact
        />
      </div>

      <div>
        <SectionLabel>Budget</SectionLabel>
        <FilterPills
          options={PRICE_BUCKETS.map((b) => ({ id: b.id, label: b.label, description: b.description }))}
          activeIds={activePriceBucket ? [activePriceBucket] : []}
          onToggle={togglePriceBucket}
          compact
        />
      </div>

      <div>
        <SectionLabel>Model year</SectionLabel>
        <FilterPills
          options={YEAR_BUCKETS.map((b) => ({ id: b.id, label: b.label, description: b.description }))}
          activeIds={activeYearBucket ? [activeYearBucket] : []}
          onToggle={toggleYearBucket}
          compact
        />
      </div>

      <div>
        <SectionLabel>Efficiency</SectionLabel>
        <FilterPills
          options={MPG_BUCKETS.map((b) => ({ id: b.id, label: b.label, description: b.description }))}
          activeIds={activeMpgBucket ? [activeMpgBucket] : []}
          onToggle={toggleMpgBucket}
          compact
        />
      </div>

      <div>
        <SectionLabel>Vehicle type</SectionLabel>
        <FilterPills
          options={bodyPillOptions}
          activeIds={filters.bodyStyle ?? []}
          onToggle={(id) => toggleArrayFilter('bodyStyle', id)}
        />
      </div>

      <div>
        <SectionLabel>Powertrain</SectionLabel>
        <FilterPills
          options={fuelPillOptions}
          activeIds={filters.fuelType ?? []}
          onToggle={(id) => toggleArrayFilter('fuelType', id)}
          compact
        />
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

      <details className="group border-t border-zinc-800 pt-5">
        <summary className="cursor-pointer list-none text-[10px] tracking-[0.25em] text-zinc-400 uppercase hover:text-white flex items-center justify-between">
          More filters
          <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-5 space-y-6">
          <div>
            <SectionLabel>Make</SectionLabel>
            <input
              type="text"
              placeholder="Find a make…"
              value={makeSearch}
              onChange={(e) => setMakeSearch(e.target.value)}
              className="w-full bg-black border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 mb-2"
            />
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {filteredMakes.map((make) => {
                const active = filters.make?.includes(make);
                return (
                  <button
                    key={make}
                    type="button"
                    onClick={() => toggleArrayFilter('make', make)}
                    className={`w-full text-left px-2 py-1 text-sm transition-colors ${
                      active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {make}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SectionLabel>Custom price range</SectionLabel>
            <RangeInputs
              value={filters.price}
              step={1000}
              onCommit={(range) => commitFilters({ ...filters, price: range })}
            />
          </div>

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
              value={filters.displacement}
              step={0.5}
              onCommit={(range) => commitFilters({ ...filters, displacement: range })}
            />
            <p className="text-[10px] text-zinc-500 mt-2">Excludes EVs</p>
          </div>
        </div>
      </details>
    </div>
  );
}
