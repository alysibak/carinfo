import { Link } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import type { CarSpecs } from '../types/car.types';

export default function Compare() {
  const { comparedCars, removeCarFromComparison, clearComparison } = useCarStore();

  if (comparedCars.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors mb-12 group"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>BACK</span>
          </Link>

          <h2 className="text-4xl font-black tracking-tighter mb-4">
            NO VEHICLES SELECTED
          </h2>
          <p className="text-sm tracking-[0.3em] text-zinc-600 uppercase">
            Add vehicles to compare
          </p>
        </div>
      </div>
    );
  }

  const specs = [
    { key: 'year', label: 'YEAR', getValue: (car: CarSpecs) => car.year },
    { key: 'country', label: 'ORIGIN', getValue: (car: CarSpecs) => car.countryOfOrigin },
    { key: 'bodyStyle', label: 'TYPE', getValue: (car: CarSpecs) => car.bodyStyle.toUpperCase() },
    { key: 'engine', label: 'ENGINE', getValue: (car: CarSpecs) => `${car.engine.displacement} ${car.engine.configuration || ''}` },
    { key: 'horsepower', label: 'POWER', getValue: (car: CarSpecs) => `${car.engine.horsepower} HP` },
    { key: 'torque', label: 'TORQUE', getValue: (car: CarSpecs) => `${car.engine.torque} LB-FT` },
    { key: 'fuelType', label: 'FUEL', getValue: (car: CarSpecs) => car.engine.fuelType.toUpperCase() },
    { key: 'transmission', label: 'TRANS', getValue: (car: CarSpecs) => `${car.transmission.speeds}-SPD ${car.transmission.type.toUpperCase()}` },
    { key: 'driveType', label: 'DRIVE', getValue: (car: CarSpecs) => car.driveType },
    { key: 'zeroToSixty', label: '0-60', getValue: (car: CarSpecs) => car.performance.zeroToSixty ? `${car.performance.zeroToSixty.toFixed(1)}S` : 'N/A' },
    { key: 'topSpeed', label: 'TOP SPEED', getValue: (car: CarSpecs) => car.performance.topSpeed ? `${Math.round(car.performance.topSpeed)} MPH` : 'N/A' },
    { key: 'quarterMile', label: '1/4 MILE', getValue: (car: CarSpecs) => car.performance.quarterMile ? `${car.performance.quarterMile.toFixed(1)}S` : 'N/A' },
    { key: 'mpgCity', label: 'MPG CITY', getValue: (car: CarSpecs) => car.fuelEconomy.city || 'N/A' },
    { key: 'mpgHighway', label: 'MPG HWY', getValue: (car: CarSpecs) => car.fuelEconomy.highway || 'N/A' },
    { key: 'mpgCombined', label: 'MPG AVG', getValue: (car: CarSpecs) => car.fuelEconomy.combined || 'N/A' },
    { key: 'length', label: 'LENGTH', getValue: (car: CarSpecs) => `${Math.round(car.dimensions.length)}"` },
    { key: 'width', label: 'WIDTH', getValue: (car: CarSpecs) => `${Math.round(car.dimensions.width)}"` },
    { key: 'height', label: 'HEIGHT', getValue: (car: CarSpecs) => `${Math.round(car.dimensions.height)}"` },
    { key: 'wheelbase', label: 'WHEELBASE', getValue: (car: CarSpecs) => `${Math.round(car.dimensions.wheelbase)}"` },
    { key: 'weight', label: 'WEIGHT', getValue: (car: CarSpecs) => `${Math.round(car.dimensions.curbWeight).toLocaleString()} LBS` },
    { key: 'price', label: 'MSRP', getValue: (car: CarSpecs) => car.price?.msrp ? `$${Math.round(car.price.msrp).toLocaleString()}` : 'N/A' },
  ];

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
                COMPARE
              </h1>
              <p className="text-xs tracking-[0.3em] text-zinc-700 mt-1">
                {comparedCars.length} SELECTED
              </p>
            </div>

            <button
              onClick={clearComparison}
              className="text-xs tracking-[0.3em] text-zinc-600 hover:text-red-500 transition-colors"
            >
              CLEAR
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-32 px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-900">
                  <th className="px-6 py-8 text-left sticky left-0 bg-black z-10">
                    <span className="text-xs tracking-[0.3em] text-zinc-700">SPEC</span>
                  </th>
                  {comparedCars.map((car) => (
                    <th key={car.id} className="px-6 py-8 min-w-[280px] border-l border-zinc-900">
                      <div className="text-center">
                        {/* Year */}
                        <div className="mb-4">
                          <p className="text-4xl font-black text-zinc-700">
                            {car.year}
                          </p>
                        </div>

                        {/* Make & Model */}
                        <div className="mb-6">
                          <h3 className="text-xl font-black tracking-tight">
                            {car.make.toUpperCase()}
                          </h3>
                          <p className="text-base font-light tracking-wider text-zinc-500">
                            {car.model}
                          </p>
                          {car.trim && (
                            <p className="text-xs tracking-widest text-zinc-700 mt-2">
                              {car.trim.toUpperCase()}
                            </p>
                          )}
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => removeCarFromComparison(car.id)}
                          className="text-xs tracking-widest text-zinc-700 hover:text-red-500 transition-colors"
                        >
                          REMOVE
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
                    className={`border-b border-zinc-950 ${index % 2 === 0 ? 'bg-black' : 'bg-zinc-950'}`}
                  >
                    <td className="px-6 py-6 sticky left-0 z-10 border-r border-zinc-900" style={{
                      backgroundColor: index % 2 === 0 ? '#000000' : 'rgb(9, 9, 11)'
                    }}>
                      <span className="text-xs tracking-widest text-zinc-600 font-semibold">
                        {spec.label}
                      </span>
                    </td>
                    {comparedCars.map((car) => (
                      <td key={car.id} className="px-6 py-6 text-center border-l border-zinc-900">
                        <span className="text-sm font-bold tracking-wide">
                          {spec.getValue(car)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Safety Ratings */}
          {comparedCars.some(car => car.safetyRating) && (
            <div className="mt-16 pt-16 border-t border-zinc-900">
              <h2 className="text-2xl font-black tracking-tighter mb-8 text-center">
                SAFETY RATINGS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-px bg-zinc-900">
                {comparedCars.map((car) => (
                  <div key={car.id} className="bg-black p-8 border border-zinc-900">
                    <h3 className="text-sm font-black tracking-tight mb-6 text-center">
                      {car.make.toUpperCase()} {car.model.toUpperCase()}
                    </h3>
                    {car.safetyRating ? (
                      <div className="space-y-4 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="tracking-widest text-zinc-700">OVERALL</span>
                          <span className="text-base font-bold">
                            {car.safetyRating.overall || 0}/5
                          </span>
                        </div>
                        {car.safetyRating.frontal && (
                          <div className="flex justify-between items-center">
                            <span className="tracking-widest text-zinc-700">FRONTAL</span>
                            <span className="text-base font-bold">
                              {car.safetyRating.frontal}/5
                            </span>
                          </div>
                        )}
                        {car.safetyRating.side && (
                          <div className="flex justify-between items-center">
                            <span className="tracking-widest text-zinc-700">SIDE</span>
                            <span className="text-base font-bold">
                              {car.safetyRating.side}/5
                            </span>
                          </div>
                        )}
                        {car.safetyRating.rollover && (
                          <div className="flex justify-between items-center">
                            <span className="tracking-widest text-zinc-700">ROLLOVER</span>
                            <span className="text-base font-bold">
                              {car.safetyRating.rollover}/5
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs tracking-widest text-zinc-700 text-center">
                        NO DATA
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
