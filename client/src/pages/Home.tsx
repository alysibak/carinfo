import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import FilterSidebar from '../components/FilterSidebar';
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
import { isElectricOnlyBrowse } from '../utils/filterState';
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
    'Filter and search 35,000+ vehicles by make, fuel type, body style, and price.',
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const toggleOnePerModel = () => {
    pushSearch({
      ...searchQuery,
      collapseByModel: !searchQuery.collapseByModel,
      offset: 0,
    });
  };

  const activeFilterChips = describeActiveFilters(searchQuery.filters);
  const sortField = searchQuery.sort?.field ?? 'year';
  const sortOrder = searchQuery.sort?.order ?? 'desc';
  const isEvBrowse = isElectricOnlyBrowse(searchQuery.filters);

  return (
    <PageShell className="pb-12">
      <div className="sticky top-[var(--header-height)] z-20 bg-black/90 border-b border-zinc-900 backdrop-blur-md">
        <div className="page-wrap py-3 sm:py-4 space-y-2.5 relative">
          <SearchBar
            value={searchText}
            onChange={setSearchText}
            onSubmit={handleTextSearch}
            loading={isSearching}
            size="default"
            showButton={false}
            placeholder="Keep typing — typos are OK (e.g. toyata camry)"
          />
          {/* Overlaid rather than inserted: mounting this line pushed the whole
              results list down on every keystroke. Always present so screen
              readers hear the status change. */}
          <p
            role="status"
            className="absolute right-4 sm:right-6 bottom-0.5 text-xs text-zinc-600 pointer-events-none"
          >
            {isSearching && searchText.trim().length >= 2 ? 'Updating results…' : ''}
          </p>

          {(activeFilterChips.length > 0 || searchQuery.collapseByModel) && (
            <div className="flex flex-wrap gap-2 items-center">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeChip(chip.key)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  {chip.label}
                  <span aria-hidden className="text-zinc-500">
                    ×
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={toggleOnePerModel}
                className={`inline-flex items-center px-2.5 py-1 text-xs border ${
                  searchQuery.collapseByModel
                    ? 'border-white text-white'
                    : 'border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                One per model
              </button>
            </div>
          )}

          {hasSearched && activeFilterChips.length === 0 && !searchQuery.collapseByModel && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleOnePerModel}
                className="inline-flex items-center px-2.5 py-1 text-xs border border-zinc-700 text-zinc-400 hover:text-white"
              >
                One per model
              </button>
            </div>
          )}
        </div>
      </div>

      <PageBody>
        <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-6 lg:gap-8">
          <aside>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="lg:hidden w-full mb-3 flex items-center justify-between min-h-[44px] py-2.5 text-sm font-medium text-white border-b border-zinc-800"
            >
              <span>Filters</span>
              <span className="text-zinc-500">{filtersOpen ? 'Hide' : 'Show'}</span>
            </button>
            <div
              className={`${filtersOpen ? 'block' : 'hidden lg:block'} lg:sticky lg:top-[calc(var(--header-height)+1rem)]`}
            >
              <FilterSidebar
                onFiltersApplied={(text) => {
                  if (text !== undefined) setSearchText(text);
                  const q = useCarStore.getState().searchQuery;
                  const words = text !== undefined ? text : searchText;
                  const params = searchQueryToParams({ ...q, query: words || undefined }, 1);
                  setSearchParams(params);
                  setHasSearched(true);
                  // Keep the mobile filter panel open so people can stack filters.
                }}
              />
              {filtersOpen && (
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="lg:hidden mt-4 w-full py-2.5 text-xs border border-zinc-700 text-zinc-300 hover:border-white hover:text-white"
                >
                  Done with filters
                </button>
              )}
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
                          className={`chip !min-h-[42px] ${option === 'grid' ? '-ml-px' : ''} ${
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
                          className="chip !min-h-[44px] px-5 disabled:opacity-40 disabled:hover:border-zinc-700"
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
                          className="chip !min-h-[44px] px-5 disabled:opacity-40 disabled:hover:border-zinc-700"
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
