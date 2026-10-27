import type { CarDashboard } from '../types/car.types';
import { buildKeyFigures, type KeyFigure, type Tone } from '../utils/keyFigures';
import ProvenanceChip from './ProvenanceChip';
import RatingStars from './RatingStars';
import { SpecExplain } from './SpecExplain';

const TONE_CLASS = {
  better: 'text-accent',
  worse: 'text-amber-300',
  neutral: 'text-zinc-300',
} as const;

const BAR_TONE = {
  better: 'bg-accent',
  worse: 'bg-amber-300',
  neutral: 'bg-zinc-300',
} as const;

/**
 * The car's figure as a bar, and a mark where the class's middle sits: the
 * sentence beneath says the same in words.
 */
function AgainstClass({ scale, tone }: { scale: NonNullable<KeyFigure['scale']>; tone: Tone }) {
  const top = Math.max(scale.car, scale.typical) * 1.25;
  return (
    <div className="relative h-1.5 mt-3 bg-white/[0.07]" aria-hidden>
      <div
        className={`absolute inset-y-0 left-0 origin-left animate-grow-x motion-reduce:animate-none ${BAR_TONE[tone]}`}
        style={{ width: `${(scale.car / top) * 100}%` }}
      />
      {/* The typical car's mark, standing proud of the bar. */}
      <div
        className="absolute -top-1 -bottom-1 w-0.5 bg-white"
        style={{ left: `calc(${(scale.typical / top) * 100}% - 1px)` }}
      />
    </div>
  );
}

function FigureCell({ figure, wide }: { figure: KeyFigure; wide: boolean }) {
  const long = figure.value.length > 8;
  return (
    <div
      className={`spotlight bg-black/75 backdrop-blur-md px-4 py-4 sm:px-5 sm:py-5 min-w-0 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}
    >
      {/* The source stays top right; a long label wraps beside it rather than
          pushing the chip onto a line of its own on a phone. */}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex items-center gap-x-1.5 gap-y-1 flex-wrap text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          <span>{figure.label}</span>
          {figure.glossaryKey && <SpecExplain glossaryKey={figure.glossaryKey} />}
        </p>
        {figure.source && <ProvenanceChip source={figure.source} className="shrink-0" />}
      </div>
      <p className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
        <span
          className={`font-semibold tabular-nums tracking-[-0.03em] leading-none wrap-break-word ${
            figure.missing
              ? 'text-lg text-zinc-400 tracking-tight'
              : long
                ? 'text-2xl sm:text-3xl text-white'
                : 'text-[2rem] sm:text-[2.6rem] text-white'
          }`}
        >
          {figure.value}
        </span>
        {figure.unit && <span className="text-sm text-zinc-400">{figure.unit}</span>}
        {figure.stars != null && (
          <RatingStars
            stars={figure.stars}
            className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] ml-1 self-center"
          />
        )}
      </p>
      {figure.detail && <p className="text-xs text-zinc-500 mt-2">{figure.detail}</p>}
      {figure.scale && figure.comparison && (
        <AgainstClass scale={figure.scale} tone={figure.comparison.tone} />
      )}
      {figure.comparison && (
        <p className={`text-[13px] leading-snug mt-2 ${TONE_CLASS[figure.comparison.tone]}`}>
          {figure.comparison.text}
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
 * The figures a car page leads with (see utils/keyFigures.ts): what EPA and
 * NHTSA recorded, each marked with its source, and one line saying what the
 * class comparison is drawn from.
 */
export default function KeyFigures({
  dashboard,
  fuelCost,
}: {
  dashboard: CarDashboard;
  fuelCost?: Parameters<typeof buildKeyFigures>[1];
}) {
  const figures = buildKeyFigures(dashboard, fuelCost);
  if (figures.length === 0) return null;
  const cls = dashboard.classComparison;
  const lgCols =
    figures.length >= 4
      ? 'lg:grid-cols-4'
      : figures.length === 3
        ? 'lg:grid-cols-3'
        : 'lg:grid-cols-2';

  return (
    <div>
      <div
        className={`grid grid-cols-2 ${lgCols} gap-px bg-white/[0.09] border border-white/10 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]`}
      >
        {figures.map((figure, i) => (
          <FigureCell
            key={figure.id}
            figure={figure}
            wide={figures.length % 2 === 1 && i === figures.length - 1}
          />
        ))}
      </div>
      {cls && (cls.fuel || cls.horsepower) && (
        <p className="text-xs text-zinc-500 mt-2.5">
          Compared with {classCount(cls.models, cls.className)}, {cls.years.min}–{cls.years.max}.
        </p>
      )}
    </div>
  );
}
