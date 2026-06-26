import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { ChartPoint } from '../services/api';
import AboutData from '../components/AboutData';
import ProvenanceChip from '../components/ProvenanceChip';
import { formatMpgForCard } from '../utils/dataValue';
import { DISPLAY_CURRENCY } from '../utils/currency';
import { usePageMeta } from '../utils/pageMeta';

type AxisMode = 'mpg' | 'displacement' | 'co2';
type ViewPhase = 'choose' | 'chart';

interface ChartDataPoint extends ChartPoint {
  color: string;
  stroke: string;
  dotSize: number;
}

interface MatrixPreset {
  id: string;
  title: string;
  description: string;
  priceRange: [number, number];
  bodyStyles: string[];
  axisMode: AxisMode;
  pointLimit: number;
}

const PRESETS: MatrixPreset[] = [
  {
    id: 'commuter',
    title: 'Daily drivers',
    description: 'Sedans & SUVs between $10k–$35k. Fuel economy vs estimated value.',
    priceRange: [10000, 35000],
    bodyStyles: ['sedan', 'suv'],
    axisMode: 'mpg',
    pointLimit: 350,
  },
  {
    id: 'budget',
    title: 'Under $20k',
    description: 'Affordable options with real EPA mileage data.',
    priceRange: [2000, 20000],
    bodyStyles: ['sedan', 'suv', 'coupe', 'wagon'],
    axisMode: 'mpg',
    pointLimit: 350,
  },
  {
    id: 'trucks',
    title: 'Trucks & work',
    description: 'Pickups and work vehicles. Engine size vs value.',
    priceRange: [15000, 65000],
    bodyStyles: ['truck'],
    axisMode: 'displacement',
    pointLimit: 250,
  },
  {
    id: 'recent',
    title: '2018 and newer',
    description: 'Newer model years across all types. Efficiency focus.',
    priceRange: [18000, 80000],
    bodyStyles: [],
    axisMode: 'mpg',
    pointLimit: 400,
  },
];

const BODY_STYLE_COLORS: Record<string, string> = {
  sedan: '#ffffff',
  suv: '#93c5fd',
  coupe: '#fda4af',
  truck: '#fdba74',
  van: '#c4b5fd',
  minivan: '#86efac',
  wagon: '#e2e8f0',
};

const BODY_STYLE_STROKES: Record<string, string> = {
  sedan: '#ffffff',
  suv: '#38bdf8',
  coupe: '#fb7185',
  truck: '#fb923c',
  van: '#a78bfa',
  minivan: '#4ade80',
  wagon: '#94a3b8',
};

const BODY_STYLE_SIZES: Record<string, number> = {
  sedan: 52,
  suv: 68,
  coupe: 56,
  truck: 76,
  van: 60,
  minivan: 64,
  wagon: 54,
};

const KNOWN_BODY_STYLES = ['sedan', 'suv', 'coupe', 'truck', 'van', 'minivan', 'wagon'];
const POINT_LIMIT_STEPS = [350, 800, 2000] as const;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function useChartHeight() {
  const [height, setHeight] = useState(400);
  useEffect(() => {
    const update = () => {
      setHeight(window.innerWidth < 640 ? 300 : window.innerWidth < 1024 ? 380 : 480);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return height;
}

function MatrixLegend() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span className="text-[10px] tracking-widest uppercase text-zinc-600">Axes</span>
        <span className="flex items-center gap-1.5">
          X: Est. value <ProvenanceChip source="estimated" />
        </span>
        <span className="flex items-center gap-1.5">
          Y: EPA pipeline <ProvenanceChip source="epa" />
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center sm:justify-start">
      {KNOWN_BODY_STYLES.map((style) => (
        <div key={style} className="flex items-center gap-2 text-xs text-zinc-400 capitalize">
          <span
            className="inline-block w-3 h-3 rounded-full border-2 shrink-0"
            style={{
              backgroundColor: BODY_STYLE_COLORS[style],
              borderColor: BODY_STYLE_STROKES[style],
            }}
          />
          {style}
        </div>
      ))}
      <div className="flex items-center gap-2 text-xs text-zinc-500 w-full sm:w-auto sm:ml-2">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white" />
          <span className="w-3 h-3 rounded-full bg-white" />
          <span className="w-4 h-4 rounded-full bg-white" />
        </span>
        Larger dot = newer year
      </div>
    </div>
    </div>
  );
}

export default function ValueMatrix() {
  usePageMeta(
    'Value Matrix',
    'Scatter plot of Ontario/CAD estimates against EPA fuel economy, engine size, or emissions with source labels.',
  );
  const [phase, setPhase] = useState<ViewPhase>('choose');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [axisMode, setAxisMode] = useState<AxisMode>('mpg');
  const [priceRange, setPriceRange] = useState<[number, number]>([10000, 35000]);
  const [selectedBodyStyles, setSelectedBodyStyles] = useState<Set<string>>(new Set(['sedan', 'suv']));
  const [pointLimit, setPointLimit] = useState<number>(POINT_LIMIT_STEPS[0]);
  const [yearMin, setYearMin] = useState<number | undefined>(undefined);
  const [hovered, setHovered] = useState<ChartDataPoint | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const navigate = useNavigate();
  const chartHeight = useChartHeight();

  const debouncedPrice = useDebouncedValue(priceRange, 400);

  const applyPreset = (preset: MatrixPreset) => {
    setActivePresetId(preset.id);
    setPriceRange(preset.priceRange);
    setSelectedBodyStyles(new Set(preset.bodyStyles));
    setAxisMode(preset.axisMode);
    setPointLimit(preset.pointLimit);
    setYearMin(preset.id === 'recent' ? 2018 : undefined);
    setPhase('chart');
  };

  const loadChartData = useCallback(async () => {
    if (phase !== 'chart') return;
    setLoading(true);
    setError(null);
    try {
      const { points } = await api.getChartPoints({
        priceMin: debouncedPrice[0],
        priceMax: debouncedPrice[1],
        bodyStyles: selectedBodyStyles.size > 0 ? Array.from(selectedBodyStyles) : undefined,
        yearMin,
        limit: pointLimit,
      });

      let filtered = points.filter((car) => {
        if (axisMode === 'mpg') return car.mpg > 0;
        if (axisMode === 'displacement') return car.displacement > 0;
        return car.co2 > 0;
      });

      const data: ChartDataPoint[] = filtered.map((car) => ({
        ...car,
        color: BODY_STYLE_COLORS[car.bodyStyle] || '#a1a1aa',
        stroke: BODY_STYLE_STROKES[car.bodyStyle] || '#d4d4d8',
        dotSize: BODY_STYLE_SIZES[car.bodyStyle] || 56,
      }));

      setChartData(data);
    } catch {
      setError('Unable to load chart data.');
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [phase, debouncedPrice, selectedBodyStyles, axisMode, pointLimit, yearMin]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const toggleBodyStyle = (bodyStyle: string) => {
    setActivePresetId(null);
    setSelectedBodyStyles((prev) => {
      const next = new Set(prev);
      if (next.has(bodyStyle)) next.delete(bodyStyle);
      else next.add(bodyStyle);
      return next;
    });
  };

  const getYAxisLabel = () => {
    switch (axisMode) {
      case 'mpg':
        return 'Combined MPG';
      case 'displacement':
        return 'Engine (L)';
      case 'co2':
        return 'CO₂ (g/mi)';
    }
  };

  const canShowMore = pointLimit < POINT_LIMIT_STEPS[POINT_LIMIT_STEPS.length - 1];
  const nextLimit = POINT_LIMIT_STEPS.find((s) => s > pointLimit) ?? pointLimit;

  const avgPrice = useMemo(
    () =>
      chartData.length > 0
        ? Math.round(chartData.reduce((s, c) => s + c.price, 0) / chartData.length)
        : 0,
    [chartData],
  );
  const avgMpg = useMemo(() => {
    const withMpg = chartData.filter((c) => c.mpg > 0);
    return withMpg.length > 0
      ? Math.round(withMpg.reduce((s, c) => s + c.mpg, 0) / withMpg.length)
      : 0;
  }, [chartData]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataPoint }>;
  }) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-950 border border-zinc-600 p-4 max-w-xs">
        <p className="text-base font-black text-white mb-0.5">
          {data.year} {data.make}
        </p>
        <p className="text-sm text-zinc-300 mb-3">{data.model}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-6 items-center">
            <span className="text-zinc-400">Est. value</span>
            <span className="flex items-center gap-2">
              <span className="font-bold text-white">${data.price.toLocaleString()}</span>
              {data.priceIsEstimated && <ProvenanceChip source="estimated" />}
            </span>
          </div>
          <div className="flex justify-between gap-6 items-center">
            <span className="text-zinc-400">
              {axisMode === 'mpg' ? 'MPG' : axisMode === 'co2' ? 'CO₂' : 'Engine'}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-bold text-white">
                {axisMode === 'mpg'
                  ? formatMpgForCard(data.mpg)
                  : axisMode === 'co2'
                    ? data.co2
                    : `${data.displacement}L`}
              </span>
              <ProvenanceChip source={data.ySource === 'epa' ? 'epa' : 'estimated'} />
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-zinc-400">Type</span>
            <span className="font-bold text-white capitalize">{data.bodyStyle}</span>
          </div>
        </div>
        <p className="mt-3 pt-3 border-t border-zinc-700 text-xs text-zinc-400 text-center">
          Click dot for full dossier
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="page-wrap py-6 sm:py-8 border-b border-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Value Matrix</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {phase === 'chart' && chartData.length > 0
                ? `${chartData.length.toLocaleString()} vehicles · X: Ontario/CAD estimates · Y: EPA ${axisMode === 'mpg' ? 'MPG' : axisMode === 'co2' ? 'CO₂' : 'engine size'}`
                : 'Plot labeled estimates against EPA fuel economy, engine size, or emissions'}
            </p>
          </div>
          <AboutData compact />
        </div>
      </div>

      <div className="page-wrap py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          {phase === 'choose' ? (
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3">
                  What do you want to compare?
                </h2>
                <p className="text-base text-zinc-300 leading-relaxed">
                  Each dot is one vehicle. Pick a starting lens and we show a{' '}
                  <strong className="text-white font-semibold">focused sample</strong>, not all 28,000
                  at once. You can widen the view after.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="text-left p-6 border border-zinc-700 bg-zinc-950 hover:border-white hover:bg-zinc-900 transition-colors group"
                  >
                    <p className="text-sm font-black tracking-wide text-white mb-2 group-hover:underline underline-offset-4">
                      {preset.title}
                    </p>
                    <p className="text-sm text-zinc-400 leading-relaxed">{preset.description}</p>
                    <p className="text-xs text-zinc-400 mt-3">
                      ~{preset.pointLimit} vehicles · ${(preset.priceRange[0] / 1000).toFixed(0)}k–
                      ${(preset.priceRange[1] / 1000).toFixed(0)}k
                    </p>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setActivePresetId('custom');
                  setPhase('chart');
                }}
                className="w-full py-4 border border-zinc-600 text-sm text-zinc-300 hover:text-white hover:border-zinc-400 transition-colors"
              >
                Custom filters: I&apos;ll choose everything myself
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setPhase('choose')}
                  className="text-xs tracking-widest text-zinc-400 hover:text-white uppercase border border-zinc-700 px-4 py-2"
                >
                  ← Change focus
                </button>
                {activePresetId && (
                  <span className="text-xs text-zinc-400">
                    View:{' '}
                    <span className="text-white font-semibold">
                      {PRESETS.find((p) => p.id === activePresetId)?.title ?? 'Custom'}
                    </span>
                  </span>
                )}
              </div>

              {/* Filters — compact, readable labels */}
              <div className="mb-6 p-5 border border-zinc-800 bg-zinc-950 space-y-5">
                <div>
                  <p className="text-xs font-bold tracking-widest text-zinc-300 uppercase mb-3">
                    Y-axis metric
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['mpg', 'displacement', 'co2'] as AxisMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setActivePresetId(null);
                          setAxisMode(mode);
                        }}
                        className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                          axisMode === mode
                            ? 'bg-white text-black'
                            : 'border border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white'
                        }`}
                      >
                        {mode === 'mpg' ? 'Fuel economy' : mode === 'displacement' ? 'Engine size' : 'CO₂'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold tracking-widest text-zinc-300 uppercase mb-3">
                    Body style {selectedBodyStyles.size === 0 && '(all types)'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {KNOWN_BODY_STYLES.map((style) => {
                      const active =
                        selectedBodyStyles.size === 0 || selectedBodyStyles.has(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => toggleBodyStyle(style)}
                          className={`inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wide border transition-colors ${
                            active
                              ? 'border-zinc-400 bg-zinc-800 text-white'
                              : 'border-zinc-700 text-zinc-400 line-through'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border shrink-0"
                            style={{
                              backgroundColor: BODY_STYLE_COLORS[style],
                              borderColor: BODY_STYLE_STROKES[style],
                            }}
                          />
                          {style}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePresetId(null);
                        setSelectedBodyStyles(new Set());
                      }}
                      className="px-3 py-2 text-xs uppercase tracking-wide border border-zinc-600 text-zinc-400 hover:text-white"
                    >
                      All types
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold tracking-widest text-zinc-300 uppercase mb-2">
                    Est. value: ${(priceRange[0] / 1000).toFixed(0)}k – ${(priceRange[1] / 1000).toFixed(0)}k
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={120000}
                      step={2500}
                      value={priceRange[0]}
                      onChange={(e) => {
                        setActivePresetId(null);
                        setPriceRange([Math.min(parseInt(e.target.value, 10), priceRange[1] - 2500), priceRange[1]]);
                      }}
                      className="flex-1"
                      aria-label="Minimum price"
                    />
                    <input
                      type="range"
                      min={0}
                      max={120000}
                      step={2500}
                      value={priceRange[1]}
                      onChange={(e) => {
                        setActivePresetId(null);
                        setPriceRange([priceRange[0], Math.max(parseInt(e.target.value, 10), priceRange[0] + 2500)]);
                      }}
                      className="flex-1"
                      aria-label="Maximum price"
                    />
                  </div>
                </div>

                {canShowMore && (
                  <button
                    type="button"
                    onClick={() => setPointLimit(nextLimit)}
                    className="text-xs font-bold tracking-wide text-zinc-300 hover:text-white uppercase border border-dashed border-zinc-600 w-full py-3 hover:border-zinc-400 transition-colors"
                  >
                    Show more vehicles (up to {nextLimit.toLocaleString()} dots)
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <MatrixLegend />
                <div className="flex rounded-none border border-zinc-700 overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('chart')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === 'chart' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === 'list' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>

              {hovered && viewMode === 'chart' && (
                <div className="sm:hidden mb-4 p-4 border border-zinc-700 bg-zinc-950 rounded-none">
                  <p className="font-semibold text-white">
                    {hovered.year} {hovered.make} {hovered.model}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1 capitalize">
                    {hovered.bodyStyle} · ${hovered.price.toLocaleString()} · {formatMpgForCard(hovered.mpg)} MPG
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/car/${hovered.id}`)}
                    className="mt-3 text-xs text-white underline"
                  >
                    View details →
                  </button>
                </div>
              )}

              {/* Chart */}
              <div className="relative border border-zinc-700 bg-zinc-950 p-2 sm:p-4 md:p-6">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                    <div className="text-center">
                      <div className="inline-block w-10 h-10 border-2 border-zinc-600 border-t-zinc-400 mb-3 opacity-50" />
                      <p className="text-xs text-zinc-300 uppercase tracking-widest">Updating chart</p>
                    </div>
                  </div>
                )}
                {error && !loading && chartData.length === 0 ? (
                  <div className="py-24 text-center">
                    <p className="text-zinc-300 mb-4">{error}</p>
                    <button
                      type="button"
                      onClick={loadChartData}
                      className="px-6 py-3 bg-white text-black text-xs font-bold uppercase"
                    >
                      Retry
                    </button>
                  </div>
                ) : chartData.length === 0 && !loading ? (
                  <div className="py-24 text-center px-4">
                    <p className="text-lg text-zinc-300 mb-2">No vehicles match these filters</p>
                    <p className="text-sm text-zinc-400 mb-6">Try widening the price range or adding body types.</p>
                    <button
                      type="button"
                      onClick={() => setPhase('choose')}
                      className="px-6 py-3 border border-zinc-500 text-sm text-white"
                    >
                      Pick a different focus
                    </button>
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="max-h-[480px] overflow-y-auto divide-y divide-zinc-900">
                    {[...chartData]
                      .sort((a, b) => a.price - b.price)
                      .map((car) => (
                        <button
                          key={car.id}
                          type="button"
                          onClick={() => navigate(`/car/${car.id}`)}
                          className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-zinc-900 transition-colors"
                        >
                          <span
                            className="w-3 h-3 rounded-full border-2 shrink-0"
                            style={{ backgroundColor: car.color, borderColor: car.stroke }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">
                              {car.year} {car.make} {car.model}
                            </p>
                            <p className="text-xs text-zinc-500 capitalize">{car.bodyStyle}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium text-white">${(car.price / 1000).toFixed(0)}k</p>
                            <p className="text-xs text-zinc-500">{formatMpgForCard(car.mpg)} MPG</p>
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <ScatterChart margin={{ top: 12, right: 12, bottom: 48, left: 44 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#3f3f46" strokeOpacity={0.8} />
                      <XAxis
                        type="number"
                        dataKey="price"
                        stroke="#71717a"
                        tick={{ fill: '#a1a1aa', fontSize: 11 }}
                        tickLine={{ stroke: '#52525b' }}
                        label={{
                          value: `Est. value (${DISPLAY_CURRENCY})`,
                          position: 'bottom',
                          offset: 28,
                          style: { fill: '#a1a1aa', fontSize: 11, fontWeight: 500 },
                        }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="number"
                        dataKey={axisMode}
                        stroke="#71717a"
                        tick={{ fill: '#a1a1aa', fontSize: 11 }}
                        tickLine={{ stroke: '#52525b' }}
                        label={{
                          value: getYAxisLabel(),
                          angle: -90,
                          position: 'left',
                          offset: 32,
                          style: { fill: '#a1a1aa', fontSize: 11, fontWeight: 500 },
                        }}
                      />
                      <ZAxis type="number" dataKey="year" range={[36, 110]} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#71717a', strokeWidth: 1 }} />
                      <Scatter
                        data={chartData}
                        onClick={(d) => d?.id && navigate(`/car/${d.id}`)}
                        onMouseEnter={(d) => d && setHovered(d as ChartDataPoint)}
                        onMouseLeave={() => setHovered(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {chartData.map((entry, index) => {
                          const isHovered = hovered?.id === entry.id;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke={entry.stroke}
                              strokeWidth={isHovered ? 3 : 2}
                              fillOpacity={hovered && !isHovered ? 0.35 : 0.9}
                            />
                          );
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>

              <p className="mt-3 text-xs text-zinc-500 text-center sm:text-left">
                Color = body style · size = model year · tap or click a dot for details
              </p>

              {hovered && viewMode === 'chart' && (
                <div className="hidden sm:block mt-4 p-4 border border-zinc-800 bg-zinc-950 rounded-none">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">
                        {hovered.year} {hovered.make} {hovered.model}
                      </p>
                      <p className="text-sm text-zinc-400 mt-0.5 capitalize">
                        {hovered.bodyStyle} · ${hovered.price.toLocaleString()} · {formatMpgForCard(hovered.mpg)} MPG
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/car/${hovered.id}`)}
                      className="btn-secondary !py-2 !px-4 !text-xs shrink-0"
                    >
                      View car
                    </button>
                  </div>
                </div>
              )}

              {chartData.length > 0 && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-800 border border-zinc-800">
                  <div className="bg-zinc-950 p-5">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Plotted</p>
                    <p className="text-2xl font-black text-white">{chartData.length.toLocaleString()}</p>
                  </div>
                  <div className="bg-zinc-950 p-5">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Avg est. value</p>
                    <p className="text-2xl font-black text-white">${(avgPrice / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="bg-zinc-950 p-5">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Avg MPG</p>
                    <p className="text-2xl font-black text-white">{formatMpgForCard(avgMpg || null)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
