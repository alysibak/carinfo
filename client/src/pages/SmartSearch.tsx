import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import * as api from '../services/api';
import type { CarSpecs, SearchQuery } from '../types/car.types';
import { getDealRating, getDealRatingColor, getDealRatingLabel, getSegment, filterCarsByFuelType, calculateReliabilityScore, type FuelTypeFilter } from '../utils/marketIntelligence';
import AggregateStats from '../components/AggregateStats';

type SmartSort = 'best-value' | 'bang-for-buck' | 'lowest-tco' | 'daily-driver' | 'weekend' | 'resale' | 'eco' | 'track';

const PAGE_SIZE = 50;

export default function SmartSearch() {
  const [searchParams] = useSearchParams();
  const [allCars, setAllCars] = useState<CarSpecs[]>([]);
  const [filteredCars, setFilteredCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [smartSort, setSmartSort] = useState<SmartSort>('best-value');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fuelTypeFilter, setFuelTypeFilter] = useState<FuelTypeFilter>('gasoline');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const navigate = useNavigate();

  // Get persona from URL params
  const persona = searchParams.get('persona') as 'commuter' | 'gearhead' | 'family' | 'work' | null;
  const minPrice = parseInt(searchParams.get('minPrice') || '0');
  const maxPrice = parseInt(searchParams.get('maxPrice') || '999999');
  const priority = searchParams.get('priority') as 'mpg' | 'power' | 'safety' | 'space' | null;
  const usage = searchParams.get('usage') as 'commute' | 'family' | 'fun' | 'work' | null;

  useEffect(() => {
    loadVehicles();
  }, [persona, minPrice, maxPrice]);

  useEffect(() => {
    applySmartSort();
    setVisibleCount(PAGE_SIZE);
  }, [allCars, smartSort, searchTerm, fuelTypeFilter]);

  const loadVehicles = async () => {
    setLoading(true);
    setError(null);

    try {
      // Base filters from persona quiz URL params
      const baseFilters: SearchQuery['filters'] = {
        price: { min: minPrice, max: maxPrice },
      };

      // Persona-based defaults
      if (persona === 'commuter') {
        baseFilters.fuelEconomy = { min: 25 };
      } else if (persona === 'gearhead') {
        baseFilters.horsepower = { min: 250 };
      } else if (persona === 'family') {
        baseFilters.bodyStyle = ['suv', 'minivan', 'wagon'];
      } else if (persona === 'work') {
        baseFilters.bodyStyle = ['truck'];
        baseFilters.driveType = ['AWD'];
      }

      // Priority-based overrides (can tighten persona filters)
      if (priority === 'mpg') {
        baseFilters.fuelEconomy = { min: 30 };
      } else if (priority === 'power') {
        baseFilters.horsepower = { min: 300 };
      } else if (priority === 'safety') {
        baseFilters.bodyStyle = ['suv', 'minivan', 'wagon', 'sedan'];
      } else if (priority === 'space') {
        baseFilters.bodyStyle = ['suv', 'minivan', 'wagon'];
      }

      // Usage-based hints (light-touch adjustments layered on top)
      if (usage === 'commute') {
        baseFilters.fuelEconomy = {
          min: Math.max(baseFilters.fuelEconomy?.min || 0, 28),
        };
      } else if (usage === 'family') {
        baseFilters.bodyStyle = baseFilters.bodyStyle || ['suv', 'minivan', 'wagon'];
      } else if (usage === 'fun') {
        baseFilters.horsepower = {
          min: Math.max(baseFilters.horsepower?.min || 0, 300),
        };
      } else if (usage === 'work') {
        baseFilters.bodyStyle = baseFilters.bodyStyle || ['truck', 'van'];
        baseFilters.driveType = baseFilters.driveType || ['AWD'];
      }

      const initialQuery: SearchQuery = {
        filters: baseFilters,
        sort: { field: 'year', order: 'desc' },
        limit: 500,
      };

      let results = await api.searchCars(initialQuery);

      // If the persona/priority combo is too strict and returns nothing,
      // gracefully relax filters so the user never hits a dead-end screen.
      if (results.total === 0 && (persona || priority)) {
        const relaxedFilters: SearchQuery['filters'] = {
          price: {
            min: Math.max(0, Math.floor(minPrice * 0.8)),
            max: maxPrice && maxPrice < 999999
              ? Math.max(maxPrice, minPrice > 0 ? Math.floor(minPrice * 1.5) : maxPrice)
              : maxPrice,
          },
        };

        const relaxedQuery: SearchQuery = {
          filters: relaxedFilters,
          sort: { field: 'year', order: 'desc' },
          limit: 500,
        };

        console.warn('SmartSearch: relaxing persona/priority filters due to empty results.', {
          initialFilters: baseFilters,
          relaxedFilters,
        });

        results = await api.searchCars(relaxedQuery);
      }

      setAllCars(results.results);
    } catch (error) {
      console.error('SmartSearch load failed:', error);
      setAllCars([]);
      setError('Unable to load smart search results right now.');
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = useCallback((car: CarSpecs, algorithm: SmartSort): number => {
    const price = car.price?.msrp || 50000;
    const hp = car.engine.horsepower;
    const mpg = car.fuelEconomy.combined || 20;
    const safety = car.safetyRating?.overall || 3;
    const reliability = calculateReliabilityScore(car) / 20;
    const zeroToSixty = car.performance.zeroToSixty || 8;

    switch (algorithm) {
      case 'best-value':
        return (reliability * mpg * safety) / (price / 10000);

      case 'bang-for-buck':
        return hp / (price / 1000);

      case 'lowest-tco': {
        const fuelCostPerYear = (15000 / mpg) * 3.5;
        const maintenanceCostPerYear = 1000;
        const insuranceCostPerYear = price * 0.01;
        const tco = price + (fuelCostPerYear + maintenanceCostPerYear + insuranceCostPerYear) * 5;
        return 1000000 / tco;
      }

      case 'daily-driver':
        return mpg * reliability * (car.dimensions.length / 100);

      case 'weekend': {
        const funFactor = ['coupe', 'convertible'].includes(car.bodyStyle) ? 1.5 : 1;
        return hp * (10 / zeroToSixty) * funFactor;
      }

      case 'resale': {
        const luxuryBrands = ['Mercedes-Benz', 'BMW', 'Audi', 'Lexus', 'Porsche'];
        const prestige = luxuryBrands.includes(car.make) ? 1.5 : 1;
        const ageFactor = Math.max(0, 10 - (2025 - car.year)) / 10;
        return prestige * ageFactor * reliability * 100;
      }

      case 'eco': {
        const electricBonus = car.engine.fuelType === 'electric' ? 2 : car.engine.fuelType === 'hybrid' ? 1.5 : 1;
        return mpg * electricBonus * 10;
      }

      case 'track': {
        const weight = car.dimensions.curbWeight;
        const weightFactor = 5000 / weight;
        return hp * (10 / zeroToSixty) * weightFactor;
      }

      default:
        return 0;
    }
  }, []);

  const applySmartSort = () => {
    let filtered = [...allCars];

    // Apply fuel type filter
    filtered = filterCarsByFuelType(filtered, fuelTypeFilter);

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(car =>
        car.make.toLowerCase().includes(term) ||
        car.model.toLowerCase().includes(term) ||
        car.year.toString().includes(term)
      );
    }

    // Apply smart sorting
    filtered.sort((a, b) => {
      const scoreA = calculateScore(a, smartSort);
      const scoreB = calculateScore(b, smartSort);
      return scoreB - scoreA;
    });

    setFilteredCars(filtered);
  };

  // Memoize scores so render doesn't recompute them
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const car of filteredCars) {
      map.set(car.id, calculateScore(car, smartSort));
    }
    return map;
  }, [filteredCars, smartSort, calculateScore]);

  // Compute deal ratings only for the visible page of cars, using the filtered
  // results as the segment pool (avoids loading the entire database).
  const dealRatingMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getDealRating> | null>();
    const visible = filteredCars.slice(0, visibleCount);
    for (const car of visible) {
      const segment = getSegment(car, filteredCars);
      map.set(car.id, segment.length >= 5 ? getDealRating(car, segment) : null);
    }
    return map;
  }, [filteredCars, visibleCount]);

  const visibleCars = useMemo(
    () => filteredCars.slice(0, visibleCount),
    [filteredCars, visibleCount],
  );

  const getPersonaTitle = () => {
    if (persona === 'commuter') return 'THE COMMUTER';
    if (persona === 'gearhead') return 'THE GEARHEAD';
    if (persona === 'family') return 'THE FAMILY BUYER';
    return 'SMART SEARCH';
  };

  const getPersonaSubtitle = () => {
    if (persona === 'commuter') return 'Efficiency meets reliability';
    if (persona === 'gearhead') return 'Performance without compromise';
    if (persona === 'family') return 'Safety and space first';
    return 'Personalized results';
  };

  const smartSortOptions = [
    { value: 'best-value', label: 'BEST VALUE', desc: 'Quality per dollar' },
    { value: 'bang-for-buck', label: 'BANG FOR BUCK', desc: 'Power per dollar' },
    { value: 'lowest-tco', label: 'LOWEST TCO', desc: '5-year total cost' },
    { value: 'daily-driver', label: 'DAILY DRIVER', desc: 'Comfort & efficiency' },
    { value: 'weekend', label: 'WEEKEND WARRIOR', desc: 'Maximum fun' },
    { value: 'resale', label: 'RESALE CHAMPION', desc: 'Keep value longer' },
    { value: 'eco', label: 'ECO WARRIOR', desc: 'Planet-friendly' },
    { value: 'track', label: 'TRACK READY', desc: 'Performance focus' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-xs tracking-[0.3em] text-zinc-700 uppercase">Finding Your Perfect Match</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <div className="inline-block w-16 h-16 border-2 border-zinc-800 border-t-red-500 rounded-full animate-spin mb-4" />
          <p className="text-sm tracking-[0.3em] text-zinc-600 uppercase mb-4">
            SMART SEARCH UNAVAILABLE
          </p>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={loadVehicles}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-white text-black text-xs tracking-[0.3em] font-semibold hover:bg-zinc-200 transition"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-900">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span>BACK</span>
            </Link>

            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                {getPersonaTitle()}
              </h1>
              <p className="text-xs tracking-[0.3em] text-zinc-700 mt-1">
                {filteredCars.length} MATCHED
              </p>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors"
            >
              {showFilters ? 'HIDE' : 'REFINE'}
            </button>
          </div>

          {/* Persona Description */}
          <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-zinc-900 text-center">
            <p className="text-sm tracking-wider text-zinc-600 uppercase">
              {getPersonaSubtitle()}
            </p>
            <p className="text-xs tracking-widest text-zinc-700 mt-2">
              Budget: ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}
              {priority && ` • Priority: ${priority.toUpperCase()}`}
            </p>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-zinc-900">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-xs tracking-widest text-zinc-700 mb-2">SEARCH</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Make, model, year..."
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>

                {/* Smart Sort */}
                <div>
                  <label className="block text-xs tracking-widest text-zinc-700 mb-2">SMART SORT</label>
                  <select
                    value={smartSort}
                    onChange={(e) => setSmartSort(e.target.value as SmartSort)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  >
                    {smartSortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} — {option.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fuel Type Filter */}
                <div>
                  <label className="block text-xs tracking-widest text-zinc-700 mb-2">FUEL TYPE</label>
                  <select
                    value={fuelTypeFilter}
                    onChange={(e) => setFuelTypeFilter(e.target.value as FuelTypeFilter)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="all">ALL VEHICLES</option>
                    <option value="gasoline">GASOLINE + HYBRID</option>
                    <option value="gasoline-only">GASOLINE ONLY</option>
                    <option value="hybrid">HYBRID ONLY</option>
                    <option value="electric">ELECTRIC ONLY</option>
                  </select>
                </div>
              </div>

              {/* Filter Descriptions */}
              <div className="mt-4 p-4 bg-zinc-950 border border-zinc-900 space-y-2">
                <p className="text-xs tracking-widest text-zinc-600 text-center">
                  {smartSortOptions.find(o => o.value === smartSort)?.desc.toUpperCase()}
                </p>
                {fuelTypeFilter === 'gasoline' && (
                  <p className="text-xs text-blue-400 text-center">
                    💡 EVs excluded from fuel economy filtering (MPGe ≠ MPG)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content with padding for fixed header */}
      <div className={`${showFilters ? 'pt-96' : 'pt-56'} px-8 pb-16 transition-all duration-300`}>
        {filteredCars.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-2xl font-light tracking-wider text-zinc-700 uppercase mb-4">
              No vehicles matched your criteria
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs tracking-widest text-zinc-600 hover:text-white transition-colors"
              >
                CLEAR SEARCH
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Aggregate Stats */}
            <div className="mb-8">
              <AggregateStats cars={filteredCars} title="MATCHED RESULTS" />
            </div>

            {/* Smart Sort Indicator */}
            <div className="mb-8 text-center">
              <p className="text-xs tracking-[0.3em] text-zinc-700 uppercase mb-2">
                Sorted by: {smartSortOptions.find(o => o.value === smartSort)?.label}
              </p>
              <div className="h-px w-64 bg-gradient-to-r from-transparent via-zinc-800 to-transparent mx-auto" />
            </div>

            {/* Grid of vehicles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
              {visibleCars.map((car, index) => {
                const score = scoreMap.get(car.id) ?? 0;
                const dealRating = dealRatingMap.get(car.id) ?? null;

                return (
                  <div
                    key={car.id}
                    onClick={() => navigate(`/car/${car.id}`)}
                    className="bg-black p-8 hover:bg-zinc-950 transition-all duration-300 cursor-pointer group border border-zinc-900 hover:border-zinc-700 relative"
                  >
                    {/* Deal Rating Badge (Top-Left) */}
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

                    {/* Top 3 Badge (Top-Right) */}
                    {index < 3 && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-white text-black px-3 py-1 text-xs font-black tracking-widest">
                          #{index + 1}
                        </div>
                      </div>
                    )}

                    {/* Year */}
                    <div className="mb-4">
                      <p className="text-5xl font-black text-zinc-700 group-hover:text-zinc-600 transition-colors">
                        {car.year}
                      </p>
                    </div>

                    {/* Make & Model */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-black tracking-tight mb-1 group-hover:tracking-wide transition-all">
                        {car.make.toUpperCase()}
                      </h3>
                      <p className="text-lg font-light tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">
                        {car.model}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-zinc-900 group-hover:bg-zinc-700 transition-colors mb-6" />

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">Power</p>
                        <p className="text-lg font-bold">{car.engine.horsepower}<span className="text-xs text-zinc-600 ml-1">HP</span></p>
                      </div>
                      <div>
                        <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">MPG</p>
                        <p className="text-lg font-bold">{car.fuelEconomy.combined || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">Safety</p>
                        <p className="text-lg font-bold">{car.safetyRating?.overall || 'N/A'}/5</p>
                      </div>
                      <div>
                        <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">Score</p>
                        <p className="text-lg font-bold">{score.toFixed(0)}</p>
                      </div>
                    </div>

                    {/* View Arrow */}
                    <div className="flex items-center gap-2 text-xs tracking-widest text-zinc-700 group-hover:text-white transition-all">
                      <span>VIEW</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {visibleCount < filteredCars.length && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                  className="px-8 py-3 border border-zinc-800 text-xs tracking-[0.3em] text-zinc-500 hover:text-white hover:border-zinc-600 transition-all uppercase"
                >
                  Load More ({filteredCars.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
