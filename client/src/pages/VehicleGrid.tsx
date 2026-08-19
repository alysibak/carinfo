import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs, SearchQuery } from '../types/car.types';
import AggregateStats from '../components/AggregateStats';
import { cardStatClass, formatEngineDetailForCard, formatMpgForCard, formatPowerForCard } from '../utils/dataValue';
import { usesMpge } from '../utils/fuelDisplay';
import { formatTransmissionLabel } from '../utils/trimLabel';

export default function VehicleGrid() {
  const { category, subcategory } = useParams<{ category: string; subcategory: string }>();
  const [allCars, setAllCars] = useState<CarSpecs[]>([]);
  const [filteredCars, setFilteredCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'year' | 'mpg' | 'name'>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBodyStyles, setSelectedBodyStyles] = useState<string[]>([]);
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
  const [selectedDriveTypes, setSelectedDriveTypes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(36);

  useEffect(() => {
    loadVehicles();
  }, [category, subcategory]);

  useEffect(() => {
    applyFiltersAndSort();
    setCurrentPage(1);
  }, [allCars, sortBy, sortOrder, searchTerm, selectedBodyStyles, selectedFuelTypes, selectedDriveTypes]);

  const bodyStyleOptions = useMemo(
    () => Array.from(new Set(allCars.map((car) => car.bodyStyle))).sort(),
    [allCars]
  );

  const fuelTypeOptions = useMemo(
    () => Array.from(new Set(allCars.map((car) => car.engine.fuelType))).sort(),
    [allCars]
  );

  const driveTypeOptions = useMemo(
    () => Array.from(new Set(allCars.map((car) => car.driveType))).sort(),
    [allCars]
  );

  const loadVehicles = async () => {
    setLoading(true);

    try {
      const query: SearchQuery = {
        filters: {},
        sort: { field: 'year', order: 'desc' },
      };

      // Apply filters based on category and subcategory
      if (category === 'body-style') {
        query.filters!.bodyStyle = [subcategory!];
      } else if (category === 'brand') {
        query.filters!.make = [decodeURIComponent(subcategory!)];
      } else if (category === 'purpose') {
        if (subcategory === 'eco-friendly') {
          query.filters!.fuelType = ['electric', 'hybrid', 'plug-in hybrid'];
        } else if (subcategory === 'performance') {
          // EPA data has no horsepower — large displacement is the proxy
          query.filters!.displacement = { min: 3.5 };
        } else if (subcategory === 'family') {
          query.filters!.bodyStyle = ['suv', 'minivan', 'wagon'];
        } else if (subcategory === 'off-road') {
          query.filters!.bodyStyle = ['suv', 'truck'];
          query.filters!.driveType = ['AWD', '4WD'];
        } else if (subcategory === 'luxury') {
          query.filters!.price = { min: 50000 };
        } else if (subcategory === 'daily-commute') {
          query.filters!.fuelEconomy = { min: 25 };
        }
      } else if (category === 'era') {
        const eraRanges: Record<string, { min: number; max: number }> = {
          '1990s': { min: 1995, max: 1999 },
          '2000s': { min: 2000, max: 2009 },
          '2010s': { min: 2010, max: 2019 },
          '2020s': { min: 2020, max: new Date().getFullYear() + 1 },
        };
        query.filters!.year = eraRanges[subcategory!];
      }

      const results = await api.searchAllCars(query);
      setAllCars(results.results);
    } catch (error) {
      console.error('Failed to load vehicle grid:', error);
      setAllCars([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...allCars];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(car =>
        car.make.toLowerCase().includes(term) ||
        car.model.toLowerCase().includes(term) ||
        car.year.toString().includes(term)
      );
    }

    // Apply quick facet filters
    if (selectedBodyStyles.length > 0) {
      const set = new Set(selectedBodyStyles);
      filtered = filtered.filter((car) => set.has(car.bodyStyle));
    }

    if (selectedFuelTypes.length > 0) {
      const set = new Set(selectedFuelTypes);
      filtered = filtered.filter((car) => set.has(car.engine.fuelType));
    }

    if (selectedDriveTypes.length > 0) {
      const set = new Set(selectedDriveTypes);
      filtered = filtered.filter((car) => set.has(car.driveType));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      if (sortBy === 'year') {
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

  const getCategoryTitle = () => {
    if (!subcategory) return '';
    return decodeURIComponent(subcategory).toUpperCase();
  };

  const totalPages = Math.max(1, Math.ceil(filteredCars.length / pageSize));
  const clampedCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (clampedCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageCars = filteredCars.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-2 border-zinc-800 border-t-zinc-500 mb-4 opacity-50" />
          <p className="text-xs tracking-[0.3em] text-zinc-300 uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sticky Header */}
      <div className="bg-black border-b border-zinc-900">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Link
              to={`/explore/${category}`}
              className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span>BACK</span>
            </Link>

            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                {getCategoryTitle()}
              </h1>
              <p className="text-xs tracking-[0.3em] text-zinc-300 mt-1">
                {filteredCars.length} OF {allCars.length} VEHICLES
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-2 text-[10px] tracking-[0.25em] text-zinc-400">
                <span>PER PAGE</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 36;
                    setPageSize(value);
                    setCurrentPage(1);
                  }}
                  className="bg-black border border-zinc-800 px-2 py-1 text-[10px] tracking-[0.25em] focus:outline-none focus:border-zinc-600"
                >
                  <option value={24}>24</option>
                  <option value={36}>36</option>
                  <option value={60}>60</option>
                </select>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors"
              >
                {showFilters ? 'HIDE FILTERS' : 'FILTERS'}
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-zinc-900">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Search */}
                <div className="space-y-2">
                  <label className="block text-xs tracking-widest text-zinc-300">SEARCH</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Make, model, year..."
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                  <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">
                    TYPE TO REFINE RESULTS
                  </p>
                </div>

                {/* Body Style */}
                <div className="space-y-2">
                  <label className="block text-xs tracking-widest text-zinc-300">BODY STYLE</label>
                  <div className="flex flex-wrap gap-2">
                    {bodyStyleOptions.map((style) => {
                      const active = selectedBodyStyles.includes(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() =>
                            setSelectedBodyStyles((prev) =>
                              prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
                            )
                          }
                          className={`px-3 py-1 text-[11px] uppercase tracking-[0.2em] border rounded-full transition-colors ${
                            active
                              ? 'bg-white text-black border-white'
                              : 'border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-white'
                          }`}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fuel Type */}
                <div className="space-y-2">
                  <label className="block text-xs tracking-widest text-zinc-300">FUEL</label>
                  <div className="flex flex-wrap gap-2">
                    {fuelTypeOptions.map((type) => {
                      const active = selectedFuelTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setSelectedFuelTypes((prev) =>
                              prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                            )
                          }
                          className={`px-3 py-1 text-[11px] uppercase tracking-[0.2em] border rounded-full transition-colors ${
                            active
                              ? 'bg-white text-black border-white'
                              : 'border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-white'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Drive Type + Sort */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs tracking-widest text-zinc-300">DRIVE</label>
                    <div className="flex flex-wrap gap-2">
                      {driveTypeOptions.map((drive) => {
                        const active = selectedDriveTypes.includes(drive);
                        return (
                          <button
                            key={drive}
                            type="button"
                            onClick={() =>
                              setSelectedDriveTypes((prev) =>
                                prev.includes(drive) ? prev.filter((d) => d !== drive) : [...prev, drive]
                              )
                            }
                            className={`px-3 py-1 text-[11px] uppercase tracking-[0.2em] border rounded-full transition-colors ${
                              active
                                ? 'bg-white text-black border-white'
                                : 'border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-white'
                            }`}
                          >
                            {drive}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] tracking-[0.25em] text-zinc-300 mb-1">SORT BY</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'year' | 'mpg' | 'name')}
                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-[11px] focus:outline-none focus:border-zinc-600 transition-colors"
                      >
                        <option value="year">YEAR</option>
                        <option value="mpg">MPG</option>
                        <option value="name">NAME</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] tracking-[0.25em] text-zinc-300 mb-1">ORDER</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-[11px] focus:outline-none focus:border-zinc-600 transition-colors"
                      >
                        <option value="desc">HIGH TO LOW</option>
                        <option value="asc">LOW TO HIGH</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBodyStyles([]);
                      setSelectedFuelTypes([]);
                      setSelectedDriveTypes([]);
                      setSearchTerm('');
                    }}
                    className="mt-1 text-[10px] uppercase tracking-[0.25em] text-zinc-400 hover:text-white"
                  >
                    CLEAR ALL
                  </button>
                </div>
              </div>
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
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs tracking-widest text-zinc-400 hover:text-white transition-colors"
              >
                CLEAR SEARCH
              </button>
            )}
          </div>
        ) : (
            <div className="max-w-7xl mx-auto">
              {/* Aggregate Stats */}
              <div className="mb-4 md:mb-6">
                <AggregateStats cars={filteredCars} title="CURRENT RESULTS" />
              </div>

              {/* Pagination summary */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 text-[11px] tracking-[0.25em] text-zinc-400">
                <div>
                  {filteredCars.length > 0 && (
                    <span>
                      SHOWING {startIndex + 1}-{Math.min(endIndex, filteredCars.length)} OF {filteredCars.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 md:hidden">
                    <span className="text-[10px] uppercase">PER PAGE</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const value = Number(e.target.value) || 36;
                        setPageSize(value);
                        setCurrentPage(1);
                      }}
                      className="bg-black border border-zinc-800 px-2 py-1 text-[10px] tracking-[0.25em] focus:outline-none focus:border-zinc-600"
                    >
                      <option value={24}>24</option>
                      <option value={36}>36</option>
                      <option value={60}>60</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={clampedCurrentPage === 1}
                      className="px-3 py-1 border border-zinc-800 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600 transition-colors"
                    >
                      PREV
                    </button>
                    <span className="text-[10px] text-zinc-400">
                      {clampedCurrentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={clampedCurrentPage === totalPages}
                      className="px-3 py-1 border border-zinc-800 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600 transition-colors"
                    >
                      NEXT
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid of vehicles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
                {pageCars.map((car) => (
                  <div
                    key={car.id}
                    className="bg-black p-8 hover:bg-zinc-950 transition-all duration-300 group border border-zinc-900 hover:border-zinc-700 focus-within:border-zinc-600 relative"
                  >
                  {/* Identity — model-forward, year demoted to a label */}
                  <div className="mb-6 pr-20">
                    <p className="text-[11px] font-medium tracking-[0.3em] text-zinc-400 uppercase mb-2">
                      {car.year}
                    </p>
                    <h3 className="text-2xl font-black tracking-tight leading-none mb-1 group-hover:tracking-wide transition-all">
                      <Link
                        to={`/car/${car.id}`}
                        className="after:absolute after:inset-0 focus:outline-none"
                      >
                        {car.make.toUpperCase()}
                      </Link>
                    </h3>
                    <p className="text-lg font-light tracking-wide text-zinc-300 group-hover:text-white transition-colors">
                      {car.model}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-zinc-900 group-hover:bg-zinc-700 transition-colors mb-6" />

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
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
                          : '-',
                      )}>
                        {car.transmission?.type
                          ? formatTransmissionLabel(car.transmission, car.trim)
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* View Arrow */}
                  <div className="flex items-center gap-2 text-xs tracking-widest text-zinc-300 group-hover:text-white transition-all">
                    <span>VIEW</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  </div>
                ))}
              </div>
            </div>
        )}
      </div>
    </div>
  );
}
