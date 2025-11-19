import { useCarStore } from '../stores/carStore';
import type { CarSpecs } from '../types/car.types';

export default function Compare() {
  const { comparedCars, removeCarFromComparison, clearComparison } = useCarStore();

  if (comparedCars.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            No Cars to Compare
          </h2>
          <p className="text-gray-600">
            Add cars from the search page to start comparing
          </p>
        </div>
      </div>
    );
  }

  const specs = [
    { key: 'year', label: 'Year', getValue: (car: CarSpecs) => car.year },
    { key: 'country', label: 'Country', getValue: (car: CarSpecs) => car.countryOfOrigin },
    { key: 'bodyStyle', label: 'Body Style', getValue: (car: CarSpecs) => car.bodyStyle },
    { key: 'engine', label: 'Engine', getValue: (car: CarSpecs) => `${car.engine.displacement}L ${car.engine.configuration || ''}` },
    { key: 'horsepower', label: 'Horsepower', getValue: (car: CarSpecs) => `${car.engine.horsepower} HP` },
    { key: 'torque', label: 'Torque', getValue: (car: CarSpecs) => `${car.engine.torque} lb-ft` },
    { key: 'fuelType', label: 'Fuel Type', getValue: (car: CarSpecs) => car.engine.fuelType },
    { key: 'transmission', label: 'Transmission', getValue: (car: CarSpecs) => `${car.transmission.speeds}-speed ${car.transmission.type}` },
    { key: 'driveType', label: 'Drive Type', getValue: (car: CarSpecs) => car.driveType },
    { key: 'zeroToSixty', label: '0-60 mph', getValue: (car: CarSpecs) => car.performance.zeroToSixty ? `${car.performance.zeroToSixty}s` : 'N/A' },
    { key: 'topSpeed', label: 'Top Speed', getValue: (car: CarSpecs) => car.performance.topSpeed ? `${car.performance.topSpeed} mph` : 'N/A' },
    { key: 'quarterMile', label: 'Quarter Mile', getValue: (car: CarSpecs) => car.performance.quarterMile ? `${car.performance.quarterMile}s` : 'N/A' },
    { key: 'mpgCity', label: 'MPG City', getValue: (car: CarSpecs) => car.fuelEconomy.city || 'N/A' },
    { key: 'mpgHighway', label: 'MPG Highway', getValue: (car: CarSpecs) => car.fuelEconomy.highway || 'N/A' },
    { key: 'mpgCombined', label: 'MPG Combined', getValue: (car: CarSpecs) => car.fuelEconomy.combined || 'N/A' },
    { key: 'length', label: 'Length', getValue: (car: CarSpecs) => `${car.dimensions.length}"` },
    { key: 'width', label: 'Width', getValue: (car: CarSpecs) => `${car.dimensions.width}"` },
    { key: 'height', label: 'Height', getValue: (car: CarSpecs) => `${car.dimensions.height}"` },
    { key: 'wheelbase', label: 'Wheelbase', getValue: (car: CarSpecs) => `${car.dimensions.wheelbase}"` },
    { key: 'weight', label: 'Curb Weight', getValue: (car: CarSpecs) => `${car.dimensions.curbWeight.toLocaleString()} lbs` },
    { key: 'price', label: 'MSRP', getValue: (car: CarSpecs) => car.price?.msrp ? `$${car.price.msrp.toLocaleString()}` : 'N/A' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Compare Cars ({comparedCars.length})
          </h1>
          <button
            onClick={clearComparison}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Clear All
          </button>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-4 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10">
                  Specification
                </th>
                {comparedCars.map((car) => (
                  <th key={car.id} className="px-4 py-3 min-w-[200px]">
                    <div className="text-center">
                      <div className="text-5xl mb-2">🚗</div>
                      <div className="font-bold text-gray-800">
                        {car.make} {car.model}
                      </div>
                      <div className="text-sm text-gray-600">{car.year}</div>
                      {car.trim && (
                        <div className="text-xs text-gray-500">{car.trim}</div>
                      )}
                      <button
                        onClick={() => removeCarFromComparison(car.id)}
                        className="mt-2 text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specs.map((spec, index) => (
                <tr
                  key={spec.key}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-3 font-semibold text-gray-700 border-r sticky left-0 z-10" style={{
                    backgroundColor: index % 2 === 0 ? 'white' : 'rgb(249, 250, 251)'
                  }}>
                    {spec.label}
                  </td>
                  {comparedCars.map((car) => (
                    <td key={car.id} className="px-4 py-3 text-center">
                      {spec.getValue(car)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Safety Ratings */}
        {comparedCars.some(car => car.safetyRating) && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Safety Ratings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {comparedCars.map((car) => (
                <div key={car.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    {car.make} {car.model}
                  </h3>
                  {car.safetyRating ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Overall:</span>
                        <span className="font-semibold">
                          {'⭐'.repeat(car.safetyRating.overall || 0)}
                        </span>
                      </div>
                      {car.safetyRating.frontal && (
                        <div className="flex justify-between">
                          <span>Frontal:</span>
                          <span className="font-semibold">
                            {'⭐'.repeat(car.safetyRating.frontal)}
                          </span>
                        </div>
                      )}
                      {car.safetyRating.side && (
                        <div className="flex justify-between">
                          <span>Side:</span>
                          <span className="font-semibold">
                            {'⭐'.repeat(car.safetyRating.side)}
                          </span>
                        </div>
                      )}
                      {car.safetyRating.rollover && (
                        <div className="flex justify-between">
                          <span>Rollover:</span>
                          <span className="font-semibold">
                            {'⭐'.repeat(car.safetyRating.rollover)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No rating available</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
