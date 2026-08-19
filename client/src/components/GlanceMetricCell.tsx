import TrustLabel from './ui';
import type { GlanceMetric } from '../utils/glanceMetrics';

function parseInstrument(metric: GlanceMetric): { number: string; unit?: string } {
  if (metric.unavailable) return { number: '-' };

  const v = metric.value.trim();
  const hp = v.match(/^([\d,.]+)\s*hp$/i);
  if (hp) return { number: hp[1], unit: 'HP' };

  const stars = v.match(/^([\d]+)\/5/);
  if (stars) return { number: stars[1], unit: 'STARS' };

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
  const numSize = size === 'compact' ? 'text-4xl' : 'text-5xl';

  return (
    <div className="bg-zinc-950 p-4 min-w-0 flex-1 flex flex-col items-center justify-center text-center">
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 flex items-center justify-center gap-1.5 flex-wrap">
        {metric.label}
        {metric.estimated && <TrustLabel estimated className="!text-[7px] !px-1" />}
        {metric.trustSource && !metric.estimated && (
          <TrustLabel source={metric.trustSource} className="!text-[7px] !px-1" />
        )}
        {metric.verified && !metric.trustSource && !metric.estimated && (
          <TrustLabel source="epa" className="!text-[7px] !px-1" />
        )}
      </p>
      <div className="flex items-baseline justify-center gap-1.5 flex-wrap">
        <span
          className={`${numSize} font-bold tabular-nums tracking-normal leading-none ${
            unavailable ? 'text-zinc-700' : 'text-white'
          }`}
        >
          {number}
        </span>
        {unit && !unavailable && (
          <span className="text-xs uppercase tracking-wider text-zinc-400">{unit}</span>
        )}
      </div>
      {metric.detail && !unavailable && (
        <p className="text-xs text-zinc-400 mt-2 leading-snug normal-case">{metric.detail}</p>
      )}
    </div>
  );
}
