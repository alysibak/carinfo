import type { CarDashboard } from '../types/car.types';
import { buildGlanceMetrics } from '../utils/glanceMetrics';
import type { TrustFilter } from '../utils/dataTrust';
import GlanceMetricCell from './GlanceMetricCell';

function passesTrustFilter(
  metric: ReturnType<typeof buildGlanceMetrics>['cells'][number],
  filter: TrustFilter,
): boolean {
  if (filter === 'all') return true;
  const isEstimated = metric.estimated === true || metric.trustSource === 'estimated';
  if (filter === 'estimated') return isEstimated;
  return (
    !isEstimated &&
    (metric.trustSource === 'epa' ||
      metric.trustSource === 'nhtsa' ||
      metric.trustSource === 'curated' ||
      metric.verified === true)
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
    <div className="bg-black px-4 py-6 text-center col-span-full">
      <p className="text-[10px] tracking-widest text-zinc-400 uppercase mb-4">At a glance</p>
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {chips.map((chip) => (
          <span
            key={chip}
            className="px-2 py-0.5 border border-zinc-700 text-[10px] tracking-widest text-zinc-400 uppercase bg-transparent"
          >
            {chip}
          </span>
        ))}
      </div>
      <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
        Open the dossier for the full specification breakdown.
      </p>
    </div>
  );
}

export default function GlanceRow({
  dashboard,
  trustFilter = 'all',
}: {
  dashboard: CarDashboard;
  trustFilter?: TrustFilter;
}) {
  const { cells: allCells, note } = buildGlanceMetrics(dashboard);
  const cells = allCells.filter((c) => passesTrustFilter(c, trustFilter));

  if (cells.length === 0) {
    return (
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-7xl mx-auto border border-zinc-800">
          <CategoricalFallback car={dashboard.car} />
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-zinc-800 bg-black">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 border border-zinc-800">
        {cells.map((metric) => (
          <GlanceMetricCell key={metric.id} metric={metric} />
        ))}
      </div>
      {note && (
        <p className="max-w-7xl mx-auto px-4 py-2 text-[10px] tracking-wide text-zinc-400 text-center border-x border-b border-zinc-800">
          {note}
        </p>
      )}
    </div>
  );
}
