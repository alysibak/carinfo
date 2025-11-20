import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs, SearchQuery } from '../types/car.types';

interface CollectionConfig {
  title: string;
  subtitle: string;
  description: string;
  query: SearchQuery;
}

const collections: Record<string, CollectionConfig> = {
  'goldilocks': {
    title: 'THE GOLDILOCKS ZONE',
    subtitle: 'Just Right for Most People',
    description: 'Balanced price, efficiency, and safety for everyday drivers',
    query: {
      filters: {
        price: { min: 25000, max: 35000 },
        fuelEconomy: { min: 30 },
      },
      sort: { field: 'year', order: 'desc' },
      limit: 10000,
    },
  },
  'gas-savers': {
    title: 'BEST GAS SAVERS',
    subtitle: 'Fill Up Less, Save More',
    description: 'Maximum fuel efficiency without breaking the bank',
    query: {
      filters: {
        fuelEconomy: { min: 35 },
        price: { max: 40000 },
      },
      sort: { field: 'fuelEconomy', order: 'desc' },
      limit: 10000,
    },
  },
  'luxury-less': {
    title: 'LUXURY FOR LESS',
    subtitle: 'Premium Badge, Smart Price',
    description: 'High-end brands at accessible prices',
    query: {
      filters: {
        make: ['Mercedes-Benz', 'BMW', 'Audi', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Lincoln'],
        price: { max: 50000 },
        year: { min: 2015 },
      },
      sort: { field: 'year', order: 'desc' },
      limit: 10000,
    },
  },
  'family-fortress': {
    title: 'FAMILY FORTRESS',
    subtitle: 'Protect What Matters Most',
    description: 'Maximum safety, space, and peace of mind',
    query: {
      filters: {
        bodyStyle: ['suv', 'minivan'],
      },
      sort: { field: 'year', order: 'desc' },
      limit: 10000,
    },
  },
  'weekend-warriors': {
    title: 'WEEKEND WARRIORS',
    subtitle: 'Live for the Drive',
    description: 'Pure driving excitement for enthusiasts',
    query: {
      filters: {
        horsepower: { min: 300 },
        bodyStyle: ['coupe', 'convertible', 'sports car'],
      },
      sort: { field: 'horsepower', order: 'desc' },
      limit: 10000,
    },
  },
  'work-horses': {
    title: 'WORK HORSES',
    subtitle: 'Built to Work, Priced to Own',
    description: 'Serious capability for serious work',
    query: {
      filters: {
        bodyStyle: ['truck'],
        driveType: ['4WD', 'AWD'],
      },
      sort: { field: 'year', order: 'desc' },
      limit: 10000,
    },
  },
  'future-proof': {
    title: 'FUTURE-PROOF',
    subtitle: 'Drive Tomorrow, Today',
    description: 'Electric and hybrid vehicles leading the way',
    query: {
      filters: {
        fuelType: ['electric', 'hybrid', 'plug-in hybrid'],
        year: { min: 2018 },
      },
      sort: { field: 'year', order: 'desc' },
      limit: 10000,
    },
  },
};

export default function Collection() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [allCars, setAllCars] = useState<CarSpecs[]>([]);
  const [filteredCars, setFilteredCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'year' | 'horsepower' | 'name' | 'mpg'>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const collection = collectionId ? collections[collectionId] : null;

  useEffect(() => {
    if (collection) {
      loadVehicles();
    }
  }, [collectionId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [allCars, sortBy, sortOrder, searchTerm]);

  const loadVehicles = async () => {
    if (!collection) return;

    setLoading(true);
    const results = await api.searchCars(collection.query);
    setAllCars(results.results);
    setLoading(false);
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

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      if (sortBy === 'year') {
        compareValue = a.year - b.year;
      } else if (sortBy === 'horsepower') {
        compareValue = a.engine.horsepower - b.engine.horsepower;
      } else if (sortBy === 'mpg') {
        compareValue = (a.fuelEconomy.combined || 0) - (b.fuelEconomy.combined || 0);
      } else if (sortBy === 'name') {
        compareValue = `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredCars(filtered);
  };

  if (!collection) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-tighter mb-4 text-white">
            COLLECTION NOT FOUND
          </h2>
          <Link to="/" className="text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors">
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
          <p className="text-xs tracking-[0.3em] text-zinc-700 uppercase">Loading Collection</p>
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
                {collection.title}
              </h1>
              <p className="text-xs tracking-[0.3em] text-zinc-700 mt-1">
                {filteredCars.length} OF {allCars.length}
              </p>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors"
            >
              {showFilters ? 'HIDE' : 'FILTER'}
            </button>
          </div>

          {/* Collection Description */}
          <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-zinc-900 text-center">
            <p className="text-sm tracking-wider text-zinc-600 uppercase">
              {collection.subtitle}
            </p>
            <p className="text-xs tracking-widest text-zinc-700 mt-2">
              {collection.description}
            </p>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-zinc-900">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                {/* Sort By */}
                <div>
                  <label className="block text-xs tracking-widest text-zinc-700 mb-2">SORT BY</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="year">YEAR</option>
                    <option value="horsepower">POWER</option>
                    <option value="mpg">MPG</option>
                    <option value="name">NAME</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-xs tracking-widest text-zinc-700 mb-2">ORDER</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="desc">HIGH TO LOW</option>
                    <option value="asc">LOW TO HIGH</option>
                  </select>
                </div>

                {/* Quick Jump */}
                <div>
                  <label className="block text-xs tracking-widest text-zinc-700 mb-2">SMART SEARCH</label>
                  <button
                    onClick={() => navigate('/smart-search')}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-sm hover:border-zinc-600 transition-colors text-left"
                  >
                    USE PERSONA QUIZ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content with padding for fixed header */}
      <div className={`${showFilters ? 'pt-80' : 'pt-56'} px-8 pb-16 transition-all duration-300`}>
        {filteredCars.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-2xl font-light tracking-wider text-zinc-700 uppercase mb-4">
              No vehicles found
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
            {/* Grid of vehicles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
              {filteredCars.map((car) => (
                <div
                  key={car.id}
                  onClick={() => navigate(`/car/${car.id}`)}
                  className="bg-black p-8 hover:bg-zinc-950 transition-all duration-300 cursor-pointer group border border-zinc-900 hover:border-zinc-700"
                >
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
                      <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">Drive</p>
                      <p className="text-lg font-bold">{car.driveType}</p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">Type</p>
                      <p className="text-lg font-bold capitalize">{car.bodyStyle}</p>
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
