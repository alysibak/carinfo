import type { CarSpecs } from '../types/car.types';
import {
  calculateDerivedMetrics,
  calculateMarketPosition,
  getSegment,
  formatPercentage,
  getWeightClass,
  getPowerClass,
  calculateCostPerMile,
} from '../utils/marketIntelligence';

interface MarketIntelligenceProps {
  car: CarSpecs;
  allCars: CarSpecs[];
}

export default function MarketIntelligence({ car, allCars }: MarketIntelligenceProps) {
  const segment = getSegment(car, allCars);
  const derivedMetrics = calculateDerivedMetrics(car);
  const marketPosition = segment.length >= 5 ? calculateMarketPosition(car, segment) : null;
  const costPerMileData = calculateCostPerMile(car);

  const priceInfo = marketPosition ? formatPercentage(marketPosition.priceVsAvg, false) : null;
  const hpInfo = marketPosition ? formatPercentage(marketPosition.hpVsAvg, true) : null;
  const mpgInfo = marketPosition ? formatPercentage(marketPosition.mpgVsAvg, true) : null;

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return '#10b981'; // green
      case 'good':
        return '#3b82f6'; // blue
      case 'below-average':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return 'EXCELLENT VALUE';
      case 'good':
        return 'GOOD VALUE';
      case 'below-average':
        return 'BELOW AVERAGE';
      default:
        return 'AVERAGE VALUE';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border-2 border-blue-500/30 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center">
          <svg
            className="w-8 h-8 mr-3 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Market Intelligence
        </h2>

        {marketPosition && (
          <div
            className="px-6 py-3 rounded-full font-black text-lg tracking-wider"
            style={{
              backgroundColor: `${getRatingColor(marketPosition.overallRating)}20`,
              color: getRatingColor(marketPosition.overallRating),
              border: `2px solid ${getRatingColor(marketPosition.overallRating)}`,
            }}
          >
            {getRatingLabel(marketPosition.overallRating)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Derived Performance Metrics */}
        <div>
          <h3 className="text-xl font-bold text-blue-400 mb-4 uppercase tracking-wider">
            Performance Metrics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-300">Power Density</span>
              <div className="text-right">
                <span className="text-white font-bold text-lg">
                  {derivedMetrics.powerDensity.toFixed(1)} HP/L
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  {getPowerClass(car.engine.horsepower)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-300">Power-to-Weight</span>
              <div className="text-right">
                <span className="text-white font-bold text-lg">
                  {derivedMetrics.powerToWeight.toFixed(3)} HP/lb
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  {getWeightClass(car.dimensions.curbWeight)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-300">Torque Density</span>
              <span className="text-white font-bold text-lg">
                {derivedMetrics.torqueDensity.toFixed(1)} lb-ft/L
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-300">HP per $1000</span>
              <span className="text-white font-bold text-lg">
                {derivedMetrics.hpPerDollar.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-300">Cost Per Mile</span>
              <div className="text-right">
                <span className="text-white font-bold text-lg">
                  ${costPerMileData.costPerMile.toFixed(3)}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  {costPerMileData.fuelType} • ${costPerMileData.annualCost.toLocaleString()}/yr
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-300">Efficiency Score</span>
              <div className="text-right">
                <span className="text-white font-bold text-lg">
                  {derivedMetrics.efficiencyScore.toFixed(0)}/100
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  {costPerMileData.efficiencyMetric}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-slate-300">Reliability Score</span>
              <div className="text-right">
                <span
                  className="font-bold text-lg"
                  style={{
                    color: derivedMetrics.reliabilityScore >= 80 ? '#10b981' : derivedMetrics.reliabilityScore >= 65 ? '#f59e0b' : '#ef4444'
                  }}
                >
                  {derivedMetrics.reliabilityScore.toFixed(0)}/100
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  {car.make} • {2025 - car.year} years old
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Market Position */}
        {marketPosition && segment.length >= 5 ? (
          <div>
            <h3 className="text-xl font-bold text-blue-400 mb-4 uppercase tracking-wider">
              Market Position
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Compared to {segment.length} similar {car.bodyStyle}s ({car.year - 3} - {car.year + 3})
            </p>
            <div className="space-y-3">
              <div className="py-2 border-b border-slate-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">Price vs Segment</span>
                  {priceInfo && (
                    <span
                      className="font-bold text-lg"
                      style={{ color: priceInfo.color }}
                    >
                      {priceInfo.icon} {priceInfo.text}
                    </span>
                  )}
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${marketPosition.pricePercentile}%`,
                      backgroundColor: priceInfo?.color || '#6b7280',
                    }}
                  />
                </div>
              </div>

              <div className="py-2 border-b border-slate-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">Horsepower vs Segment</span>
                  {hpInfo && (
                    <span
                      className="font-bold text-lg"
                      style={{ color: hpInfo.color }}
                    >
                      {hpInfo.icon} {hpInfo.text}
                    </span>
                  )}
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${marketPosition.hpPercentile}%`,
                      backgroundColor: hpInfo?.color || '#6b7280',
                    }}
                  />
                </div>
              </div>

              <div className="py-2 border-b border-slate-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">Fuel Economy vs Segment</span>
                  {mpgInfo && (
                    <span
                      className="font-bold text-lg"
                      style={{ color: mpgInfo.color }}
                    >
                      {mpgInfo.icon} {mpgInfo.text}
                    </span>
                  )}
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${marketPosition.mpgPercentile}%`,
                      backgroundColor: mpgInfo?.color || '#6b7280',
                    }}
                  />
                </div>
              </div>

              <div className="py-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">Overall Value</span>
                  <span
                    className="font-bold text-lg"
                    style={{ color: getRatingColor(marketPosition.overallRating) }}
                  >
                    {marketPosition.valuePercentile.toFixed(0)}th percentile
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${marketPosition.valuePercentile}%`,
                      backgroundColor: getRatingColor(marketPosition.overallRating),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="text-center text-slate-400">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">
                Not enough similar vehicles in database for market comparison
              </p>
              <p className="text-xs mt-2">
                Need at least 5 comparable {car.bodyStyle}s from {car.year - 3} - {car.year + 3}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
