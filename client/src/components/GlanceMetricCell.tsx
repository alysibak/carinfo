import type { GlanceMetric } from '../utils/glanceMetrics';
import { GLANCE_GLOSSARY } from '../utils/specGlossary';
import { SpecExplain } from './SpecExplain';

function parseInstrument(metric: GlanceMetric): { number: string; unit?: string } {
  if (metric.unavailable) return { number: '-' };

  const v = metric.value.trim();
  const hp = v.match(/^([\d,.]+)\s*hp$/i);
  if (hp) return { number: hp[1], unit: 'HP' };

  const stars = v.match(/^([\d]+)\/5/);
  if (stars) return { number: stars[1], unit: '/5' };

  const mpgFromLabel = metric.label.match(/\b(MPGe?)\b/i)?.[1];
  if (mpgFromLabel && /^[\d.]+$/.test(v)) {
    return { number: v, unit: mpgFromLabel.toUpperCase() };
  }

  if (/^[\d.]+$/.test(v)) return { number: v };

  return { number: v };
}

interface GlanceMetricCellProps {
  metric: GlanceMetric;
  size?: 'default' | 'compact';
}

export default function GlanceMetricCell({ metric, size = 'default' }: GlanceMetricCellProps) {
  const unavailable = metric.unavailable;
  const { number, unit } = parseInstrument(metric);
  const numSize =
    size === 'compact'
      ? 'text-xl sm:text-2xl'
      : 'text-xl sm:text-2xl md:text-3xl';
  const glossaryKey = GLANCE_GLOSSARY[metric.id];
  const estimated = metric.estimated === true || metric.trustSource === 'estimated';

  return (
    <div className="min-w-0 flex-1 flex flex-col items-center justify-center text-center px-1.5 py-2.5 sm:px-3 sm:py-3 bg-black">
      <p className="w-full text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center justify-center gap-1">
        <span className="truncate">{metric.label}</span>
        {glossaryKey && <SpecExplain glossaryKey={glossaryKey} />}
      </p>
      <div className="w-full flex items-baseline justify-center gap-1 min-w-0">
        <span
          className={`${numSize} font-bold tabular-nums leading-none truncate ${
            unavailable ? 'text-zinc-700' : 'text-white'
          }`}
        >
          {number}
        </span>
        {unit && !unavailable && (
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">
            {unit}
          </span>
        )}
      </div>
      {estimated && !unavailable && (
        <p className="text-[9px] text-zinc-600 mt-0.5">est.</p>
      )}
      {metric.detail && !unavailable && !estimated && (
        <p className="text-[10px] text-zinc-500 mt-1 leading-snug normal-case line-clamp-1">
          {metric.detail}
        </p>
      )}
    </div>
  );
}
