import { useNavigate } from 'react-router-dom';
import type { CarSpecs } from '../types/car.types';
import { calculateAggregateStats } from '../utils/marketIntelligence';

interface AggregateStatsProps {
  cars: CarSpecs[];
  title?: string;
}

export default function AggregateStats({ cars, title = 'MARKET OVERVIEW' }: AggregateStatsProps) {
  const navigate = useNavigate();
  const stats = calculateAggregateStats(cars);

  if (stats.count === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-none">
      <h2 className="kicker mb-4">{title}</h2>

      <div className="space-y-3 mb-6 divide-y divide-zinc-900">
        <div className="flex justify-between items-baseline py-2">
          <span className="text-xs tracking-widest text-zinc-500 uppercase">Vehicles</span>
          <span className="text-2xl font-bold tabular-nums text-white">{stats.count.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-baseline py-2">
          <span className="text-xs tracking-widest text-zinc-500 uppercase">Avg price</span>
          <span className="text-2xl font-bold tabular-nums text-white">
            ${(stats.avgPrice / 1000).toFixed(0)}k
          </span>
        </div>

        {stats.avgHorsepower > 0 && (
          <div className="flex justify-between items-baseline py-2">
            <span className="text-xs tracking-widest text-zinc-500 uppercase">Avg power</span>
            <span className="text-2xl font-bold tabular-nums text-white">{stats.avgHorsepower} HP</span>
          </div>
        )}

        <div className="flex justify-between items-baseline py-2">
          <span className="text-xs tracking-widest text-zinc-500 uppercase">Avg MPG</span>
          <span className="text-2xl font-bold tabular-nums text-white">{stats.avgMpg}</span>
        </div>

        {stats.avgTorque > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-xs tracking-widest text-zinc-300 uppercase">Avg Torque</span>
            <span className="text-xl font-black text-white">{stats.avgTorque} LB-FT</span>
          </div>
        )}
      </div>

      {/* Standout Vehicles */}
      <div className="space-y-4 pt-6 border-t border-zinc-900">
        <h3 className="text-sm font-black tracking-wider uppercase text-zinc-600 mb-4">
          Standout Vehicles
        </h3>

        {/* Best Value */}
        {stats.bestValue && (
          <button
            onClick={() => navigate(`/car/${stats.bestValue!.id}`)}
            className="w-full text-left p-3 bg-black border border-zinc-800 hover:border-zinc-600 transition-colors rounded-none group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-widest text-zinc-400 uppercase font-black">
                Best Value
              </span>
              <svg
                className="w-4 h-4 text-zinc-300 group-hover:text-white group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-white">
              {stats.bestValue.year} {stats.bestValue.make}
            </p>
            <p className="text-xs text-zinc-500">{stats.bestValue.model}</p>
          </button>
        )}

        {/* Highest Power */}
        {stats.highestPower && (
          <button
            onClick={() => navigate(`/car/${stats.highestPower!.id}`)}
            className="w-full text-left p-3 bg-black border border-zinc-800 hover:border-zinc-600 transition-colors rounded-none group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-widest text-zinc-400 uppercase font-black">
                Highest Power
              </span>
              <svg
                className="w-4 h-4 text-zinc-300 group-hover:text-white group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-white">
              {stats.highestPower.year} {stats.highestPower.make}
            </p>
            <p className="text-xs text-zinc-500">
              {stats.highestPower.model} • {stats.highestPower.engine.horsepower} HP
            </p>
          </button>
        )}

        {/* Best Economy */}
        {stats.bestEconomy && stats.bestEconomy.fuelEconomy.combined && (
          <button
            onClick={() => navigate(`/car/${stats.bestEconomy!.id}`)}
            className="w-full text-left p-3 bg-black border border-zinc-800 hover:border-zinc-600 transition-colors rounded-none group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-widest text-zinc-400 uppercase font-black">
                Best Economy
              </span>
              <svg
                className="w-4 h-4 text-zinc-300 group-hover:text-white group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-white">
              {stats.bestEconomy.year} {stats.bestEconomy.make}
            </p>
            <p className="text-xs text-zinc-500">
              {stats.bestEconomy.model} • {stats.bestEconomy.fuelEconomy.combined} MPG
            </p>
          </button>
        )}
      </div>

      {/* Body Style Breakdown */}
      {Object.keys(stats.bodyStyleBreakdown).length > 0 && (
        <div className="pt-6 mt-6 border-t border-zinc-900">
          <h3 className="text-sm font-black tracking-wider uppercase text-zinc-600 mb-4">
            Body Style Mix
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.bodyStyleBreakdown)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([style, count]) => {
                const percentage = ((count / stats.count) * 100).toFixed(0);
                return (
                  <div key={style}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs tracking-wider text-zinc-500 capitalize">
                        {style}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1">
                      <div
                        className="bg-white h-1 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
