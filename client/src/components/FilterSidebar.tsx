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
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Filters</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Clear All
        </button>
      </div>

      {/* Year Range */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Year</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            className="border rounded px-3 py-2"
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
            className="border rounded px-3 py-2"
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
        <h3 className="font-semibold text-gray-700 mb-2">Make</h3>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {availableMakes.map((make) => (
            <label key={make} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={(filters.make || []).includes(make)}
                onChange={() => handleArrayFilterToggle('make', make)}
                className="rounded text-blue-600"
              />
              <span className="text-sm">{make}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Body Style */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Body Style</h3>
        <div className="space-y-1">
          {bodyStyles.map((style) => (
            <label key={style} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={(filters.bodyStyle || []).includes(style)}
                onChange={() => handleArrayFilterToggle('bodyStyle', style)}
                className="rounded text-blue-600"
              />
              <span className="text-sm capitalize">{style}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Fuel Type */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Fuel Type</h3>
        <div className="space-y-1">
          {fuelTypes.map((type) => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={(filters.fuelType || []).includes(type)}
                onChange={() => handleArrayFilterToggle('fuelType', type)}
                className="rounded text-blue-600"
              />
              <span className="text-sm capitalize">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Transmission Type */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Transmission</h3>
        <div className="space-y-1">
          {transmissionTypes.map((type) => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={(filters.transmission || []).includes(type)}
                onChange={() => handleArrayFilterToggle('transmission', type)}
                className="rounded text-blue-600"
              />
              <span className="text-sm capitalize">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Drive Type */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Drive Type</h3>
        <div className="space-y-1">
          {driveTypes.map((type) => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={(filters.driveType || []).includes(type)}
                onChange={() => handleArrayFilterToggle('driveType', type)}
                className="rounded text-blue-600"
              />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Country */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Country of Origin</h3>
        <div className="space-y-1">
          {countries.map((country) => (
            <label key={country} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={(filters.countryOfOrigin || []).includes(country)}
                onChange={() => handleArrayFilterToggle('countryOfOrigin', country)}
                className="rounded text-blue-600"
              />
              <span className="text-sm">{country}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Horsepower Range */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Horsepower</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            className="border rounded px-3 py-2"
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
            className="border rounded px-3 py-2"
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
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
      >
        Apply Filters
      </button>
    </div>
  );
}
