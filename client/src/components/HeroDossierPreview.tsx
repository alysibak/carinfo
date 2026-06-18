import { Link } from 'react-router-dom';
import type { CarDashboard } from '../types/car.types';
import { buildGlanceMetrics } from '../utils/glanceMetrics';
import { displayListingSubtitle, displayModelLabel } from '../utils/trimLabel';
import { formatFuelBadge } from '../utils/fuelDisplay';
import { efficiencyUnit } from '../utils/fuelLabels';
import { efficiencySecondaryLine } from '../utils/fuelEconomyUnits';
import { hasNumericValue } from '../utils/dataValue';
import GlanceMetricCell from './GlanceMetricCell';

const UNAVAILABLE_PATTERNS = /not on file|no rating|not in epa/i;

function isPreviewMetric(metric: ReturnType<typeof buildGlanceMetrics>['cells'][0]): boolean {
  if (metric.unavailable) return false;
  if (UNAVAILABLE_PATTERNS.test(metric.value)) return false;
  if (metric.detail && UNAVAILABLE_PATTERNS.test(metric.detail)) return false;
  return true;
}

function PreviewFuelBar({ dashboard }: { dashboard: CarDashboard }) {
  const { car } = dashboard;
  const combined = car.fuelEconomy.combined;
  if (!hasNumericValue(combined)) return null;

  const unit = efficiencyUnit(car);
  const label = unit === 'MPGe' ? 'MPGe' : 'MPG';
  const max = Math.max(
    car.fuelEconomy.city ?? 0,
    car.fuelEconomy.highway ?? 0,
    combined ?? 0,
    1,
  );
  const pct = Math.min(100, (combined! / max) * 100);
  const secondary = efficiencySecondaryLine(combined, label);

  return (
    <div className="px-4 py-3 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">
          Combined {label}
        </span>
        <div className="text-right">
          <span className="text-2xl font-bold tabular-nums text-white">{Math.round(combined!)}</span>
          {secondary && <p className="text-xs text-zinc-500 mt-0.5">{secondary}</p>}
        </div>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function HeroDossierPreview({ dashboard }: { dashboard: CarDashboard }) {
  const { car } = dashboard;
  const subtitle = displayListingSubtitle(car);
  const metrics = buildGlanceMetrics(dashboard).cells
    .filter(isPreviewMetric)
    .filter((m) => m.id !== 'power')
    .slice(0, 4);

  return (
    <Link
      to={`/car/${car.id}`}
      className="group block relative bg-zinc-950 border border-zinc-800 rounded-none overflow-hidden"
    >
      <div
        className="relative max-h-[520px] overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
        }}
      >
        <div className="p-4 border-b border-zinc-800">
          <p className="text-[10px] tracking-widest text-zinc-500 uppercase mb-2">Vehicle dossier</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">
            {car.year} {car.make}
          </p>
          <h3 className="text-xl font-bold text-white tracking-tight leading-tight group-hover:text-zinc-200 transition-colors">
            {displayModelLabel(car)}
          </h3>
          {subtitle && (
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{subtitle}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {car.bodyStyle && <span className="spec-chip">{car.bodyStyle}</span>}
            <span className="spec-chip">{formatFuelBadge(car.engine.fuelType)}</span>
            {car.countryOfOrigin && <span className="spec-chip">{car.countryOfOrigin}</span>}
          </div>
        </div>

        {metrics.length > 0 && (
          <div className="flex divide-x divide-zinc-800 border-t border-zinc-800">
            {metrics.map((metric) => (
              <GlanceMetricCell key={metric.id} metric={metric} size="compact" />
            ))}
          </div>
        )}

        <PreviewFuelBar dashboard={dashboard} />

        <p className="px-4 py-3 text-xs uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300 transition-colors">
          View full dossier →
        </p>
      </div>
    </Link>
  );
}
