import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ZAxis,
} from 'recharts';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import AggregateStats from '../components/AggregateStats';

type AxisMode = 'horsepower' | 'mpg' | 'torque';

interface ChartDataPoint {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  horsepower: number;
  mpg: number;
  torque: number;
  bodyStyle: string;
  color: string;
}

const BODY_STYLE_COLORS: Record<string, string> = {
  sedan: '#3b82f6', // blue
  suv: '#ef4444', // red
  coupe: '#10b981', // green
  truck: '#f59e0b', // amber
  convertible: '#8b5cf6', // purple
  hatchback: '#06b6d4', // cyan
  wagon: '#ec4899', // pink
  van: '#6366f1', // indigo
  minivan: '#14b8a6', // teal
};

export default function ValueMatrix() {
  const [allCars, setAllCars] = useState<CarSpecs[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [axisMode, setAxisMode] = useState<AxisMode>('horsepower');
  const [hoveredCar, setHoveredCar] = useState<ChartDataPoint | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 150000]);
  const [selectedBodyStyles, setSelectedBodyStyles] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadCars();
  }, []);

  useEffect(() => {
    if (allCars.length > 0) {
      processChartData();
    }
  }, [allCars, axisMode, priceRange, selectedBodyStyles]);

  const loadCars = async () => {
    setLoading(true);
    try {
      const results = await api.searchCars({ limit: 15000 });
      setAllCars(results.results);
    } catch (error) {
      console.error('Failed to load ValueMatrix cars:', error);
      setAllCars([]);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = () => {
    const data: ChartDataPoint[] = allCars
      .filter((car) => {
        const price = car.price?.msrp || 0;
        const hasValidPrice = price > 0 && price >= priceRange[0] && price <= priceRange[1];
        const hasValidMetric =
          (axisMode === 'horsepower' && car.engine.horsepower > 0) ||
          (axisMode === 'mpg' && (car.fuelEconomy.combined || 0) > 0) ||
          (axisMode === 'torque' && car.engine.torque > 0);

        const matchesBodyStyle =
          selectedBodyStyles.size === 0 || selectedBodyStyles.has(car.bodyStyle);

        return hasValidPrice && hasValidMetric && matchesBodyStyle;
      })
      .map((car) => ({
        id: car.id,
        make: car.make,
        model: car.model,
        year: car.year,
        price: car.price?.msrp || 0,
        horsepower: car.engine.horsepower,
        mpg: car.fuelEconomy.combined || 0,
        torque: car.engine.torque,
        bodyStyle: car.bodyStyle,
        color: BODY_STYLE_COLORS[car.bodyStyle] || '#6b7280',
      }));

    setChartData(data);
  };

  const toggleBodyStyle = (bodyStyle: string) => {
    const newSet = new Set(selectedBodyStyles);
    if (newSet.has(bodyStyle)) {
      newSet.delete(bodyStyle);
    } else {
      newSet.add(bodyStyle);
    }
    setSelectedBodyStyles(newSet);
  };

  const getYAxisLabel = () => {
    switch (axisMode) {
      case 'horsepower':
        return 'HORSEPOWER';
      case 'mpg':
        return 'MPG (COMBINED)';
      case 'torque':
        return 'TORQUE (LB-FT)';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload as ChartDataPoint;

    return (
      <div className="bg-black border-2 border-white p-4 shadow-lg">
        <h3 className="text-lg font-black tracking-tight mb-1">
          {data.year} {data.make.toUpperCase()}
        </h3>
        <p className="text-sm font-light tracking-wider text-zinc-500 mb-3">{data.model}</p>

        <div className="h-px bg-zinc-800 mb-3" />

        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-8">
            <span className="text-zinc-600 tracking-widest uppercase">Price</span>
            <span className="font-bold">${(data.price / 1000).toFixed(0)}K</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-zinc-600 tracking-widest uppercase">Power</span>
            <span className="font-bold">{data.horsepower} HP</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-zinc-600 tracking-widest uppercase">Torque</span>
            <span className="font-bold">{data.torque} LB-FT</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-zinc-600 tracking-widest uppercase">MPG</span>
            <span className="font-bold">{data.mpg}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-zinc-600 tracking-widest uppercase">Type</span>
            <span className="font-bold capitalize">{data.bodyStyle}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-xs tracking-widest text-zinc-700 text-center uppercase">
            Click to view details
          </p>
        </div>
      </div>
    );
  };

  const handleDotClick = (data: any) => {
    if (data && data.id) {
      navigate(`/car/${data.id}`);
    }
  };

  const uniqueBodyStyles = Array.from(
    new Set(allCars.map((car) => car.bodyStyle))
  ).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-xs tracking-[0.3em] text-zinc-700 uppercase">
            Loading Market Data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-900">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors group"
            >
              <svg
                className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                />
              </svg>
              <span>HOME</span>
            </Link>

            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                VALUE MATRIX
              </h1>
              <p className="text-xs tracking-[0.3em] text-zinc-700 mt-1">
                {chartData.length.toLocaleString()} VEHICLES PLOTTED
              </p>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="pt-32 pb-16 px-8">
        <div className="max-w-7xl mx-auto">
          {/* Controls */}
          <div className="mb-8 space-y-6">
            {/* Axis Mode Toggle */}
            <div>
              <label className="block text-xs tracking-widest text-zinc-700 mb-3 uppercase">
                Y-Axis Metric
              </label>
              <div className="flex items-center gap-2">
                {(['horsepower', 'mpg', 'torque'] as AxisMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAxisMode(mode)}
                    className={`px-6 py-3 text-xs tracking-widest font-bold uppercase transition-all ${
                      axisMode === mode
                        ? 'bg-white text-black'
                        : 'bg-zinc-950 border border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {mode === 'mpg' ? 'MPG' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Style Filters */}
            <div>
              <label className="block text-xs tracking-widest text-zinc-700 mb-3 uppercase">
                Filter by Body Style
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {uniqueBodyStyles.map((style) => (
                  <button
                    key={style}
                    onClick={() => toggleBodyStyle(style)}
                    className={`px-4 py-2 text-xs tracking-widest font-bold uppercase transition-all ${
                      selectedBodyStyles.size === 0 || selectedBodyStyles.has(style)
                        ? 'border-2 text-white'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-700'
                    }`}
                    style={{
                      borderColor:
                        selectedBodyStyles.size === 0 || selectedBodyStyles.has(style)
                          ? BODY_STYLE_COLORS[style]
                          : undefined,
                      backgroundColor:
                        selectedBodyStyles.size === 0 || selectedBodyStyles.has(style)
                          ? `${BODY_STYLE_COLORS[style]}20`
                          : undefined,
                    }}
                  >
                    <span
                      className="inline-block w-3 h-3 mr-2 border border-white"
                      style={{ backgroundColor: BODY_STYLE_COLORS[style] }}
                    />
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs tracking-widest text-zinc-700 mb-3 uppercase">
                Price Range: ${(priceRange[0] / 1000).toFixed(0)}K - $
                {(priceRange[1] / 1000).toFixed(0)}K
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="150000"
                  step="5000"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="150000"
                  step="5000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-zinc-950 border border-zinc-900 p-8">
            <ResponsiveContainer width="100%" height={600}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  type="number"
                  dataKey="price"
                  name="Price"
                  stroke="#71717a"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  label={{
                    value: 'PRICE (USD)',
                    position: 'bottom',
                    offset: 40,
                    style: { fill: '#71717a', fontSize: 12, fontWeight: 'bold' },
                  }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <YAxis
                  type="number"
                  dataKey={axisMode}
                  name={getYAxisLabel()}
                  stroke="#71717a"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  label={{
                    value: getYAxisLabel(),
                    angle: -90,
                    position: 'left',
                    offset: 40,
                    style: { fill: '#71717a', fontSize: 12, fontWeight: 'bold' },
                  }}
                />
                <ZAxis range={[50, 50]} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter
                  data={chartData}
                  onClick={handleDotClick}
                  onMouseEnter={(data) => setHoveredCar(data)}
                  onMouseLeave={() => setHoveredCar(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={hoveredCar?.id === entry.id ? 1 : 0.7}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Stats, Legend & Insights */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Aggregate Stats */}
            <AggregateStats
              cars={allCars.filter((car) => {
                const price = car.price?.msrp || 0;
                const hasValidPrice = price > 0 && price >= priceRange[0] && price <= priceRange[1];
                const hasValidMetric =
                  (axisMode === 'horsepower' && car.engine.horsepower > 0) ||
                  (axisMode === 'mpg' && (car.fuelEconomy.combined || 0) > 0) ||
                  (axisMode === 'torque' && car.engine.torque > 0);
                const matchesBodyStyle =
                  selectedBodyStyles.size === 0 || selectedBodyStyles.has(car.bodyStyle);
                return hasValidPrice && hasValidMetric && matchesBodyStyle;
              })}
              title="FILTERED RESULTS"
            />

            {/* Legend */}
            <div className="bg-zinc-950 border border-zinc-900 p-6">
              <h2 className="text-lg font-black tracking-tight mb-4 uppercase">Legend</h2>
              <div className="space-y-2">
                {uniqueBodyStyles.map((style) => (
                  <div key={style} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 border border-zinc-700"
                      style={{ backgroundColor: BODY_STYLE_COLORS[style] }}
                    />
                    <span className="text-sm tracking-wider capitalize">{style}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="bg-zinc-950 border border-zinc-900 p-6">
              <h2 className="text-lg font-black tracking-tight mb-4 uppercase">
                How to Read This
              </h2>
              <div className="space-y-3 text-sm tracking-wider text-zinc-500">
                <p>
                  <span className="text-white font-bold">Bottom Right:</span> High value (low
                  price, high performance)
                </p>
                <p>
                  <span className="text-white font-bold">Top Left:</span> Premium pricing (high
                  price, moderate performance)
                </p>
                <p>
                  <span className="text-white font-bold">Outliers:</span> Click dots far from the
                  trend line for unique deals
                </p>
                <p>
                  <span className="text-white font-bold">Clusters:</span> Groups show market
                  segments (economy, luxury, performance)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
