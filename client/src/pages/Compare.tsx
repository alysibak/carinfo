import { useCarStore } from '../stores/carStore';
import type { CarSpecs } from '../types/car.types';
import { getCarImageUrl } from '../utils/carImages';

export default function Compare() {
  const { comparedCars, removeCarFromComparison, clearComparison } = useCarStore();

  if (comparedCars.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mb-6">
            <svg className="w-24 h-24 text-slate-700 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            No Cars to Compare
          </h2>
          <p className="text-slate-400 text-lg">
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center">
            <svg className="w-10 h-10 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Compare Cars ({comparedCars.length})
          </h1>
          <button
            onClick={clearComparison}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-semibold shadow-lg shadow-red-500/50 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear All</span>
          </button>
        </div>

        {/* Comparison Table */}
        <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700 animate-slide-up">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                  <th className="px-6 py-4 text-left font-semibold text-slate-200 sticky left-0 bg-slate-900 z-10">
                    Specification
                  </th>
                  {comparedCars.map((car) => (
                    <th key={car.id} className="px-6 py-4 min-w-[250px]">
                      <div className="text-center">
                        <div className="mb-3">
                          <img
                            src={getCarImageUrl(car.make, car.model, car.year)}
                            alt={`${car.make} ${car.model}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                        <div className="font-bold text-white text-lg">
                          {car.make} {car.model}
                        </div>
                        <div className="text-sm text-slate-400">{car.year}</div>
                        {car.trim && (
                          <div className="text-xs text-slate-500 mt-1">{car.trim}</div>
                        )}
                        <button
                          onClick={() => removeCarFromComparison(car.id)}
                          className="mt-3 text-xs text-red-400 hover:text-red-300 transition flex items-center mx-auto"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
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
                    className={index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-850 hover:bg-slate-750 transition'}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-300 border-r border-slate-700 sticky left-0 z-10" style={{
                      backgroundColor: index % 2 === 0 ? 'rgb(30, 41, 59)' : 'rgb(15, 23, 42)'
                    }}>
                      {spec.label}
                    </td>
                    {comparedCars.map((car) => (
                      <td key={car.id} className="px-6 py-4 text-center text-white">
                        {spec.getValue(car)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Safety Ratings */}
        {comparedCars.some(car => car.safetyRating) && (
          <div className="mt-8 bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700 animate-slide-up">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <svg className="w-7 h-7 mr-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Safety Ratings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {comparedCars.map((car) => (
                <div key={car.id} className="bg-slate-700 border border-slate-600 rounded-lg p-5">
                  <h3 className="font-semibold text-white mb-4 text-center">
                    {car.make} {car.model}
                  </h3>
                  {car.safetyRating ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Overall:</span>
                        <span className="text-yellow-400 text-lg">
                          {'⭐'.repeat(car.safetyRating.overall || 0)}
                        </span>
                      </div>
                      {car.safetyRating.frontal && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Frontal:</span>
                          <span className="text-yellow-400">
                            {'⭐'.repeat(car.safetyRating.frontal)}
                          </span>
                        </div>
                      )}
                      {car.safetyRating.side && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Side:</span>
                          <span className="text-yellow-400">
                            {'⭐'.repeat(car.safetyRating.side)}
                          </span>
                        </div>
                      )}
                      {car.safetyRating.rollover && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Rollover:</span>
                          <span className="text-yellow-400">
                            {'⭐'.repeat(car.safetyRating.rollover)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm text-center">No rating available</div>
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
