import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs, SearchQuery } from '../types/car.types';
import { getDealRating, getDealRatingColor, getDealRatingLabel, getSegment } from '../utils/marketIntelligence';

type SmartSort = 'best-value' | 'bang-for-buck' | 'lowest-tco' | 'daily-driver' | 'weekend' | 'resale' | 'eco' | 'track';

export default function SmartSearch() {
  const [searchParams] = useSearchParams();
  const [allCars, setAllCars] = useState<CarSpecs[]>([]);
  const [allDatabaseCars, setAllDatabaseCars] = useState<CarSpecs[]>([]);
  const [filteredCars, setFilteredCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [smartSort, setSmartSort] = useState<SmartSort>('best-value');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  // Get persona from URL params
  const persona = searchParams.get('persona') as 'commuter' | 'gearhead' | 'family' | null;
  const minPrice = parseInt(searchParams.get('minPrice') || '0');
  const maxPrice = parseInt(searchParams.get('maxPrice') || '999999');
  const priority = searchParams.get('priority') as 'mpg' | 'power' | 'safety' | 'space' | null;

  useEffect(() => {
    loadVehicles();
    loadAllDatabaseCars();
  }, [persona, minPrice, maxPrice]);

  useEffect(() => {
    applySmartSort();
  }, [allCars, smartSort, searchTerm]);

  const loadAllDatabaseCars = async () => {
    try {
      const results = await api.searchCars({ limit: 15000 });
      setAllDatabaseCars(results.results);
    } catch (error) {
      console.error('Failed to load all database cars:', error);
    }
  };

  const loadVehicles = async () => {
    setLoading(true);

    const query: SearchQuery = {
      filters: {
        price: { min: minPrice, max: maxPrice },
      },
      sort: { field: 'year', order: 'desc' },
      limit: 10000,
    };

    // Apply persona-based filters
    if (persona === 'commuter') {
      query.filters!.fuelEconomy = { min: 25 };
    } else if (persona === 'gearhead') {
      query.filters!.horsepower = { min: 250 };
    } else if (persona === 'family') {
      query.filters!.bodyStyle = ['suv', 'minivan', 'wagon'];
    }

    // Apply priority filters
    if (priority === 'mpg') {
      query.filters!.fuelEconomy = { min: 30 };
    } else if (priority === 'power') {
      query.filters!.horsepower = { min: 300 };
    } else if (priority === 'safety') {
      // Filter for family-friendly vehicles with safety in mind
      query.filters!.bodyStyle = ['suv', 'minivan', 'wagon', 'sedan'];
    } else if (priority === 'space') {
      query.filters!.bodyStyle = ['suv', 'minivan', 'wagon'];
    }

    const results = await api.searchCars(query);
    setAllCars(results.results);
    setLoading(false);
  };

  const calculateScore = (car: CarSpecs, algorithm: SmartSort): number => {
    const price = car.price?.msrp || 50000;
    const hp = car.engine.horsepower;
    const mpg = car.fuelEconomy.combined || 20;
    const safety = car.safetyRating?.overall || 3;
    const reliability = 4; // Would come from reliability database
    const zeroToSixty = car.performance.zeroToSixty || 8;

    switch (algorithm) {
      case 'best-value':
        // (Reliability × MPG × Safety) ÷ Price
        return (reliability * mpg * safety) / (price / 10000);

      case 'bang-for-buck':
        // HP ÷ Price
        return hp / (price / 1000);

      case 'lowest-tco':
        // 5-year Total Cost of Ownership (simplified)
        const fuelCostPerYear = (15000 / mpg) * 3.5; // 15k miles/year at $3.5/gal
        const maintenanceCostPerYear = 1000;
        const insuranceCostPerYear = price * 0.01; // 1% of price
        const tco = price + (fuelCostPerYear + maintenanceCostPerYear + insuranceCostPerYear) * 5;
        return 1000000 / tco; // Inverse so lower TCO = higher score

      case 'daily-driver':
        // MPG × Reliability × Comfort (simplified)
        return mpg * reliability * (car.dimensions.length / 100);

      case 'weekend':
        // HP × (1 / 0-60 time) × Fun Factor
        const funFactor = ['coupe', 'convertible', 'sports car'].includes(car.bodyStyle) ? 1.5 : 1;
        return hp * (10 / zeroToSixty) * funFactor;

      case 'resale':
        // Brand Prestige × Age Factor × Reliability
        const luxuryBrands = ['Mercedes-Benz', 'BMW', 'Audi', 'Lexus', 'Porsche'];
        const prestige = luxuryBrands.includes(car.make) ? 1.5 : 1;
        const ageFactor = Math.max(0, 10 - (2025 - car.year)) / 10;
        return prestige * ageFactor * reliability * 100;

      case 'eco':
        // MPG × (Electric Bonus) × Emissions (simplified)
        const electricBonus = car.engine.fuelType === 'electric' ? 2 : car.engine.fuelType === 'hybrid' ? 1.5 : 1;
        return mpg * electricBonus * 10;

      case 'track':
        // HP × (1 / 0-60) × Weight Factor
        const weight = car.dimensions.curbWeight;
        const weightFactor = 5000 / weight;
        return hp * (10 / zeroToSixty) * weightFactor;

      default:
        return 0;
    }
  };

  const applySmartSort = () => {
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

    // Apply smart sorting
    filtered.sort((a, b) => {
      const scoreA = calculateScore(a, smartSort);
      const scoreB = calculateScore(b, smartSort);
      return scoreB - scoreA; // Higher score first
    });

    setFilteredCars(filtered);
  };

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* Smart Sort Description */}
              <div className="mt-4 p-4 bg-zinc-950 border border-zinc-900">
                <p className="text-xs tracking-widest text-zinc-600 text-center">
                  {smartSortOptions.find(o => o.value === smartSort)?.desc.toUpperCase()}
                </p>
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
            {/* Smart Sort Indicator */}
            <div className="mb-8 text-center">
              <p className="text-xs tracking-[0.3em] text-zinc-700 uppercase mb-2">
                Sorted by: {smartSortOptions.find(o => o.value === smartSort)?.label}
              </p>
              <div className="h-px w-64 bg-gradient-to-r from-transparent via-zinc-800 to-transparent mx-auto" />
            </div>

            {/* Grid of vehicles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
              {filteredCars.map((car, index) => {
                const score = calculateScore(car, smartSort);
                const segment = allDatabaseCars.length > 0 ? getSegment(car, allDatabaseCars) : [];
                const dealRating = segment.length >= 5 ? getDealRating(car, segment) : null;

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
          </div>
        )}
      </div>
    </div>
  );
}
