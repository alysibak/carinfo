import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import FilterSidebar from '../components/FilterSidebar';
import CarCard from '../components/CarCard';
import SearchBar from '../components/SearchBar';
import AboutData from '../components/AboutData';
import {
  describeActiveFilters,
  getDefaultPageSize,
  hasActiveSearch,
  paramsToSearchQuery,
  searchQueryToParams,
} from '../utils/searchParams';
import { isElectricOnlyBrowse } from '../utils/filterState';
import {
  LIFESTYLE_PRESETS,
  POPULAR_SEARCHES,
} from '../config/browseTaxonomy';
import type { CarFilter, SearchQuery } from '../types/car.types';

const QUICK_START: Array<
  | { label: string; q: string }
  | { label: string; q: string; filters: CarFilter; sort?: SearchQuery['sort'] }
> = [
  ...POPULAR_SEARCHES.map((s) => ({ label: s.label, q: s.query })),
  ...LIFESTYLE_PRESETS.slice(0, 4).map((p) => ({
    label: p.label,
    q: '',
    filters: p.filters as CarFilter,
    sort: p.sort,
  })),
];

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
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
      const { query, page } = paramsToSearchQuery(params);
      setSearchText(query.query ?? '');
      setSearchQuery(query);
      setHasSearched(hasActiveSearch(params));
      performSearch();
      return page;
    },
    [performSearch, setSearchQuery],
  );

  useEffect(() => {
    if (hasActiveSearch(searchParams)) {
      runSearchFromParams(searchParams);
    } else {
      setHasSearched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPage = useMemo(() => {
    const p = Number(searchParams.get('page'));
    return Number.isFinite(p) && p > 0 ? p : 1;
  }, [searchParams]);

  const totalPages = searchResults ? Math.max(1, Math.ceil(searchResults.total / pageSize)) : 1;

  const pushSearch = useCallback(
    (nextQuery: typeof searchQuery, page = 1) => {
      const params = searchQueryToParams(nextQuery, page);
      setSearchParams(params, { replace: page === 1 });
      setSearchQuery({ ...nextQuery, offset: (page - 1) * pageSize, limit: pageSize });
      setHasSearched(true);
      performSearch();
    },
    [pageSize, performSearch, setSearchParams, setSearchQuery],
  );

  const handleTextSearch = (text: string) => {
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

  const activeFilterChips = describeActiveFilters(searchQuery.filters);
  const sortField = searchQuery.sort?.field ?? 'year';
  const sortOrder = searchQuery.sort?.order ?? 'desc';
  const isEvBrowse = isElectricOnlyBrowse(searchQuery.filters);

  return (
    <div className="min-h-screen bg-black text-white pb-12">
      <div className="sticky top-[var(--header-height)] z-20 bg-black/90 border-b border-zinc-800 backdrop-blur-md">
        <div className="page-wrap py-4 sm:py-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Type naturally — e.g. &quot;2024 camry&quot; or &quot;honda civic&quot;
              </p>
            </div>
            <AboutData compact />
          </div>

          <SearchBar
            value={searchText}
            onChange={setSearchText}
            onSubmit={handleTextSearch}
            loading={isSearching}
            size="default"
          />

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center px-3 py-1 text-xs border border-zinc-600 text-zinc-300 bg-zinc-900"
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="page-wrap py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="lg:hidden w-full mb-4 flex items-center justify-between px-4 py-3 border border-zinc-700 rounded-lg text-sm font-medium text-white hover:border-zinc-500 transition-colors"
            >
              <span>Filters</span>
              <span className="text-zinc-400">{filtersOpen ? '−' : '+'}</span>
            </button>
            <div className={filtersOpen ? 'block' : 'hidden lg:block'}>
              <FilterSidebar
                onFiltersApplied={() => {
                  const q = useCarStore.getState().searchQuery;
                  const params = searchQueryToParams(
                    { ...q, query: searchText || undefined },
                    1,
                  );
                  setSearchParams(params);
                  setHasSearched(true);
                  setFiltersOpen(false);
                }}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            {!hasSearched && !isSearching ? (
              <div className="surface-card p-8 md:p-12 text-center rounded-xl">
                <h2 className="text-xl font-black mb-3">Start with a search</h2>
                <p className="text-sm text-zinc-400 max-w-lg mx-auto mb-8 leading-relaxed">
                  We won&apos;t dump the whole database on you. Search by make, model, year, or
                  combine with filters on the left for precise results.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_START.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if ('filters' in item && item.filters) {
                          pushSearch({
                            query: item.q || undefined,
                            filters: item.filters,
                            sort: item.sort ?? { field: 'year', order: 'desc' },
                            limit: pageSize,
                            offset: 0,
                          });
                          setSearchText(item.q ?? '');
                        } else {
                          handleTextSearch(item.q);
                        }
                      }}
                      className="px-4 py-2 text-xs border border-zinc-700 text-zinc-300 hover:border-white hover:text-white transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="surface-card p-5 mb-6 rounded-xl">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      {searchResults && !searchError && (
                        <span className="text-xs tracking-[0.2em] text-zinc-400 uppercase">
                          <span className="text-white font-black">
                            {searchResults.total.toLocaleString()}
                          </span>{' '}
                          {searchResults.total === 1 ? 'vehicle' : 'vehicles'}
                          {searchResults.total > pageSize && (
                            <span className="text-zinc-500">
                              {' '}
                              · page {currentPage} of {totalPages}
                            </span>
                          )}
                        </span>
                      )}
                      {searchError && (
                        <span className="text-xs tracking-widest text-red-400 uppercase">{searchError}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] tracking-[0.2em] text-zinc-400 uppercase">Sort</span>
                      <select
                        className="bg-black border border-zinc-700 px-3 py-2 text-xs tracking-widest text-white uppercase focus:outline-none focus:border-zinc-400"
                        value={sortField}
                        onChange={(e) => handleSortChange(e.target.value)}
                      >
                        {searchText && <option value="relevance">Best match</option>}
                        {isEvBrowse && <option value="evScore">EV score</option>}
                        <option value="year">Year</option>
                        <option value="make">Make</option>
                        <option value="model">Model</option>
                        <option value="price">Est. value</option>
                        {isEvBrowse && <option value="range">EPA range</option>}
                        <option value="fuelEconomy">{isEvBrowse ? 'MPGe' : 'MPG'}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSortChange(sortField)}
                        className="px-3 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                        title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        aria-label="Toggle sort direction"
                      >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>
                </div>

                {isSearching ? (
                  <div className="text-center py-32">
                    <div className="inline-block w-12 h-12 border-2 border-zinc-700 border-t-white rounded-full animate-spin mb-4" />
                    <p className="text-xs tracking-[0.3em] text-zinc-300 uppercase">Searching</p>
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
                  <div className="text-center py-24 bg-zinc-950 border border-zinc-800">
                    <p className="text-lg font-light text-zinc-300 uppercase mb-2">No vehicles found</p>
                    <p className="text-sm text-zinc-400 mb-6">
                      Try a different spelling, fewer filters, or a broader year range.
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
      </div>
    </div>
  );
}
