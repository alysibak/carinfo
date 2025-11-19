import type { CarSpecs } from '../types/car.types';
import { useCarStore } from '../stores/carStore';

interface CarCardProps {
  car: CarSpecs;
  showCompare?: boolean;
}

export default function CarCard({ car, showCompare = true }: CarCardProps) {
  const { comparedCars, addCarToComparison, removeCarFromComparison } = useCarStore();
  const isInComparison = comparedCars.some((c) => c.id === car.id);

  const toggleComparison = () => {
    if (isInComparison) {
      removeCarFromComparison(car.id);
    } else {
      addCarToComparison(car);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      {/* Car Image Placeholder */}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-48 flex items-center justify-center">
        <div className="text-6xl">🚗</div>
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-800">
            {car.year} {car.make} {car.model}
          </h3>
          {car.trim && (
            <p className="text-sm text-gray-600">{car.trim}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Made in {car.countryOfOrigin}
          </p>
        </div>

        {/* Key Specs */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Engine:</span>
            <span className="font-semibold">
              {car.engine.displacement}L {car.engine.configuration || car.engine.fuelType}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Power:</span>
            <span className="font-semibold">{car.engine.horsepower} HP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">0-60 mph:</span>
            <span className="font-semibold">
              {car.performance.zeroToSixty ? `${car.performance.zeroToSixty}s` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">MPG:</span>
            <span className="font-semibold">
              {car.fuelEconomy.combined || 'N/A'} combined
            </span>
          </div>
          {car.price?.msrp && (
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">MSRP:</span>
              <span className="font-bold text-green-600">
                ${car.price.msrp.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {car.bodyStyle}
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            {car.driveType}
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            {car.engine.fuelType}
          </span>
        </div>

        {/* Compare Button */}
        {showCompare && (
          <button
            onClick={toggleComparison}
            className={`w-full mt-4 py-2 rounded-lg font-semibold transition ${
              isInComparison
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isInComparison ? 'Remove from Compare' : 'Add to Compare'}
          </button>
        )}
      </div>
    </div>
  );
}
