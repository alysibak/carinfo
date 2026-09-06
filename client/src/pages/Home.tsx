import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import FilterSidebar from '../components/FilterSidebar';
import CarCard from '../components/CarCard';
import SearchBar from '../components/SearchBar';
import SelectMenu from '../components/SelectMenu';
import PageShell, { PageBody } from '../components/PageShell';
import {
  describeActiveFilters,
  getDefaultPageSize,
  hasActiveSearch,
  paramsToSearchQuery,
  removeActiveFilterChip,
  searchQueryToParams,
} from '../utils/searchParams';
import { isElectricOnlyBrowse } from '../utils/filterState';
import {
  LIFESTYLE_PRESETS,
  POPULAR_SEARCHES,
} from '../config/browseTaxonomy';
import type { CarFilter } from '../types/car.types';
import { usePageMeta } from '../utils/pageMeta';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

export default function Home() {
  usePageMeta('Search', 'Filter and search 28,000+ vehicles by make, fuel type, body style, and price.');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    searchResults,
    searchQuery,
    setSearchQuery,
    performSearch,
    isSearching,
    searchError,
  } = useCarStore();

  const [searchText, setSearchText] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

      pushSearch({
        ...current,
        query: trimmed,
        sort: { field: 'relevance', order: 'desc' },
        offset: 0,
      });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchText, pushSearch, setSearchParams]);

  const handleTextSearch = (text: string) => {
    const trimmed = text.trim();
    if (VIN_PATTERN.test(trimmed)) {
      navigate(`/vin?vin=${encodeURIComponent(trimmed.toUpperCase())}`);
      return;
    }
    setSearchText(text);
    pushSearch({
      ...searchQuery,
      query: text || undefined,
      sort: text
        ? { field: 'relevance', order: 'desc' }
        : searchQuery.sort ?? { field: 'year', order: 'desc' },
      offset: 0,
    });
  };

  const handleSortChange = (field: string) => {
    const newOrder =
      field === searchQuery.sort?.field && searchQuery.sort?.order === 'desc' ? 'asc' : 'desc';
    pushSearch({
      ...searchQuery,
      sort: { field, order: newOrder },
    });
  };

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    pushSearch(searchQuery, clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="page-wrap py-3 sm:py-4 space-y-3">
          <SearchBar
            value={searchText}
            onChange={setSearchText}
            onSubmit={handleTextSearch}
            loading={isSearching}
            size="default"
            placeholder="Keep typing — typos are OK (e.g. toyata camry)"
          />
          {isSearching && searchText.trim().length >= 2 && (
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">Updating results…</p>
          )}

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
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-8 lg:gap-12">
          <aside>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="lg:hidden w-full mb-4 flex items-center justify-between py-3 text-sm font-medium text-white border-b border-zinc-800"
            >
              <span>Filters</span>
              <span className="text-zinc-500">{filtersOpen ? 'Hide' : 'Show'}</span>
            </button>
            <div
              className={`${filtersOpen ? 'block' : 'hidden lg:block'} lg:sticky lg:top-[calc(var(--header-height)+1rem)]`}
            >
              <FilterSidebar
                onFiltersApplied={() => {
                  const q = useCarStore.getState().searchQuery;
                  const params = searchQueryToParams(
                    { ...q, query: searchText || undefined },
                    1,
                  );
                  setSearchParams(params);
                  setHasSearched(true);
                  // Keep the mobile filter panel open so people can stack filters.
                }}
              />
              {filtersOpen && (
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="lg:hidden mt-4 w-full py-2.5 text-xs uppercase tracking-wider border border-zinc-700 text-zinc-300 hover:border-white hover:text-white"
                >
                  Done with filters
                </button>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            {!hasSearched && !isSearching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-2">
                <div>
                  <h1 className="text-xl font-bold tracking-tight mb-1">I know the name</h1>
                  <p className="text-sm text-zinc-500 mb-5">Type above, or jump to a common search.</p>
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
                            query: undefined,
                            filters: item.filters as CarFilter,
                            sort: item.sort ?? { field: 'year', order: 'desc' },
                            limit: pageSize,
                            offset: 0,
                          });
                          setSearchText('');
                        }}
                        className="list-row text-left"
                      >
                        <span>
                          <span className="block text-sm text-zinc-200">{item.label}</span>
                          <span className="block text-xs text-zinc-500 mt-0.5">{item.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-4 border-b border-zinc-900">
                  <div>
                    {searchResults && !searchError && (
                      <p className="text-sm text-zinc-400">
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
                      </p>
                    )}
                    {searchError && <p className="text-sm text-red-400">{searchError}</p>}
                  </div>

                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                    <span className="text-xs text-zinc-500 shrink-0">Sort</span>
                    <SelectMenu
                      aria-label="Sort results"
                      className="w-full min-w-0 sm:w-40"
                      value={sortField}
                      onChange={handleSortChange}
                      options={[
                        ...(searchText ? [{ value: 'relevance', label: 'Best match' }] : []),
                        { value: 'year', label: 'Year' },
                        { value: 'make', label: 'Make' },
                        { value: 'model', label: 'Model' },
                        { value: 'price', label: 'Est. value (CAD)' },
                        { value: 'horsepower', label: 'Horsepower' },
                        ...(isEvBrowse ? [{ value: 'range', label: 'EPA range' }] : []),
                        { value: 'fuelEconomy', label: isEvBrowse ? 'MPGe' : 'MPG' },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => handleSortChange(sortField)}
                      className="px-3 py-2 text-zinc-400 hover:text-white transition-colors"
                      title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                      aria-label="Toggle sort direction"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>

                {isSearching ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-50 pointer-events-none">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="surface-card aspect-[16/10] min-h-[280px]" />
                    ))}
                  </div>
                ) : searchError ? (
                  <div className="text-center py-24 bg-zinc-950 border border-zinc-800">
                    <p className="text-lg font-light text-zinc-300 mb-6">
                      Something went wrong while searching.
                    </p>
                    <button
                      type="button"
                      onClick={performSearch}
                      className="px-8 py-3 bg-white text-black text-xs font-black tracking-[0.3em] uppercase hover:bg-zinc-200"
                    >
                      Try again
                    </button>
                  </div>
                ) : searchResults && searchResults.results.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {searchResults.results.map((car) => (
                        <CarCard key={car.id} car={car} />
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-10">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => goToPage(currentPage - 1)}
                          className="px-5 py-2 border border-zinc-700 text-xs uppercase tracking-widest disabled:opacity-40 hover:border-zinc-400 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-zinc-400">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages || !searchResults.hasMore}
                          onClick={() => goToPage(currentPage + 1)}
                          className="px-5 py-2 border border-zinc-700 text-xs uppercase tracking-widest disabled:opacity-40 hover:border-zinc-400 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-24 border border-zinc-800 bg-zinc-950 p-8">
                    <p className="text-base text-zinc-300 mb-2">No vehicles matched these filters.</p>
                    <p className="text-sm text-zinc-400 mb-6">
                      Try widening the year range or removing a filter.
                    </p>
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
                      className="text-xs tracking-widest text-zinc-400 hover:text-white underline underline-offset-4"
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
