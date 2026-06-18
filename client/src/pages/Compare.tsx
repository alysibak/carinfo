import { Link } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import type { CarSpecs } from '../types/car.types';
import { formatEngineForDetail, UNAVAILABLE_LABEL } from '../utils/dataValue';
import { formatFuelTypeLabel, usesMpge } from '../utils/fuelDisplay';
import { formatTransmissionLabel } from '../utils/trimLabel';

export default function Compare() {
  const { comparedCars, removeCarFromComparison, clearComparison } = useCarStore();

  if (comparedCars.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors mb-12 group"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>BACK</span>
          </Link>

          <h2 className="text-2xl font-bold tracking-tight mb-3 uppercase">
            No vehicles selected
          </h2>
          <p className="text-sm text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed">
            Add up to 5 vehicles from search or browse to compare specs side by side.
          </p>
          <Link to="/home" className="btn-primary text-xs">
            Search vehicles
          </Link>
        </div>
      </div>
    );
  }

  interface SpecRow {
    key: string;
    label: string;
    getValue: (car: CarSpecs) => string | number;
    // For numeric rows: returns the comparable number (or null) so the best
    // value across compared cars can be highlighted.
    getNumeric?: (car: CarSpecs) => number | null;
    higherIsBetter?: boolean;
  }

  const specs: SpecRow[] = ([
    { key: 'year', label: 'YEAR', getValue: (car) => car.year },
    { key: 'country', label: 'ORIGIN', getValue: (car) => car.countryOfOrigin || UNAVAILABLE_LABEL },
    { key: 'bodyStyle', label: 'TYPE', getValue: (car) => car.bodyStyle.toUpperCase() },
    { key: 'engine', label: 'ENGINE', getValue: (car) => {
      const label = formatEngineForDetail(car.engine);
      return label === UNAVAILABLE_LABEL ? UNAVAILABLE_LABEL : label.toUpperCase();
    }},
    { key: 'horsepower', label: 'POWER', getValue: (car) => car.engine.horsepower != null ? `${car.engine.horsepower} HP` : UNAVAILABLE_LABEL, getNumeric: (car) => car.engine.horsepower ?? null, higherIsBetter: true },
    { key: 'torque', label: 'TORQUE', getValue: (car) => car.engine.torque != null ? `${car.engine.torque} LB-FT` : UNAVAILABLE_LABEL, getNumeric: (car) => car.engine.torque ?? null, higherIsBetter: true },
    { key: 'fuelType', label: 'FUEL', getValue: (car) => formatFuelTypeLabel(car.engine.fuelType).toUpperCase() },
    { key: 'transmission', label: 'TRANS', getValue: (car) => formatTransmissionLabel(car.transmission).toUpperCase() },
    { key: 'driveType', label: 'DRIVE', getValue: (car) => car.driveType },
    { key: 'zeroToSixty', label: '0-60', getValue: (car) => car.performance?.zeroToSixty ? `${car.performance.zeroToSixty.toFixed(1)}S` : UNAVAILABLE_LABEL, getNumeric: (car) => car.performance?.zeroToSixty ?? null, higherIsBetter: false },
    { key: 'topSpeed', label: 'TOP SPEED', getValue: (car) => car.performance?.topSpeed ? `${Math.round(car.performance.topSpeed)} MPH` : UNAVAILABLE_LABEL, getNumeric: (car) => car.performance?.topSpeed ?? null, higherIsBetter: true },
    { key: 'mpgCity', label: 'EFF CITY', getValue: (car) => car.fuelEconomy.city ? `${car.fuelEconomy.city} ${usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG'}` : UNAVAILABLE_LABEL, getNumeric: (car) => car.fuelEconomy.city ?? null, higherIsBetter: true },
    { key: 'mpgHighway', label: 'EFF HWY', getValue: (car) => car.fuelEconomy.highway ? `${car.fuelEconomy.highway} ${usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG'}` : UNAVAILABLE_LABEL, getNumeric: (car) => car.fuelEconomy.highway ?? null, higherIsBetter: true },
    { key: 'mpgCombined', label: 'EFF AVG', getValue: (car) => car.fuelEconomy.combined ? `${car.fuelEconomy.combined} ${usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG'}` : UNAVAILABLE_LABEL, getNumeric: (car) => car.fuelEconomy.combined ?? null, higherIsBetter: true },
    { key: 'length', label: 'LENGTH', getValue: (car) => car.dimensions?.length != null ? `${Math.round(car.dimensions.length)}"` : UNAVAILABLE_LABEL },
    { key: 'weight', label: 'WEIGHT', getValue: (car) => car.dimensions?.curbWeight != null ? `${Math.round(car.dimensions.curbWeight).toLocaleString()} LBS` : UNAVAILABLE_LABEL },
    { key: 'annualFuelCost', label: 'FUEL $/YR', getValue: (car) => car.epa?.annualFuelCost != null ? `$${car.epa.annualFuelCost.toLocaleString()}` : UNAVAILABLE_LABEL, getNumeric: (car) => car.epa?.annualFuelCost ?? null, higherIsBetter: false },
    { key: 'co2', label: 'CO2 G/MI', getValue: (car) => car.epa?.co2 != null ? `${car.epa.co2}` : UNAVAILABLE_LABEL, getNumeric: (car) => car.epa?.co2 ?? null, higherIsBetter: false },
    { key: 'price', label: 'EST. VALUE', getValue: (car) => car.price?.msrp ? `$${Math.round(car.price.msrp).toLocaleString()}${car.price.isEstimated ? ' (est.)' : ''}` : UNAVAILABLE_LABEL, getNumeric: (car) => car.price?.msrp ?? null, higherIsBetter: false },
    // Drop rows where no compared car has data (keeps the table useful)
  ] as SpecRow[]).filter((spec) => comparedCars.some((car) => spec.getValue(car) !== UNAVAILABLE_LABEL));

  // Best value per numeric row (only meaningful with 2+ cars and distinct values)
  const bestByRow = new Map<string, number>();
  if (comparedCars.length > 1) {
    for (const spec of specs) {
      if (!spec.getNumeric) continue;
      const values = comparedCars
        .map((car) => spec.getNumeric!(car))
        .filter((v): v is number => v != null);
      if (values.length < 2) continue;
      const best = spec.higherIsBetter ? Math.max(...values) : Math.min(...values);
      const worst = spec.higherIsBetter ? Math.min(...values) : Math.max(...values);
      if (best !== worst) bestByRow.set(spec.key, best);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-zinc-900">
        <div className="page-wrap py-5 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Compare</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                {comparedCars.length} vehicle{comparedCars.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <button
              onClick={clearComparison}
              className="text-xs sm:text-sm text-zinc-400 hover:text-red-400 transition-colors shrink-0"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>

      <div className="page-wrap py-6 sm:py-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full border-collapse min-w-[320px]">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="px-3 sm:px-4 py-4 text-left sticky left-0 bg-black z-10 min-w-[100px]">
                    <span className="text-xs uppercase tracking-widest text-zinc-500">Spec</span>
                  </th>
                  {comparedCars.map((car) => (
                    <th key={car.id} className="px-3 sm:px-4 py-4 min-w-[180px] sm:min-w-[220px] border-l border-zinc-800">
                      <div className="text-center">
                        <div className="mb-3">
                          <p className="text-4xl font-black text-zinc-300 tabular-nums">{car.year}</p>
                        </div>
                        <div className="mb-4">
                          <h3 className="text-lg font-black tracking-tight uppercase">{car.make}</h3>
                          <p className="text-sm font-medium text-zinc-400">{car.model}</p>
                          {car.trim && (
                            <p className="text-xs tracking-widest text-zinc-500 mt-1 uppercase">{car.trim}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeCarFromComparison(car.id)}
                          className="text-[10px] tracking-widest text-zinc-500 hover:text-red-500 transition-colors uppercase"
                        >
                          Remove
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specs.map((spec) => (
                  <tr key={spec.key} className="border-b border-zinc-900">
                    <td className="px-4 py-3 sticky left-0 z-10 bg-black border-r border-zinc-800">
                      <span className="text-xs tracking-widest text-zinc-500 uppercase">{spec.label}</span>
                    </td>
                    {comparedCars.map((car) => {
                      const best = bestByRow.get(spec.key);
                      const isBest = best != null && spec.getNumeric?.(car) === best;
                      const raw = spec.getValue(car);
                      const isNumeric = spec.getNumeric?.(car) != null;
                      return (
                        <td key={car.id} className="px-4 py-3 text-center border-l border-zinc-800">
                          <span
                            className={`text-sm ${
                              isBest
                                ? 'font-black text-white tabular-nums'
                                : isNumeric
                                  ? 'font-medium tabular-nums text-white'
                                  : 'text-zinc-300'
                            }`}
                          >
                            {raw}
                            {isBest && <span className="ml-1 text-[10px] text-zinc-400 align-middle">▲</span>}
                          </span>
                        </td>
                      );
                    })}
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
                          <span className="tracking-widest text-zinc-300">OVERALL</span>
                          <span className="text-base font-bold">
                            {car.safetyRating.overall || 0}/5
                          </span>
                        </div>
                        {car.safetyRating.frontal && (
                          <div className="flex justify-between items-center">
                            <span className="tracking-widest text-zinc-300">FRONTAL</span>
                            <span className="text-base font-bold">
                              {car.safetyRating.frontal}/5
                            </span>
                          </div>
                        )}
                        {car.safetyRating.side && (
                          <div className="flex justify-between items-center">
                            <span className="tracking-widest text-zinc-300">SIDE</span>
                            <span className="text-base font-bold">
                              {car.safetyRating.side}/5
                            </span>
                          </div>
                        )}
                        {car.safetyRating.rollover && (
                          <div className="flex justify-between items-center">
                            <span className="tracking-widest text-zinc-300">ROLLOVER</span>
                            <span className="text-base font-bold">
                              {car.safetyRating.rollover}/5
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs tracking-widest text-zinc-600 italic text-center">
                        {UNAVAILABLE_LABEL}
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
