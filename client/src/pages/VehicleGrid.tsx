import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs, SearchQuery } from '../types/car.types';

export default function VehicleGrid() {
  const { category, subcategory } = useParams<{ category: string; subcategory: string }>();
  const [cars, setCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadVehicles();
  }, [category, subcategory]);

  const loadVehicles = async () => {
    setLoading(true);

    const query: SearchQuery = {
      filters: {},
      sort: { field: 'year', order: 'desc' },
      limit: 50,
    };

    // Apply filters based on category and subcategory
    if (category === 'body-style') {
      query.filters!.bodyStyle = [subcategory!];
    } else if (category === 'brand') {
      query.filters!.make = [subcategory!.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')];
    } else if (category === 'purpose') {
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
        '2020s': { min: 2020, max: 2025 },
      };
      query.filters!.year = eraRanges[subcategory!];
    }

    const results = await api.searchCars(query);
    setCars(results.results);
    setLoading(false);
  };

  const getCategoryTitle = () => {
    return subcategory?.toUpperCase().replace(/-/g, ' ') || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-xs tracking-[0.3em] text-zinc-700 uppercase">Loading</p>
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
              to={`/explore/${category}`}
              className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors group"
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
              <p className="text-xs tracking-[0.3em] text-zinc-700 mt-1">
                {cars.length} AVAILABLE
              </p>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Content with padding for fixed header */}
      <div className="pt-32 px-8 pb-16">
        {cars.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-2xl font-light tracking-wider text-zinc-700 uppercase">
              No vehicles found
            </p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Grid of vehicles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
              {cars.map((car) => (
                <div
                  key={car.id}
                  onClick={() => navigate(`/car/${car.id}`)}
                  className="bg-black p-8 hover:bg-zinc-950 transition-all duration-300 cursor-pointer group border border-zinc-900 hover:border-zinc-700"
                >
                  {/* Year */}
                  <div className="mb-4">
                    <p className="text-5xl font-black text-zinc-900 group-hover:text-zinc-800 transition-colors">
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
                      <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">Engine</p>
                      <p className="text-lg font-bold">{car.engine.displacement}</p>
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
