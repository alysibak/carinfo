import { useState, useEffect, useMemo, useCallback, useId } from 'react';
import { useCarStore } from '../stores/carStore';
import * as api from '../services/api';
import FilterPills from './FilterPills';
import type { CarFilter, ModelLineSummary, SearchQuery } from '../types/car.types';
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
  sortForFilters,
  toggleRangeBucket,
} from '../utils/filterState';
import { LATEST_FULL_MODEL_YEAR } from '@carinfo/config/model-years';

type RangeKey = 'price' | 'year' | 'fuelEconomy' | 'horsepower' | 'safety' | 'rangeMiles';

const GEARBOXES = [
  { id: 'automatic', label: 'Automatic' },
  { id: 'manual', label: 'Manual' },
  { id: 'cvt', label: 'CVT' },
];

/**
 * One filter, folded to its name and what is chosen ("SUV, Sedan", or
 * "Any"); a section with a choice in it opens by itself. A panel of eleven
 * open sections ran to four screens.
 */
function FilterSection({
  title,
  summary,
  active,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: string | null;
  active: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? (defaultOpen || active);
  const panelId = useId();
  return (
    <section className="border-b border-zinc-900 last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setOpen(!isOpen)}
          className="group w-full flex items-center justify-between gap-3 min-h-[44px] py-2 text-left"
        >
          <span className="text-[13px] font-semibold text-zinc-100 group-hover:text-white">
            {title}
          </span>
          {/* Read as "Type: SUV", not "TypeSUV". */}
          <span className="sr-only">: </span>
          <span className="flex items-center gap-2 min-w-0">
            <span
              className={`text-xs truncate max-w-[10rem] ${active ? 'text-accent' : 'text-zinc-500'}`}
            >
              {summary ?? 'Any'}
            </span>
            <svg
              viewBox="0 0 16 16"
              className={`w-3.5 h-3.5 shrink-0 text-zinc-500 group-hover:text-white transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              aria-hidden
            >
              <path
                d="M4 6l4 4 4-4"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </h3>
      <div id={panelId} hidden={!isOpen} className="pb-4 pt-1">
        {children}
      </div>
    </section>
  );
}

/** "SUV, Sedan" from the ids chosen, or null for none. */
function namesOf(
  ids: string[] | undefined,
  options: Array<{ id: string; label: string }>,
): string | null {
  if (!ids?.length) return null;
  return ids.map((id) => options.find((o) => o.id === id)?.label ?? id).join(', ');
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
 * Every filter a shopper reaches for, in plain words, each section folded to
 * what is chosen in it: type, make (then its models), year and fuel open;
 * EPA's fuel use, the drive, the records (NHTSA's crash tests and safety
 * features, Transport Canada's recalls, Équité's most-stolen list), seats
 * and gearbox, power and the estimated value folded. Shown beside the
 * results on a wide screen and in a full-screen sheet on a phone
 * (FilterSheet).
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
  const [lines, setLines] = useState<ModelLineSummary[] | null>(null);
  const [showOlderLines, setShowOlderLines] = useState(false);

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

  // One make chosen: its models to pick from, those on sale first.
  const singleMake = filters.make?.length === 1 ? filters.make[0] : null;
  useEffect(() => {
    if (!singleMake) {
      setLines(null);
      return;
    }
    let active = true;
    setShowOlderLines(false);
    api
      .getModelLines(singleMake)
      .then((list) => {
        if (active) setLines(list);
      })
      .catch(() => {
        if (active) setLines([]);
      });
    return () => {
      active = false;
    };
  }, [singleMake]);

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
    // A model goes with its make: "Honda Civic" stays only while Honda does.
    if (key === 'make' && next.modelLine?.length) {
      const makes = (nextArr as string[]).map((m) => m.toLowerCase());
      const kept = next.modelLine.filter((line) =>
        makes.some((make) => line.toLowerCase().startsWith(`${make} `)),
      );
      next.modelLine = kept.length ? kept : undefined;
    }
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

  // What each section holds, said in its header.
  const yearSummary =
    YEAR_BUCKETS.find((b) => b.id === activeBucket(YEAR_BUCKETS, 'year'))?.label ??
    (filters.year?.min != null || filters.year?.max != null
      ? [filters.year?.min ?? '…', filters.year?.max ?? '…'].join('–')
      : null);
  const bucketSummary = (buckets: BucketOption[], key: RangeKey) =>
    buckets.find((b) => b.id === activeBucket(buckets, key))?.label ??
    (filters[key] ? 'Custom' : null);
  const recordsOn = [
    bucketSummary(SAFETY_BUCKETS, 'safety'),
    isFcwStandard(filters) ? 'Collision warning' : null,
    filters.noRecalls ? 'No recalls' : null,
    filters.theftListed === false ? 'Not most stolen' : null,
  ].filter((part): part is string => !!part);
  const seats = [
    filters.threeRow === true ? 'Three rows' : null,
    ...(filters.transmission ?? []).map((t) => GEARBOXES.find((g) => g.id === t)?.label ?? t),
  ].filter((part): part is string => !!part);
  const lineName = (label: string) =>
    singleMake && label.toLowerCase().startsWith(`${singleMake.toLowerCase()} `)
      ? label.slice(singleMake.length + 1)
      : label;
  const onSale = lines?.filter((line) => line.last >= LATEST_FULL_MODEL_YEAR - 1) ?? [];
  const older = lines?.filter((line) => line.last < LATEST_FULL_MODEL_YEAR - 1) ?? [];
  const chosenLines = filters.modelLine ?? [];

  return (
    <div
      className={
        isSheet
          ? ''
          : 'surface-card px-5 pt-4 pb-2 lg:max-h-[calc(100vh-var(--header-height)-2rem)] lg:overflow-y-auto rounded-none'
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
              className="text-xs text-zinc-400 hover:text-white min-h-[32px] px-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
      {isSheet && activeFilterCount > 0 && (
        <div className="flex items-center justify-between pb-2">
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

      <FilterSection
        title="Type"
        summary={namesOf(filters.bodyStyle, BODY_TYPES)}
        active={!!filters.bodyStyle?.length}
        defaultOpen
      >
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
          compact
        />
      </FilterSection>

      <FilterSection
        title="Make"
        summary={selectedMakes.length ? selectedMakes.join(', ') : null}
        active={selectedMakes.length > 0}
        defaultOpen
      >
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
      </FilterSection>

      {singleMake && lines && lines.length > 0 && (
        <FilterSection
          title={`${singleMake} model`}
          summary={chosenLines.length ? chosenLines.map(lineName).join(', ') : null}
          active={chosenLines.length > 0}
          defaultOpen
        >
          <FilterPills
            options={(showOlderLines ? lines : onSale.length ? onSale : lines).map((line) => ({
              id: line.label,
              label: line.name,
              description: `${line.first}–${line.last}`,
            }))}
            activeIds={chosenLines}
            onToggle={(id) => toggleArrayFilter('modelLine', id)}
            compact
          />
          {!showOlderLines && onSale.length > 0 && older.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOlderLines(true)}
              className="mt-2 min-h-[36px] text-xs text-zinc-400 hover:text-white underline underline-offset-4 decoration-zinc-700"
            >
              Older models ({older.length})
            </button>
          )}
        </FilterSection>
      )}

      <FilterSection
        title="Model year"
        summary={yearSummary ? String(yearSummary) : null}
        active={!!yearSummary}
        defaultOpen
      >
        {bucketPills(YEAR_BUCKETS, 'year')}
      </FilterSection>

      <FilterSection
        title="Fuel"
        summary={namesOf(filters.fuelType, FUEL_TYPES)}
        active={!!filters.fuelType?.length}
        defaultOpen
      >
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
      </FilterSection>

      <FilterSection
        title="Fuel use"
        summary={bucketSummary(MPG_BUCKETS, 'fuelEconomy')}
        active={!!filters.fuelEconomy}
      >
        {/* Electric is under Fuel: "100+ MPGe" said the same in jargon. */}
        {bucketPills(
          MPG_BUCKETS.filter((b) => b.id !== 'mpg-100'),
          'fuelEconomy',
        )}
        <p className="text-xs text-zinc-500 mt-2">EPA&apos;s combined rating.</p>
      </FilterSection>

      {electricOnly && (
        <FilterSection
          title="Range on a charge"
          summary={bucketSummary(RANGE_BUCKETS, 'rangeMiles')}
          active={!!filters.rangeMiles}
          defaultOpen
        >
          {bucketPills(RANGE_BUCKETS, 'rangeMiles')}
          <p className="text-xs text-zinc-500 mt-2">EPA&apos;s rating, new.</p>
        </FilterSection>
      )}

      <FilterSection
        title="Drive"
        summary={
          filters.driveType?.length
            ? filters.driveType
                .map((d) => DRIVE_LABELS[d as (typeof DRIVE_TYPES)[number]] ?? d)
                .join(', ')
            : null
        }
        active={!!filters.driveType?.length}
      >
        <FilterPills
          options={DRIVE_TYPES.map((d) => ({ id: d, label: DRIVE_LABELS[d] }))}
          activeIds={filters.driveType ?? []}
          onToggle={(id) => toggleArrayFilter('driveType', id)}
          compact
        />
      </FilterSection>

      <FilterSection
        title="Safety and records"
        summary={recordsOn.length ? recordsOn.join(', ') : null}
        active={recordsOn.length > 0}
      >
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
      </FilterSection>

      <FilterSection
        title="Seats and gearbox"
        summary={seats.length ? seats.join(', ') : null}
        active={seats.length > 0}
      >
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
      </FilterSection>

      <FilterSection
        title="Power"
        summary={bucketSummary(POWER_BUCKETS, 'horsepower')}
        active={!!filters.horsepower}
      >
        {bucketPills(POWER_BUCKETS, 'horsepower')}
      </FilterSection>

      <FilterSection
        title="Estimated value"
        summary={bucketSummary(PRICE_BUCKETS, 'price')}
        active={!!filters.price}
      >
        {bucketPills(PRICE_BUCKETS, 'price')}
        <p className="text-xs text-zinc-500 mt-2 mb-3">
          Our model&apos;s estimate in Canadian dollars, not an asking price: a car can sell for
          more or less.
        </p>
        <RangeInputs
          label="estimated value"
          value={filters.price}
          step={1000}
          onCommit={(range) => commitFilters({ ...filters, price: range })}
        />
      </FilterSection>
    </div>
  );
}
