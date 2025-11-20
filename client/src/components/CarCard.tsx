import { useState } from 'react';
import type { CarSpecs } from '../types/car.types';
import { useCarStore } from '../stores/carStore';
import { getCarImageUrl } from '../utils/carImages';

interface CarCardProps {
  car: CarSpecs;
  showCompare?: boolean;
}

export default function CarCard({ car, showCompare = true }: CarCardProps) {
  const { comparedCars, addCarToComparison, removeCarFromComparison } = useCarStore();
  const isInComparison = comparedCars.some((c) => c.id === car.id);
  const [imageError, setImageError] = useState(false);

  const toggleComparison = () => {
    if (isInComparison) {
      removeCarFromComparison(car.id);
    } else {
      addCarToComparison(car);
    }
  };

  const imageUrl = getCarImageUrl(car.make, car.model, car.year);

  return (
    <div className="bg-slate-800 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-700 hover:border-blue-500 animate-fade-in group">
      {/* Car Image */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900">
        <img
          src={imageUrl}
          alt={`${car.year} ${car.make} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            if (!imageError) {
              setImageError(true);
              e.currentTarget.src = 'https://via.placeholder.com/400x300/1e293b/94a3b8?text=Car+Image';
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-blue-400 border border-blue-500/50">
          {car.year}
        </div>
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
            {car.make} {car.model}
          </h3>
          {car.trim && (
            <p className="text-sm text-slate-400 mt-1">{car.trim}</p>
          )}
          <p className="text-xs text-slate-500 mt-1 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {car.countryOfOrigin}
          </p>
        </div>

        {/* Key Specs */}
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Engine
            </span>
            <span className="font-semibold text-white">
              {car.engine.displacement}L {car.engine.configuration || car.engine.fuelType}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Power
            </span>
            <span className="font-semibold text-blue-400">{car.engine.horsepower} HP</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              0-60 mph
            </span>
            <span className="font-semibold text-white">
              {car.performance.zeroToSixty ? `${car.performance.zeroToSixty}s` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              MPG
            </span>
            <span className="font-semibold text-green-400">
              {car.fuelEconomy.combined || 'N/A'} combined
            </span>
          </div>
          {car.price?.msrp && (
            <div className="flex justify-between items-center pt-3">
              <span className="text-slate-400 font-medium">MSRP</span>
              <span className="font-bold text-lg text-green-400">
                ${car.price.msrp.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="px-3 py-1.5 bg-blue-600/20 text-blue-300 text-xs rounded-full border border-blue-500/30 font-medium">
            {car.bodyStyle}
          </span>
          <span className="px-3 py-1.5 bg-green-600/20 text-green-300 text-xs rounded-full border border-green-500/30 font-medium">
            {car.driveType}
          </span>
          <span className="px-3 py-1.5 bg-purple-600/20 text-purple-300 text-xs rounded-full border border-purple-500/30 font-medium">
            {car.engine.fuelType}
          </span>
        </div>

        {/* Compare Button */}
        {showCompare && (
          <button
            onClick={toggleComparison}
            className={`w-full mt-5 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
              isInComparison
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/50'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/50'
            }`}
          >
            {isInComparison ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Remove from Compare</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add to Compare</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
