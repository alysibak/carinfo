import { useState, useEffect } from 'react';
import { useCarStore } from '../stores/carStore';
import type { CarFilter } from '../types/car.types';

export default function FilterSidebar() {
  const { searchQuery, setSearchQuery, performSearch, availableMakes, loadMakes } = useCarStore();
  const [filters, setFilters] = useState<CarFilter>(searchQuery.filters || {});

  useEffect(() => {
    loadMakes();
  }, [loadMakes]);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleArrayFilterToggle = (key: string, value: string) => {
    const currentArray = (filters[key as keyof CarFilter] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value];
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const applyFilters = () => {
    setSearchQuery({ ...searchQuery, filters, offset: 0 });
    performSearch();
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery({ ...searchQuery, filters: {}, offset: 0 });
    performSearch();
  };

  const bodyStyles = ['sedan', 'suv', 'coupe', 'convertible', 'hatchback', 'wagon', 'truck'];
  const fuelTypes = ['gasoline', 'diesel', 'electric', 'hybrid', 'plug-in hybrid'];
  const transmissionTypes = ['manual', 'automatic', 'cvt', 'dual-clutch'];
  const driveTypes = ['FWD', 'RWD', 'AWD', '4WD'];
  const countries = ['USA', 'Japan', 'Germany', 'Italy', 'South Korea', 'UK', 'France'];

  return (
    <div className="bg-slate-800 rounded-xl shadow-2xl p-6 space-y-6 border border-slate-700 sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Filters
        </h2>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-400 hover:text-blue-300 transition font-medium"
        >
          Clear All
        </button>
      </div>

      {/* Year Range */}
      <div>
        <h3 className="font-semibold text-slate-200 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Year
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.year?.min || ''}
            onChange={(e) =>
              handleFilterChange('year', {
                ...filters.year,
                min: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Max"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.year?.max || ''}
            onChange={(e) =>
              handleFilterChange('year', {
                ...filters.year,
                max: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      {/* Make */}
      <div>
        <h3 className="font-semibold text-slate-200 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Make ({availableMakes.length})
        </h3>
        <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
          {availableMakes.map((make) => (
            <label key={make} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-700 p-2 rounded-lg transition">
              <input
                type="checkbox"
                checked={(filters.make || []).includes(make)}
                onChange={() => handleArrayFilterToggle('make', make)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">{make}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Body Style */}
      <div>
        <h3 className="font-semibold text-slate-200 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Body Style
        </h3>
        <div className="space-y-1">
          {bodyStyles.map((style) => (
            <label key={style} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-700 p-2 rounded-lg transition">
              <input
                type="checkbox"
                checked={(filters.bodyStyle || []).includes(style)}
                onChange={() => handleArrayFilterToggle('bodyStyle', style)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm capitalize text-slate-300">{style}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Fuel Type */}
      <div>
        <h3 className="font-semibold text-slate-200 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Fuel Type
        </h3>
        <div className="space-y-1">
          {fuelTypes.map((type) => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-700 p-2 rounded-lg transition">
              <input
                type="checkbox"
                checked={(filters.fuelType || []).includes(type)}
                onChange={() => handleArrayFilterToggle('fuelType', type)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm capitalize text-slate-300">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Transmission Type */}
      <div>
        <h3 className="font-semibold text-slate-200 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Transmission
        </h3>
        <div className="space-y-1">
          {transmissionTypes.map((type) => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-700 p-2 rounded-lg transition">
              <input
                type="checkbox"
                checked={(filters.transmission || []).includes(type)}
                onChange={() => handleArrayFilterToggle('transmission', type)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm capitalize text-slate-300">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Drive Type */}
      <div>
        <h3 className="font-semibold text-slate-200 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          Drive Type
        </h3>
        <div className="space-y-1">
          {driveTypes.map((type) => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-700 p-2 rounded-lg transition">
              <input
                type="checkbox"
                checked={(filters.driveType || []).includes(type)}
                onChange={() => handleArrayFilterToggle('driveType', type)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Country */}
      <div>
        <h3 className="font-semibold text-slate-200 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Country
        </h3>
        <div className="space-y-1">
          {countries.map((country) => (
            <label key={country} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-700 p-2 rounded-lg transition">
              <input
                type="checkbox"
                checked={(filters.countryOfOrigin || []).includes(country)}
                onChange={() => handleArrayFilterToggle('countryOfOrigin', country)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">{country}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Horsepower Range */}
      <div>
        <h3 className="font-semibold text-slate-200 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Horsepower
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.horsepower?.min || ''}
            onChange={(e) =>
              handleFilterChange('horsepower', {
                ...filters.horsepower,
                min: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Max"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.horsepower?.max || ''}
            onChange={(e) =>
              handleFilterChange('horsepower', {
                ...filters.horsepower,
                max: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      {/* Apply Filters Button */}
      <button
        onClick={applyFilters}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg shadow-blue-500/50 flex items-center justify-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Apply Filters</span>
      </button>
    </div>
  );
}
