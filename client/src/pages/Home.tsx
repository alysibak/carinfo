import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import FilterSidebar from '../components/FilterSidebar';
import FilterSheet from '../components/FilterSheet';
import CarCard from '../components/CarCard';
import SearchBar from '../components/SearchBar';
import SelectMenu from '../components/SelectMenu';
import PageShell, { PageBody } from '../components/PageShell';
import {
  defaultCollapseByModel,
  describeActiveFilters,
  getDefaultPageSize,
  hasActiveSearch,
  paramsToSearchQuery,
  removeActiveFilterChip,
  searchQueryToParams,
  withoutYearTokens,
} from '../utils/searchParams';
import {
  countActiveFilterFields,
  isElectricOnlyBrowse,
  sortForFilters,
} from '../utils/filterState';
import { QUICK_FILTERS } from '../utils/quickFilters';
import { LIFESTYLE_PRESETS, POPULAR_SEARCHES } from '../config/browseTaxonomy';
import type { CarFilter } from '../types/car.types';
import { usePageMeta } from '../utils/pageMeta';
import { describeSearchInterpretation } from '../utils/searchInterpretation';
import { matchReasons } from '../utils/matchReasons';
import { useResultsView } from '../hooks/useResultsView';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

export default function Home() {
  usePageMeta(
    'Search',
    'Search and filter 1,000+ models by type, make, year, EPA fuel use, NHTSA crash rating and power.',
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { searchResults, searchQuery, setSearchQuery, performSearch, isSearching, searchError } =
    useCarStore();

  // Seeded from the URL so a shared search renders its filter row on the first
  // paint instead of one effect later, which shifted the results down.
  const [searchText, setSearchText] = useState(() => searchParams.get('q') ?? '');
  const [hasSearched, setHasSearched] = useState(() => hasActiveSearch(searchParams));
  // "Filter them by type…" on the home page lands here with the filters open
  // (on a phone; a wide screen shows them beside the results anyway).
  const [filtersOpen, setFiltersOpen] = useState(
    () =>
      searchParams.get('filters') === 'open' &&
      typeof window !== 'undefined' &&
      !window.matchMedia?.('(min-width: 1024px)').matches,
  );
  const [view, setView] = useResultsView();
  const pageSize = getDefaultPageSize();

  const runSearchFromParams = useCallback(
    (params: URLSearchParams) => {
      const { query } = paramsToSearchQuery(params);
      setSearchText(query.query ?? '');
      setSearchQuery(query);
      setHasSearched(hasActiveSearch(params));
      performSearch();
    },
    [performSearch, setSearchQuery],
  );

  useEffect(() => {
    if (searchParams.get('filters') !== 'open') return;
    const next = new URLSearchParams(searchParams);
    next.delete('filters');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Keep results in sync with the URL (back/forward, shared links).
  useEffect(() => {
    if (hasActiveSearch(searchParams)) {
      runSearchFromParams(searchParams);
    } else {
      setHasSearched(false);
      setSearchText('');
    }
  }, [searchParams, runSearchFromParams]);

  const currentPage = useMemo(() => {
    const p = Number(searchParams.get('page'));
    return Number.isFinite(p) && p > 0 ? p : 1;
  }, [searchParams]);

  const totalPages = searchResults ? Math.max(1, Math.ceil(searchResults.total / pageSize)) : 1;

  const pushSearch = useCallback(
    (nextQuery: typeof searchQuery, page = 1) => {
      const params = searchQueryToParams(
        { ...nextQuery, limit: pageSize, offset: (page - 1) * pageSize },
        page,
      );
      setSearchParams(params, { replace: page === 1 });
    },
    [pageSize, setSearchParams],
  );

  // Live search: update results as the user types (debounced), including typo-tolerant API matching.
  // Live search: only reacts to typed text — must not overwrite filter/sort URL updates.
  useEffect(() => {
    const trimmed = searchText.trim();
    if (VIN_PATTERN.test(trimmed)) return;

    const timer = window.setTimeout(() => {
      // The user may already be leaving: React Router commits navigations in a
      // transition, so this page stays mounted (and this timer alive) while
      // the next page's chunk loads, though the URL has already changed.
      // Writing search params now would replace that URL and bounce them back
      // here — clicking a result within 280 ms of typing used to do exactly that.
      if (window.location.pathname !== pathname) return;
      const params = new URLSearchParams(window.location.search);
      const current = useCarStore.getState().searchQuery;
      const existingQ = params.get('q') ?? '';

      if (trimmed.length === 0) {
        if (existingQ) {
          const next = new URLSearchParams(params);
          next.delete('q');
          next.delete('page');
          if (next.get('sort') === 'relevance') next.delete('sort');
          setSearchParams(next, { replace: true });
        }
        return;
      }
      if (trimmed.length < 2) return;

      // Query unchanged → leave sort/filters alone (user may have just changed sort).
      if (existingQ === trimmed) return;

      const explicitOnePer = params.get('onePerModel');
      const collapseByModel =
        explicitOnePer === '0'
          ? false
          : explicitOnePer === '1'
            ? true
            : defaultCollapseByModel(trimmed, current.filters);

      pushSearch({
        ...current,
        query: trimmed,
        collapseByModel,
        sort: { field: 'relevance', order: 'desc' },
        offset: 0,
      });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchText, pathname, pushSearch, setSearchParams]);

  const handleTextSearch = (text: string) => {
    const trimmed = text.trim();
    if (VIN_PATTERN.test(trimmed)) {
      navigate(`/vin?vin=${encodeURIComponent(trimmed.toUpperCase())}`);
      return;
    }
    setSearchText(text);
    const params = new URLSearchParams(window.location.search);
    const explicitOnePer = params.get('onePerModel');
    const collapseByModel =
      explicitOnePer === '0'
        ? false
        : explicitOnePer === '1'
          ? true
          : defaultCollapseByModel(trimmed || undefined, searchQuery.filters);
    pushSearch({
      ...searchQuery,
      query: text || undefined,
      collapseByModel,
      sort: text
        ? { field: 'relevance', order: 'desc' }
        : (searchQuery.sort ?? { field: 'year', order: 'desc' }),
      offset: 0,
    });
  };

  const handleSortChange = (field: string) => {
    // A new field starts where people start: cheapest first for money,
    // highest first for the rest.
    const cheapestFirst = field === 'price' || field === 'runningCost';
    const newOrder =
      field === searchQuery.sort?.field
        ? searchQuery.sort?.order === 'desc'
          ? 'asc'
          : 'desc'
        : cheapestFirst
          ? 'asc'
          : 'desc';
    pushSearch({
      ...searchQuery,
      sort: { field, order: newOrder },
    });
  };

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    pushSearch(searchQuery, clamped);
    // The CSS reduced-motion rule cannot reach a scroll requested from script.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  // Only an empty result can carry this: the searched years are all off file.
  const yearCoverage = searchResults?.total === 0 ? searchResults.yearCoverage : undefined;
  const textWithoutYears = withoutYearTokens(searchText);

  const searchEveryYear = () => {
    const filters = { ...searchQuery.filters };
    delete filters.year;
    setSearchText(textWithoutYears);
    pushSearch({ ...searchQuery, query: textWithoutYears, filters, offset: 0 });
  };

  const removeChip = (chipKey: string) => {
    const nextFilters = removeActiveFilterChip(searchQuery.filters ?? {}, chipKey);
    pushSearch({
      ...searchQuery,
      filters: nextFilters,
      offset: 0,
    });
  };

  const applyQuickFilter = (toggle: (filters: CarFilter) => CarFilter) => {
    const nextFilters = toggle(searchQuery.filters ?? {});
    pushSearch({
      ...searchQuery,
      filters: nextFilters,
      sort: sortForFilters(nextFilters, searchQuery.query, searchQuery.sort),
      offset: 0,
    });
  };

  // What the sheet's button offers to show: "309 models".
  const resultLabel =
    hasSearched && searchResults && !searchError
      ? `${searchResults.total.toLocaleString()} ${
          searchQuery.collapseByModel
            ? searchResults.total === 1
              ? 'model'
              : 'models'
            : searchResults.total === 1
              ? 'vehicle'
              : 'vehicles'
        }`
      : null;

  const toggleOnePerModel = () => {
    pushSearch({
      ...searchQuery,
      collapseByModel: !searchQuery.collapseByModel,
      offset: 0,
    });
  };

  const activeFilterChips = describeActiveFilters(searchQuery.filters);
  const activeFilterCount = countActiveFilterFields(searchQuery.filters);
  const quickFilters = QUICK_FILTERS.filter((q) => !q.isOn(searchQuery.filters ?? {}));
  // Wide screens have the filters beside the results; this row then only
  // carries what is switched on.
  const rowHasDesktopContent = activeFilterChips.length > 0 || hasSearched;
  const sortField = searchQuery.sort?.field ?? 'year';
  const sortOrder = searchQuery.sort?.order ?? 'desc';
  const isEvBrowse = isElectricOnlyBrowse(searchQuery.filters);

  const onFiltersApplied = (text?: string) => {
    if (text !== undefined) setSearchText(text);
    const q = useCarStore.getState().searchQuery;
    const words = text !== undefined ? text : searchText;
    const params = searchQueryToParams({ ...q, query: words || undefined }, 1);
    setSearchParams(params);
    setHasSearched(true);
  };

  return (
    <PageShell className="pb-12">
      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onFiltersApplied={onFiltersApplied}
        resultLabel={resultLabel}
        updating={isSearching}
      />
      <div className="sticky top-(--header-height) z-20 bg-black/90 border-b border-zinc-900 backdrop-blur-md">
        {/* A gap, not space-y: the chip row is hidden on desktop when it has
            nothing to show, and space-y's margin would stay under the box. */}
        <div className="page-wrap py-3 sm:py-4 flex flex-col gap-2.5 relative">
          <SearchBar
            value={searchText}
            onChange={setSearchText}
            onSubmit={handleTextSearch}
            loading={isSearching}
            size="default"
            showButton={false}
            placeholder="Keep typing — typos are OK (e.g. toyata camry)"
          />
          {/* For screen readers: sighted readers see the results dim. Shown, it
              sat on top of the filter chips under the search box. Always
              present so the status change is announced. */}
          <p role="status" className="sr-only">
            {isSearching && searchText.trim().length >= 2 ? 'Updating results…' : ''}
          </p>

          {/* Filters stay one tap away however far down the results go: the
              button opens every filter, the chips switch the common ones. */}
          <div
            className={`flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:-mx-5 sm:px-5 md:-mx-10 md:px-10 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible ${
              rowHasDesktopContent ? '' : 'lg:hidden'
            }`}
          >
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              className={`lg:hidden chip shrink-0 gap-2 font-medium ${
                activeFilterCount > 0 ? 'chip-on' : 'text-white border-zinc-500'
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden
              >
                <path d="M3 5h14M6 10h8M8.5 15h3" strokeLinecap="round" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="tabular-nums">
                  <span className="sr-only">, </span>
                  {activeFilterCount}
                  <span className="sr-only"> on</span>
                </span>
              )}
            </button>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => removeChip(chip.key)}
                className="chip chip-on shrink-0 gap-1.5 whitespace-nowrap"
                aria-label={`Remove filter ${chip.label}`}
              >
                {chip.label}
                <span aria-hidden>×</span>
              </button>
            ))}
            {quickFilters.map((quick) => (
              <button
                key={quick.id}
                type="button"
                onClick={() => applyQuickFilter(quick.toggle)}
                className="lg:hidden chip shrink-0 whitespace-nowrap"
              >
                {quick.label}
              </button>
            ))}
            {hasSearched && (
              <button
                type="button"
                onClick={toggleOnePerModel}
                aria-pressed={!!searchQuery.collapseByModel}
                className={`chip shrink-0 whitespace-nowrap ${
                  searchQuery.collapseByModel ? 'chip-on' : ''
                }`}
              >
                One per model
              </button>
            )}
          </div>
        </div>
      </div>

      <PageBody>
        <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-6 lg:gap-8">
          <aside className="hidden lg:block">
            <div className="lg:sticky lg:top-[calc(var(--header-height)+1rem)]">
              <FilterSidebar onFiltersApplied={onFiltersApplied} />
            </div>
          </aside>

          <div className="min-w-0">
            {!hasSearched && !isSearching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 pt-1">
                <div>
                  <h1 className="text-xl font-bold tracking-tight mb-1">I know the name</h1>
                  <p className="text-sm text-zinc-500 mb-5">
                    Type above, or jump to a common search.
                  </p>
                  <div className="flex flex-col">
                    {POPULAR_SEARCHES.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleTextSearch(item.query)}
                        className="list-row text-left text-sm text-zinc-300 hover:text-white"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight mb-1">I know the situation</h2>
                  <p className="text-sm text-zinc-500 mb-5">Opens a filtered set you can refine.</p>
                  <div className="flex flex-col">
                    {LIFESTYLE_PRESETS.slice(0, 6).map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          pushSearch({
                            query: item.query,
                            filters: item.filters as CarFilter,
                            sort: item.sort ?? { field: 'year', order: 'desc' },
                            limit: pageSize,
                            offset: 0,
                          });
                          setSearchText(item.query ?? '');
                        }}
                        className="list-row text-left"
                      >
                        <span>
                          <span className="block text-sm text-zinc-200">{item.label}</span>
                          <span className="block text-xs text-zinc-500 mt-0.5">
                            {item.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* The start page's heading goes with it; results need their own. */}
                <h1 className="sr-only">
                  {searchQuery.query
                    ? `Search results for “${searchQuery.query}”`
                    : 'Search results'}
                </h1>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-3 border-b border-zinc-900">
                  <div className="min-w-0">
                    {searchResults && !searchError && (
                      // A heading between the page's and the cards' (h3), so the
                      // outline does not skip a level.
                      <h2 className="text-sm font-normal text-zinc-400">
                        <span className="text-white font-semibold tabular-nums">
                          {searchResults.total.toLocaleString()}
                        </span>{' '}
                        {searchQuery.collapseByModel
                          ? searchResults.total === 1
                            ? 'model'
                            : 'models'
                          : searchResults.total === 1
                            ? 'vehicle'
                            : 'vehicles'}
                        {searchResults.total > pageSize && (
                          <span>
                            {' '}
                            · {currentPage} of {totalPages}
                          </span>
                        )}
                      </h2>
                    )}
                    {searchResults &&
                      !searchError &&
                      searchResults.total > 0 &&
                      describeSearchInterpretation(searchResults.interpretation).map((line) => (
                        <p key={line} className="text-xs text-zinc-400 mt-1">
                          {line}
                        </p>
                      ))}
                    {searchResults?.interpretation?.compareWith && !searchError && (
                      <p className="text-xs mt-1">
                        <Link
                          to={`/compare?cars=${searchResults.interpretation.compareWith
                            .map((c) => c.id)
                            .join(',')}`}
                          className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500"
                        >
                          Compare the{' '}
                          {searchResults.interpretation.compareWith
                            .map((c) => c.label)
                            .join(' and the ')}{' '}
                          side by side
                        </Link>
                      </p>
                    )}
                    {searchResults?.interpretation?.similarTo && !searchError && (
                      <p className="text-xs mt-1">
                        <Link
                          to={`/car/${searchResults.interpretation.similarTo.id}`}
                          className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500"
                        >
                          See the {searchResults.interpretation.similarTo.label}
                        </Link>
                      </p>
                    )}
                    {searchError && <p className="text-sm text-red-400">{searchError}</p>}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
                    <span className="text-xs text-zinc-500 shrink-0">Sort</span>
                    <SelectMenu
                      aria-label="Sort results"
                      className="w-full min-w-0 sm:w-40"
                      value={sortField}
                      onChange={handleSortChange}
                      options={[
                        ...(searchText || sortField === 'relevance'
                          ? [{ value: 'relevance', label: 'Best match' }]
                          : []),
                        // What EPA and NHTSA recorded first; the estimates last, and named so.
                        {
                          value: 'fuelEconomy',
                          label: isEvBrowse ? 'Energy use (EPA)' : 'Fuel use (EPA)',
                        },
                        ...(isEvBrowse || sortField === 'range'
                          ? [{ value: 'range', label: 'EPA range' }]
                          : []),
                        { value: 'safety', label: 'NHTSA rating' },
                        { value: 'horsepower', label: 'Horsepower' },
                        { value: 'year', label: 'Year' },
                        { value: 'make', label: 'Make' },
                        { value: 'model', label: 'Model' },
                        { value: 'price', label: 'Est. value (CAD)' },
                        { value: 'runningCost', label: 'Est. running cost' },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => handleSortChange(sortField)}
                      className="min-h-[42px] min-w-[42px] px-2 text-zinc-400 hover:text-white transition-colors shrink-0"
                      title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                      aria-label="Toggle sort direction"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                    <div className="flex shrink-0" role="group" aria-label="Show results as">
                      {(['list', 'grid'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setView(option)}
                          aria-pressed={view === option}
                          className={`chip min-h-[42px]! ${option === 'grid' ? '-ml-px' : ''} ${
                            view === option ? 'chip-on relative' : ''
                          }`}
                        >
                          {option === 'list' ? 'List' : 'Grid'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {isSearching ? (
                  view === 'list' ? (
                    <div className="border-t border-zinc-900 opacity-50 pointer-events-none">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-24 border-b border-zinc-900" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 opacity-50 pointer-events-none">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="surface-card h-52" />
                      ))}
                    </div>
                  )
                ) : searchError ? (
                  <div className="empty-panel">
                    <p className="text-base text-zinc-300 mb-5">
                      Something went wrong while searching.
                    </p>
                    <button type="button" onClick={performSearch} className="btn-primary">
                      Try again
                    </button>
                  </div>
                ) : searchResults && searchResults.results.length > 0 ? (
                  <>
                    {view === 'list' ? (
                      <div className="border-t border-zinc-900 -mx-3 sm:mx-0">
                        {searchResults.results.map((car) => (
                          <CarCard
                            key={car.id}
                            car={car}
                            layout="list"
                            reasons={matchReasons(
                              car,
                              searchQuery.filters,
                              searchResults.interpretation,
                            )}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {searchResults.results.map((car) => (
                          <CarCard
                            key={car.id}
                            car={car}
                            reasons={matchReasons(
                              car,
                              searchQuery.filters,
                              searchResults.interpretation,
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 sm:gap-4 mt-8">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => goToPage(currentPage - 1)}
                          className="chip min-h-[44px]! px-5 disabled:opacity-40 disabled:hover:border-zinc-700"
                        >
                          ← Previous
                        </button>
                        <span className="text-sm text-zinc-400 tabular-nums">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages || !searchResults.hasMore}
                          onClick={() => goToPage(currentPage + 1)}
                          className="chip min-h-[44px]! px-5 disabled:opacity-40 disabled:hover:border-zinc-700"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-panel">
                    <p className="text-base text-zinc-300 mb-2">
                      {searchText.trim()
                        ? `No vehicles matched “${searchText.trim()}”.`
                        : 'No vehicles matched these filters.'}
                    </p>
                    <p className="text-sm text-zinc-400 mb-5">
                      {yearCoverage
                        ? `Model years ${yearCoverage.min}–${yearCoverage.max} are on file, and the year you asked for is outside that range.`
                        : searchText.trim()
                          ? 'Try a different spelling, or clear filters if any are on.'
                          : 'Try widening the year range or removing a filter.'}
                    </p>
                    {yearCoverage && (textWithoutYears || searchQuery.filters?.year) && (
                      <button
                        type="button"
                        onClick={searchEveryYear}
                        className="min-h-[44px] mr-6 text-xs text-zinc-200 hover:text-white underline underline-offset-4"
                      >
                        {textWithoutYears
                          ? `Search “${textWithoutYears}” in every year`
                          : 'Remove the year filter'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchText('');
                        setSearchParams(new URLSearchParams());
                        setHasSearched(false);
                        setSearchQuery({
                          query: '',
                          filters: {},
                          sort: { field: 'year', order: 'desc' },
                          limit: pageSize,
                          offset: 0,
                        });
                      }}
                      className="min-h-[44px] text-xs text-zinc-400 hover:text-white underline underline-offset-4"
                    >
                      Clear and start over
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </PageBody>
    </PageShell>
  );
}
