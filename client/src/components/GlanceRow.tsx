import type { CarDashboard } from '../types/car.types';
import TrustLabel from './ui';
import { buildGlanceMetrics } from '../utils/glanceMetrics';
import type { GlanceMetric } from '../utils/glanceMetrics';

function GlanceCell({
  metric,
  prominent,
  demoted,
}: {
  metric: GlanceMetric;
  prominent?: boolean;
  demoted?: boolean;
}) {
  const unavailable = metric.unavailable;
  return (
    <div
      className={`bg-black text-center min-w-0 ${
        demoted ? 'p-3 md:p-4' : prominent ? 'p-6 md:p-8' : 'p-4 md:p-5'
      }`}
    >
      <p className="text-[10px] tracking-[0.25em] text-zinc-400 uppercase mb-2 flex items-center justify-center gap-2 flex-wrap">
        {metric.label}
        {metric.verified && <TrustLabel source="epa" />}
        {metric.estimated && <TrustLabel estimated />}
      </p>
      <p
        className={`tracking-tight ${
          unavailable
            ? 'text-sm md:text-base font-normal text-zinc-600 italic'
            : `font-black text-white ${demoted ? 'text-lg md:text-xl' : prominent ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'}`
        }`}
      >
        {metric.value}
      </p>
      {metric.detail && (
        <p
          className={`tracking-widest uppercase mt-2 ${
            unavailable ? 'text-[9px] text-zinc-600 normal-case' : 'text-[10px] text-zinc-500'
          }`}
        >
          {metric.detail}
        </p>
      )}
    </div>
  );
}

function CategoricalFallback({ car }: { car: CarDashboard['car'] }) {
  const chips = [
    car.bodyStyle,
    car.driveType,
    car.engine.fuelType,
    car.countryOfOrigin,
  ].filter(Boolean);

  return (
    <div className="bg-black px-6 py-8 md:py-10 text-center col-span-full">
      <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase mb-4">At a glance</p>
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {chips.map((chip) => (
          <span
            key={chip}
            className="px-3 py-1 border border-zinc-800 text-[10px] tracking-[0.2em] text-zinc-300 uppercase"
          >
            {chip}
          </span>
        ))}
      </div>
      <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
        Detailed efficiency, value, and safety estimates are not available for this configuration.
      </p>
    </div>
  );
}

export default function GlanceRow({ dashboard }: { dashboard: CarDashboard }) {
  const { cells, note } = buildGlanceMetrics(dashboard);

  if (cells.length === 0) {
    return (
      <div className="border-b border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto grid gap-px bg-zinc-900">
          <CategoricalFallback car={dashboard.car} />
        </div>
      </div>
    );
  }

  const cellCount = cells.length;
  const prominent = cellCount <= 2;

  const gridClass =
    cellCount === 1
      ? 'grid-cols-1 max-w-xl mx-auto'
      : cellCount === 2
        ? 'grid-cols-2'
        : cellCount === 3
          ? 'grid-cols-3'
          : 'grid-cols-2 lg:grid-cols-4';

  return (
    <div className="border-b border-zinc-900 bg-zinc-950">
      <div className={`max-w-7xl mx-auto grid ${gridClass} gap-px bg-zinc-900`}>
        {cells.map((metric) => (
          <GlanceCell
            key={metric.id}
            metric={metric}
            prominent={prominent && !metric.unavailable}
            demoted={metric.unavailable}
          />
        ))}
      </div>
      {note && (
        <p className="max-w-7xl mx-auto px-6 py-3 text-[10px] tracking-wide text-zinc-600 text-center border-t border-zinc-900">
          {note}
        </p>
      )}
    </div>
  );
}
