import { useState } from 'react';
import type { CarSpecs } from '../types/car.types';
import { calculateCostPerMile } from '../utils/marketIntelligence';
import { getRegionalAssumptions } from '@carinfo/config/regional-assumptions';
import { DISPLAY_CURRENCY } from '../utils/currency';
import { usesMpge } from '../utils/fuelDisplay';

const REGION = getRegionalAssumptions();

interface TCOCalculatorProps {
  car: CarSpecs;
  onClose: () => void;
}

export default function TCOCalculator({ car, onClose }: TCOCalculatorProps) {
  const [yearsOwned, setYearsOwned] = useState(5);
  const [kmPerYear, setKmPerYear] = useState(REGION.annualKm);
  const [gasPrice, setGasPrice] = useState(REGION.gasPriceCadPerL);
  const [electricityPrice, setElectricityPrice] = useState(REGION.electricityRateCadPerKwh);
  const [insuranceRate, setInsuranceRate] = useState(0.01);
  const [maintenancePerYear, setMaintenancePerYear] = useState(REGION.maintenance.base);
  const [downPayment, setDownPayment] = useState(0);
  const [loanRate, setLoanRate] = useState(0.05);

  const fuelType = car.engine.fuelType;
  const isElectric = fuelType === 'electric';
  const isHydrogen = fuelType === 'hydrogen';
  const isPlugInHybrid = fuelType === 'plug-in hybrid';
  const showElectricityInput = isElectric || isPlugInHybrid;
  const showGasInput = !isElectric && !isHydrogen;

  const msrp = car.price?.msrp || 35000;
  const mpg = car.fuelEconomy.combined || 25;

  const costResult = calculateCostPerMile(car, {
    gasPriceCadPerL: gasPrice,
    electricityPriceCadPerKwh: electricityPrice,
  });
  const costPerKm = costResult.costPerKm;

  // Calculate TCO components
  const purchasePrice = msrp;
  const downPaymentAmount = downPayment;
  const loanAmount = purchasePrice - downPaymentAmount;
  const monthlyPayment = loanAmount > 0 ? (loanAmount * (loanRate / 12)) / (1 - Math.pow(1 + loanRate / 12, -yearsOwned * 12)) : 0;
  const totalLoanPayments = monthlyPayment * yearsOwned * 12;
  const totalInterestPaid = totalLoanPayments - loanAmount;

  const fuelCostPerYear = costPerKm * kmPerYear;
  const totalFuelCost = fuelCostPerYear * yearsOwned;

  const insuranceCostPerYear = purchasePrice * insuranceRate;
  const totalInsuranceCost = insuranceCostPerYear * yearsOwned;

  const totalMaintenanceCost = maintenancePerYear * yearsOwned;

  // Depreciation (simplified - cars lose ~15-20% first year, then ~10% per year)
  const yearOneDepreciation = purchasePrice * 0.20;
  const subsequentYearDepreciation = (purchasePrice - yearOneDepreciation) * 0.10 * (yearsOwned - 1);
  const totalDepreciation = yearOneDepreciation + subsequentYearDepreciation;
  const estimatedResaleValue = Math.max(0, purchasePrice - totalDepreciation);

  const totalCostOfOwnership =
    purchasePrice +
    totalInterestPaid +
    totalFuelCost +
    totalInsuranceCost +
    totalMaintenanceCost -
    estimatedResaleValue;

  const monthlyTCO = totalCostOfOwnership / (yearsOwned * 12);

  const fuelLabel = isElectric
    ? 'Energy (electric)'
    : isPlugInHybrid
      ? 'Fuel & Energy'
      : 'Fuel';

  const efficiencyLabel = usesMpge(fuelType) ? 'MPGe' : 'MPG';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-5xl w-full bg-black border border-zinc-800 p-8 md:p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-zinc-900">
          <div>
            <h2 className="text-3xl font-black tracking-tighter mb-2">
              TOTAL COST OF OWNERSHIP
            </h2>
            <p className="text-sm tracking-wider text-zinc-600 uppercase">
              {car.year} {car.make} {car.model}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-white transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Inputs */}
          <div>
            <h3 className="text-xl font-black tracking-tight mb-6 uppercase">
              Customize Your Assumptions
            </h3>

            <div className="space-y-6">
              {/* Years Owned */}
              <div>
                <label className="block text-xs tracking-widest text-zinc-300 mb-2">
                  YEARS OWNED
                </label>
                <input
                  type="number"
                  value={yearsOwned}
                  onChange={(e) => setYearsOwned(parseInt(e.target.value) || 5)}
                  min="1"
                  max="15"
                  className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest text-zinc-300 mb-2">
                  KM PER YEAR
                </label>
                <input
                  type="number"
                  value={kmPerYear}
                  onChange={(e) => setKmPerYear(parseInt(e.target.value) || REGION.annualKm)}
                  step="1000"
                  className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              {showGasInput && (
                <div>
                  <label className="block text-xs tracking-widest text-zinc-300 mb-2">
                    GAS PRICE ($/L {DISPLAY_CURRENCY})
                  </label>
                  <input
                    type="number"
                    value={gasPrice}
                    onChange={(e) => setGasPrice(parseFloat(e.target.value) || REGION.gasPriceCadPerL)}
                    step="0.01"
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
              )}

              {showElectricityInput && (
                <div>
                  <label className="block text-xs tracking-widest text-zinc-300 mb-2">
                    ELECTRICITY PRICE ($/KWH {DISPLAY_CURRENCY})
                  </label>
                  <input
                    type="number"
                    value={electricityPrice}
                    onChange={(e) => setElectricityPrice(parseFloat(e.target.value) || REGION.electricityRateCadPerKwh)}
                    step="0.01"
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
              )}

              {/* Down Payment */}
              <div>
                <label className="block text-xs tracking-widest text-zinc-300 mb-2">
                  DOWN PAYMENT ($)
                </label>
                <input
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(parseInt(e.target.value) || 0)}
                  step="1000"
                  className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Loan Rate */}
              <div>
                <label className="block text-xs tracking-widest text-zinc-300 mb-2">
                  LOAN INTEREST RATE (%)
                </label>
                <input
                  type="number"
                  value={loanRate * 100}
                  onChange={(e) => setLoanRate((parseFloat(e.target.value) || 5) / 100)}
                  step="0.1"
                  className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Insurance Rate */}
              <div>
                <label className="block text-xs tracking-widest text-zinc-300 mb-2">
                  INSURANCE (% OF PRICE)
                </label>
                <input
                  type="number"
                  value={insuranceRate * 100}
                  onChange={(e) => setInsuranceRate((parseFloat(e.target.value) || 1) / 100)}
                  step="0.1"
                  className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Maintenance */}
              <div>
                <label className="block text-xs tracking-widest text-zinc-300 mb-2">
                  MAINTENANCE ($/YEAR)
                </label>
                <input
                  type="number"
                  value={maintenancePerYear}
                  onChange={(e) => setMaintenancePerYear(parseInt(e.target.value) || 1000)}
                  step="100"
                  className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg font-bold focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div>
            <h3 className="text-xl font-black tracking-tight mb-6 uppercase">
              Your Total Cost
            </h3>

            {/* Total TCO - Prominent */}
            <div className="bg-white text-black p-8 mb-8">
              <p className="text-xs tracking-[0.3em] font-bold uppercase mb-2">
                {yearsOwned}-Year Total Cost
              </p>
              <p className="text-5xl font-black tracking-tighter mb-4">
                ${Math.round(totalCostOfOwnership).toLocaleString()}
              </p>
              <div className="h-px bg-black mb-4" />
              <p className="text-sm tracking-wider uppercase">
                ${Math.round(monthlyTCO).toLocaleString()} per month
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                <span className="tracking-widest text-zinc-300 uppercase">Purchase Price</span>
                <span className="text-lg font-bold">${Math.round(purchasePrice).toLocaleString()}</span>
              </div>

              {loanAmount > 0 && (
                <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                  <span className="tracking-widest text-zinc-300 uppercase">Loan Interest</span>
                  <span className="text-lg font-bold">${Math.round(totalInterestPaid).toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                <span className="tracking-widest text-zinc-300 uppercase">{fuelLabel} ({yearsOwned} years)</span>
                <span className="text-lg font-bold">${Math.round(totalFuelCost).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                <span className="tracking-widest text-zinc-300 uppercase">Insurance ({yearsOwned} years)</span>
                <span className="text-lg font-bold">${Math.round(totalInsuranceCost).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                <span className="tracking-widest text-zinc-300 uppercase">Maintenance ({yearsOwned} years)</span>
                <span className="text-lg font-bold">${Math.round(totalMaintenanceCost).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-zinc-900 text-white">
                <span className="tracking-widest uppercase">Resale Value</span>
                <span className="text-lg font-bold">-${Math.round(estimatedResaleValue).toLocaleString()}</span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="mt-8 pt-8 border-t border-zinc-900">
              <h4 className="text-xs tracking-[0.3em] text-zinc-300 mb-4 uppercase">Key Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <p className="text-xs tracking-widest text-zinc-300 mb-2">ENERGY COST/YR</p>
                  <p className="text-2xl font-black">${Math.round(fuelCostPerYear).toLocaleString()}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <p className="text-xs tracking-widest text-zinc-300 mb-2">{efficiencyLabel}</p>
                  <p className="text-2xl font-black">{mpg}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <p className="text-xs tracking-widest text-zinc-300 mb-2">DEPRECIATION</p>
                  <p className="text-2xl font-black">${Math.round(totalDepreciation / 1000)}K</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-4">
                  <p className="text-xs tracking-widest text-zinc-300 mb-2">MONTHLY</p>
                  <p className="text-2xl font-black">${Math.round(monthlyTCO).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
