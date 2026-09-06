import type { CarDashboard } from '../types/car.types';
import { buildGlanceMetrics } from '../utils/glanceMetrics';
import GlanceMetricCell from './GlanceMetricCell';

function CategoricalFallback({ car }: { car: CarDashboard['car'] }) {
  const chips = [car.bodyStyle, car.driveType, car.engine.fuelType, car.countryOfOrigin].filter(
    Boolean,
  );

  return (
    <div className="py-4 text-center">
      <p className="text-xs text-zinc-500">
        {chips.join(' · ') || 'Open the dossier for the full specification breakdown.'}
      </p>
    </div>
  );
}

function glanceGridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-4';
}

export default function GlanceRow({ dashboard }: { dashboard: CarDashboard }) {
  const { cells, note } = buildGlanceMetrics(dashboard);

  if (cells.length === 0) {
    return (
      <div className="page-wrap-wide">
        <CategoricalFallback car={dashboard.car} />
      </div>
    );
  }

  return (
    <div className="page-wrap-wide">
      <div className={`grid gap-px bg-zinc-800 ${glanceGridClass(cells.length)}`}>
        {cells.map((metric) => (
          <GlanceMetricCell key={metric.id} metric={metric} />
        ))}
      </div>
      {note && <p className="py-2 text-[10px] text-zinc-500">{note}</p>}
    </div>
  );
}
