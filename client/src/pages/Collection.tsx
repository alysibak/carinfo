import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import {
  getDealRating,
  getDealRatingColor,
  getDealRatingLabel,
  getSegment,
  filterCarsByFuelType,
  type FuelTypeFilter,
} from '../utils/marketIntelligence';
import {
  calculateCollectionScore,
  dedupeByModel,
  type CollectionRankBy,
} from '../utils/collectionCuration';
import AggregateStats from '../components/AggregateStats';
import { COLLECTIONS } from '../config/collections';
import { cardStatClass, formatEngineDetailForCard, formatMpgForCard, formatPowerForCard, formatPriceShort } from '../utils/dataValue';
import { usesMpge } from '../utils/fuelDisplay';
import { formatTransmissionLabel, displayListingSubtitle } from '../utils/trimLabel';

type SortBy = 'value' | 'year' | 'name' | 'mpg';
type ViewMode = 'models' | 'all';

export default function Collection() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [allCars, setAllCars] = useState<CarSpecs[]>([]);
  const [filteredCars, setFilteredCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fuelTypeFilter, setFuelTypeFilter] = useState<FuelTypeFilter>('gasoline');
  const [selectedBodyStyles, setSelectedBodyStyles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('models');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const navigate = useNavigate();

  const collection = collectionId ? COLLECTIONS[collectionId] : null;
  const isCurated = Boolean(collection?.display?.dedupeByModel);
  const rankBy: CollectionRankBy = collection?.display?.rankBy ?? 'best-value';

  useEffect(() => {
    if (collection) {
      loadVehicles();
      setViewMode(collection.display?.dedupeByModel ? 'models' : 'all');
      setSortBy(collection.display?.rankBy ? 'value' : 'year');
    }
  }, [collectionId]);

  useEffect(() => {
    applyFiltersAndSort();
    setCurrentPage(1);
  }, [allCars, sortBy, sortOrder, searchTerm, fuelTypeFilter, selectedBodyStyles, viewMode]);

  const bodyStyleOptions = useMemo(
    () => Array.from(new Set(allCars.map((car) => car.bodyStyle))).sort(),
    [allCars],
  );

  const scoreFn = useMemo(
    () => (car: CarSpecs) => calculateCollectionScore(car, rankBy),
    [rankBy],
  );

  const loadVehicles = async () => {
    if (!collection) return;

    setLoading(true);
    try {
      const results = await api.searchAllCars(collection.query);
      setAllCars(results.results);
    } catch (error) {
      console.error('Failed to load collection vehicles:', error);
      setAllCars([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...allCars];

    filtered = filterCarsByFuelType(filtered, fuelTypeFilter);

    if (selectedBodyStyles.length > 0) {
      const styles = new Set(selectedBodyStyles);
      filtered = filtered.filter((car) => styles.has(car.bodyStyle));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (car) =>
          car.make.toLowerCase().includes(term) ||
          car.model.toLowerCase().includes(term) ||
          car.year.toString().includes(term),
      );
    }

    if (isCurated && viewMode === 'models') {
      filtered = dedupeByModel(filtered, scoreFn);
    }

    filtered.sort((a, b) => {
      let compareValue = 0;

      if (sortBy === 'value') {
        compareValue = scoreFn(a) - scoreFn(b);
      } else if (sortBy === 'year') {
        compareValue = a.year - b.year;
      } else if (sortBy === 'mpg') {
        compareValue = (a.fuelEconomy.combined || 0) - (b.fuelEconomy.combined || 0);
      } else if (sortBy === 'name') {
        compareValue = `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredCars(filtered);
  };

  const totalPages = Math.max(1, Math.ceil(filteredCars.length / pageSize));
  const clampedCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (clampedCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageCars = filteredCars.slice(startIndex, endIndex);

  const resultLabel = isCurated && viewMode === 'models'
    ? `${filteredCars.length} models`
    : `${filteredCars.length} vehicles`;

  const matchHint = isCurated && viewMode === 'models' && filteredCars.length < allCars.length
    ? ` from ${allCars.length.toLocaleString()} matching trims`
    : '';

  if (!collection) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-tighter mb-4 text-white">
            COLLECTION NOT FOUND
          </h2>
          <Link to="/" className="text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors">
            BACK TO HOME
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-xs tracking-[0.3em] text-zinc-300 uppercase">Loading Collection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-black border-b border-zinc-900">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span>BACK</span>
            </Link>

            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                {collection.title}
              </h1>
              <p className="text-xs tracking-[0.3em] text-zinc-300 mt-1">
                {resultLabel}{matchHint}
              </p>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors"
            >
              {showFilters ? 'HIDE' : 'FILTER'}
            </button>
          </div>

          <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-zinc-900 text-center">
            <p className="text-sm tracking-wider text-zinc-400 uppercase">
              {collection.subtitle}
            </p>
            <p className="text-xs tracking-widest text-zinc-300 mt-2">
              {collection.description}
            </p>
          </div>

          {/* Quick body-style filters + view toggle */}
          <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-zinc-900">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {bodyStyleOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {bodyStyleOptions.map((style) => {
                    const active = selectedBodyStyles.includes(style);
                    const count = allCars.filter((c) => c.bodyStyle === style).length;
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() =>
                          setSelectedBodyStyles((prev) =>
                            prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style],
                          )
                        }
                        className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] border rounded-full transition-colors ${
                          active
                            ? 'bg-white text-black border-white'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-white'
                        }`}
                      >
                        {style} ({count})
                      </button>
                    );
                  })}
                  {selectedBodyStyles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedBodyStyles([])}
                      className="px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-zinc-500 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {isCurated && (
                <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('models')}
                    className={`px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] transition-colors ${
                      viewMode === 'models' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Top models
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className={`px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] transition-colors ${
                      viewMode === 'all' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    All trims
                  </button>
                </div>
              )}
            </div>

            {isCurated && viewMode === 'models' && (
              <p className="text-[11px] tracking-[0.2em] text-zinc-500 mt-4 text-center uppercase">
                One best pick per model, ranked by value · switch to all trims for every year &amp; variant
              </p>
            )}
          </div>

          {showFilters && (
            <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-zinc-900">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs tracking-widest text-zinc-300 mb-2">SEARCH</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Make, model, year..."
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-zinc-300 mb-2">SORT BY</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  >
                    {isCurated && <option value="value">BEST MATCH</option>}
                    <option value="year">YEAR</option>
                    <option value="mpg">MPG</option>
                    <option value="name">NAME</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-zinc-300 mb-2">ORDER</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="desc">HIGH TO LOW</option>
                    <option value="asc">LOW TO HIGH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-zinc-300 mb-2">FUEL TYPE</label>
                  <select
                    value={fuelTypeFilter}
                    onChange={(e) => setFuelTypeFilter(e.target.value as FuelTypeFilter)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="all">ALL VEHICLES</option>
                    <option value="gasoline">GAS + HYBRID</option>
                    <option value="gasoline-only">GAS ONLY</option>
                    <option value="hybrid">HYBRID ONLY</option>
                    <option value="electric">ELECTRIC ONLY</option>
                  </select>
                </div>
              </div>

              {fuelTypeFilter === 'gasoline' && (
                <div className="mt-4 p-3 bg-zinc-950 border border-zinc-900">
                  <p className="text-xs text-zinc-400 text-center tracking-widest uppercase">
                    EVs excluded from fuel economy filtering (MPGe ≠ MPG)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-8 px-8 pb-16">
        {filteredCars.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-2xl font-light tracking-wider text-zinc-300 uppercase mb-4">
              No vehicles found
            </p>
            {(searchTerm || selectedBodyStyles.length > 0) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBodyStyles([]);
                }}
                className="text-xs tracking-widest text-zinc-400 hover:text-white transition-colors"
              >
                CLEAR FILTERS
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <AggregateStats cars={filteredCars} title={collection.title} />
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 text-[11px] tracking-[0.25em] text-zinc-400">
              <div>
                SHOWING {startIndex + 1}–{Math.min(endIndex, filteredCars.length)} OF {filteredCars.length}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase">Per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value) || 24);
                      setCurrentPage(1);
                    }}
                    className="bg-black border border-zinc-800 px-2 py-1 text-[10px] tracking-[0.25em] focus:outline-none focus:border-zinc-600"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={clampedCurrentPage === 1}
                    className="px-3 py-1 border border-zinc-800 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-[10px] text-zinc-400">
                    {clampedCurrentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={clampedCurrentPage === totalPages}
                    className="px-3 py-1 border border-zinc-800 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
              {pageCars.map((car, index) => {
                const globalIndex = startIndex + index;
                const segment = allCars.length > 0 ? getSegment(car, allCars) : [];
                const dealRating = segment.length >= 5 ? getDealRating(car, segment) : null;
                const showRankBadge = isCurated && sortBy === 'value' && globalIndex < 3;

                return (
                  <div
                    key={car.id}
                    onClick={() => navigate(`/car/${car.id}`)}
                    className="bg-black p-8 hover:bg-zinc-950 transition-all duration-300 cursor-pointer group border border-zinc-900 hover:border-zinc-700 relative"
                  >
                    {dealRating && (
                      <div
                        className="absolute top-4 left-4 px-3 py-1.5 text-xs font-black tracking-wider border-2"
                        style={{
                          backgroundColor: `${getDealRatingColor(dealRating)}20`,
                          color: getDealRatingColor(dealRating),
                          borderColor: getDealRatingColor(dealRating),
                        }}
                      >
                        {getDealRatingLabel(dealRating)}
                      </div>
                    )}

                    {showRankBadge && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-white text-black px-3 py-1 text-xs font-black tracking-widest">
                          #{globalIndex + 1}
                        </div>
                      </div>
                    )}

                    <div className="mb-6 pr-20">
                      <p className="text-[11px] font-medium tracking-[0.3em] text-zinc-500 uppercase mb-2">
                        {car.year}
                      </p>
                      <h3 className="text-2xl font-black tracking-tight leading-none mb-1 group-hover:tracking-wide transition-all">
                        {car.make.toUpperCase()}
                      </h3>
                      <p className="text-lg font-light tracking-wide text-zinc-300 group-hover:text-white transition-colors">
                        {car.model}
                      </p>
                      {displayListingSubtitle(car) && (
                        <p className="text-sm text-zinc-400 mt-1">{displayListingSubtitle(car)}</p>
                      )}
                    </div>

                    <div className="h-px bg-zinc-900 group-hover:bg-zinc-700 transition-colors mb-6" />

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">Power</p>
                        <p className={cardStatClass(formatPowerForCard(car.engine.horsepower))}>
                          {formatPowerForCard(car.engine.horsepower)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">
                          {usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG'}
                        </p>
                        <p className={cardStatClass(formatMpgForCard(car.fuelEconomy.combined))}>
                          {formatMpgForCard(car.fuelEconomy.combined)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">Engine</p>
                        <p className={cardStatClass(formatEngineDetailForCard(car.engine))}>
                          {formatEngineDetailForCard(car.engine)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">Trans</p>
                        <p className={cardStatClass(
                          car.transmission?.type
                            ? formatTransmissionLabel(car.transmission, car.trim)
                            : '—',
                        )}>
                          {car.transmission?.type
                            ? formatTransmissionLabel(car.transmission, car.trim)
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 mb-4">
                      Est. value {formatPriceShort(car.price?.msrp, car.price?.isEstimated)}
                    </p>

                    <div className="flex items-center gap-2 text-xs tracking-widest text-zinc-300 group-hover:text-white transition-all">
                      <span>VIEW</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
