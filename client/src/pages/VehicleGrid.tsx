import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs, SearchQuery } from '../types/car.types';
import { getCarImageUrl } from '../utils/carImages';

export default function VehicleGrid() {
  const { category, subcategory } = useParams<{ category: string; subcategory: string }>();
  const [cars, setCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'year' | 'horsepower' | 'price'>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    loadVehicles();
  }, [category, subcategory, sortBy, sortOrder]);

  const loadVehicles = async () => {
    setLoading(true);

    const query: SearchQuery = {
      filters: {},
      sort: { field: sortBy, order: sortOrder },
      limit: 100,
    };

    // Apply filters based on category and subcategory
    if (category === 'body-style') {
      query.filters!.bodyStyle = [subcategory!];
    } else if (category === 'brand') {
      query.filters!.make = [subcategory!.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')];
    } else if (category === 'purpose') {
      // Map purposes to filters
      if (subcategory === 'eco-friendly') {
        query.filters!.fuelType = ['electric', 'hybrid', 'plug-in hybrid'];
      } else if (subcategory === 'performance') {
        query.filters!.horsepower = { min: 300 };
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
        '2020s': { min: 2020, max: 2024 },
      };
      query.filters!.year = eraRanges[subcategory!];
    }

    const results = await api.searchCars(query);
    setCars(results.results);
    setLoading(false);
  };

  const getCategoryPath = () => {
    const names: Record<string, Record<string, string>> = {
      'body-style': {
        'sedan': 'Sedans',
        'suv': 'SUVs',
        'truck': 'Trucks',
        'coupe': 'Coupes',
        'hatchback': 'Hatchbacks',
        'wagon': 'Wagons',
        'convertible': 'Convertibles',
        'minivan': 'Minivans',
      },
      'era': {
        '1990s': '1990s Classics',
        '2000s': '2000s Evolution',
        '2010s': '2010s Innovation',
        '2020s': '2020s Future',
      },
    };

    if (category === 'brand') {
      return subcategory!.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    return names[category!]?.[subcategory!] || subcategory;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-16 w-16 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div className="text-slate-400 text-xl">Loading vehicles...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb & Back */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to={`/explore/${category}`}
            className="inline-flex items-center text-slate-400 hover:text-white transition group"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'year' | 'horsepower' | 'price')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="year">Sort by Year</option>
              <option value="horsepower">Sort by Power</option>
              <option value="price">Sort by Price</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition"
            >
              {sortOrder === 'desc' ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {getCategoryPath()}
          </h1>
          <p className="text-xl text-slate-400">
            {cars.length} vehicles found
          </p>
        </div>

        {/* Vehicle Grid */}
        {cars.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cars.map((car, index) => (
              <div
                key={car.id}
                onClick={() => navigate(`/car/${car.id}`)}
                className="group cursor-pointer bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-700 hover:border-blue-500 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl animate-slide-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900">
                  <img
                    src={getCarImageUrl(car.make, car.model, car.year)}
                    alt={`${car.year} ${car.make} ${car.model}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>

                  {/* Year badge */}
                  <div className="absolute bottom-3 left-3 bg-blue-600 px-3 py-1 rounded-full text-white text-sm font-bold">
                    {car.year}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {car.make} {car.model}
                  </h3>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between text-slate-400">
                      <span>Engine</span>
                      <span className="text-white font-semibold">{car.engine.horsepower} HP</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>0-60 mph</span>
                      <span className="text-white font-semibold">
                        {car.performance.zeroToSixty ? `${car.performance.zeroToSixty}s` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <span className="text-slate-400">View Details</span>
                    <svg className="w-5 h-5 text-blue-400 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-white mb-2">No vehicles found</h2>
            <p className="text-slate-400">Try adjusting your selection</p>
          </div>
        )}
      </div>
    </div>
  );
}
