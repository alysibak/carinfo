import { Link } from 'react-router-dom';
import type { CarDashboard } from '../types/car.types';
import { buildDecisionStats, type DecisionStat } from '../utils/decisionStats';
import { SpecExplain } from './SpecExplain';

const TONE_CLASS = {
  better: 'text-accent',
  worse: 'text-amber-300',
  neutral: 'text-zinc-300',
} as const;

function StatCell({ stat, wide }: { stat: DecisionStat; wide: boolean }) {
  const long = stat.value.length > 8;
  return (
    <div
      className={`bg-black px-4 py-4 sm:px-5 sm:py-5 min-w-0 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}
    >
      <p className="field-label flex items-center gap-1.5">
        <span>{stat.label}</span>
        {stat.glossaryKey && <SpecExplain glossaryKey={stat.glossaryKey} />}
      </p>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
        <span
          className={`font-bold tabular-nums tracking-tight leading-tight break-words ${
            stat.missing
              ? 'text-lg text-zinc-400'
              : long
                ? 'text-xl sm:text-2xl text-white'
                : 'text-2xl sm:text-3xl text-white'
          }`}
        >
          {stat.value}
        </span>
        {stat.unit && <span className="text-sm text-zinc-400">{stat.unit}</span>}
      </p>
      {stat.detail && <p className="text-xs text-zinc-500 mt-1">{stat.detail}</p>}
      {stat.comparison && (
        <p className={`text-[13px] leading-snug mt-2 ${TONE_CLASS[stat.comparison.tone]}`}>
          {stat.comparison.text}
        </p>
      )}
    </div>
  );
}

/** "7 sport compacts", "20 compact SUVs". */
function classCount(count: number, className: string): string {
  const noun = className.charAt(0).toLowerCase() + className.slice(1);
  return `${count} ${noun}${count === 1 || noun.endsWith('s') ? '' : 's'}`;
}

/**
 * The figures a car page leads with (see utils/decisionStats.ts), and one line
 * saying once what every figure is: an estimate, in CAD, for this region, set
 * against these rivals.
 */
export default function DecisionStats({
  dashboard,
  regionLabel,
}: {
  dashboard: CarDashboard;
  regionLabel: string;
}) {
  const stats = buildDecisionStats(dashboard);
  if (stats.length === 0) return null;
  const cls = dashboard.classComparison;
  const lgCols =
    stats.length >= 5 ? 'lg:grid-cols-5' : stats.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <div>
      <div className={`grid grid-cols-2 ${lgCols} gap-px bg-zinc-800 border border-zinc-800`}>
        {stats.map((stat, i) => (
          <StatCell
            key={stat.id}
            stat={stat}
            wide={stats.length % 2 === 1 && i === stats.length - 1}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-500 mt-2.5 leading-relaxed">
        {dashboard.ownership.unvalued
          ? 'EPA and NHTSA figures'
          : `Estimates in CAD for ${regionLabel}`}
        {cls &&
          `, set against ${classCount(cls.models, cls.className)} from ${cls.years.min}–${cls.years.max}`}
        .{' '}
        <Link to="/methodology" className="underline underline-offset-2 hover:text-zinc-300">
          How we estimate
        </Link>
      </p>
    </div>
  );
}
