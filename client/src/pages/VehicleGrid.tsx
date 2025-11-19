import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs, SearchQuery } from '../types/car.types';

export default function VehicleGrid() {
  const { category, subcategory } = useParams<{ category: string; subcategory: string }>();
  const [cars, setCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadVehicles();
  }, [category, subcategory]);

  const loadVehicles = async () => {
    setLoading(true);

    const query: SearchQuery = {
      filters: {},
      sort: { field: 'year', order: 'desc' },
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
      {/* Header Section */}
      <section className="h-screen flex flex-col items-center justify-center relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900 to-black opacity-50" />

        <div className="relative z-10 text-center px-8 max-w-6xl w-full">
          {/* Back Link */}
          <Link
            to={`/explore/${category}`}
            className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors mb-12 group"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>BACK</span>
          </Link>

          <div className="overflow-hidden mb-8">
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter">
              {getCategoryTitle()}
            </h1>
          </div>

          <div className="h-px w-48 bg-gradient-to-r from-transparent via-zinc-700 to-transparent mx-auto mb-8" />

          <p className="text-sm tracking-[0.3em] text-zinc-600 uppercase mb-8">
            {cars.length} Vehicles Available
          </p>

          {cars.length === 0 && (
            <div className="mt-12">
              <p className="text-2xl font-light tracking-wider text-zinc-700 uppercase">
                No vehicles found
              </p>
            </div>
          )}
        </div>

        {/* Scroll Indicator */}
        {cars.length > 0 && (
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-px h-16 bg-gradient-to-b from-white to-transparent" />
          </div>
        )}
      </section>

      {/* Vehicle List - Full Screen Sections */}
      {cars.map((car, index) => (
        <div
          key={car.id}
          onClick={() => navigate(`/car/${car.id}`)}
          className="block"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <section className="h-screen flex items-center justify-center relative overflow-hidden border-b border-zinc-800 group cursor-pointer">
            {/* Background Effect */}
            <div
              className={`absolute inset-0 bg-white transition-opacity duration-700 ${
                hoveredIndex === index ? 'opacity-5' : 'opacity-0'
              }`}
            />

            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }} />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-8 max-w-5xl">
              {/* Year */}
              <div className="mb-6">
                <p className="text-7xl md:text-8xl font-black text-zinc-900 group-hover:text-zinc-800 transition-colors duration-700">
                  {car.year}
                </p>
              </div>

              {/* Make & Model */}
              <div className="mb-8">
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter group-hover:tracking-wider transition-all duration-700 mb-2">
                  {car.make.toUpperCase()}
                </h2>
                <p className="text-3xl md:text-5xl font-light tracking-[0.2em] text-zinc-500 group-hover:text-zinc-400 transition-colors duration-700">
                  {car.model}
                </p>
              </div>

              {/* Divider */}
              <div className={`h-px w-96 mx-auto mb-8 transition-all duration-700 ${
                hoveredIndex === index
                  ? 'bg-gradient-to-r from-transparent via-white to-transparent'
                  : 'bg-gradient-to-r from-transparent via-zinc-800 to-transparent'
              }`} />

              {/* Specs */}
              <div className="grid grid-cols-3 gap-12 mb-8">
                <div>
                  <p className="text-xs tracking-[0.3em] text-zinc-700 mb-2 uppercase">Power</p>
                  <p className="text-2xl font-bold">{car.engine.horsepower}<span className="text-sm text-zinc-600 ml-1">HP</span></p>
                </div>
                <div>
                  <p className="text-xs tracking-[0.3em] text-zinc-700 mb-2 uppercase">Engine</p>
                  <p className="text-2xl font-bold">{car.engine.displacement}</p>
                </div>
                <div>
                  <p className="text-xs tracking-[0.3em] text-zinc-700 mb-2 uppercase">Drive</p>
                  <p className="text-2xl font-bold">{car.driveType}</p>
                </div>
              </div>

              {/* Enter Arrow */}
              <div className={`inline-flex items-center gap-4 text-xs tracking-[0.3em] transition-all duration-700 ${
                hoveredIndex === index ? 'text-white translate-x-4' : 'text-zinc-700 translate-x-0'
              }`}>
                <span>VIEW DETAILS</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </section>
        </div>
      ))}
    </div>
  );
}
