import type { CarDashboard } from '../types/car.types';
import { buildKeyFigures, type KeyFigure } from '../utils/keyFigures';
import ProvenanceChip from './ProvenanceChip';
import { SpecExplain } from './SpecExplain';

const TONE_CLASS = {
  better: 'text-accent',
  worse: 'text-amber-300',
  neutral: 'text-zinc-300',
} as const;

function FigureCell({ figure, wide }: { figure: KeyFigure; wide: boolean }) {
  const long = figure.value.length > 8;
  return (
    <div
      className={`bg-black px-4 py-4 sm:px-5 sm:py-5 min-w-0 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}
    >
      {/* The source stays top right; a long label wraps beside it rather than
          pushing the chip onto a line of its own on a phone. */}
      <div className="flex items-start justify-between gap-2">
        <p className="field-label min-w-0 flex items-center gap-x-1.5 gap-y-1 flex-wrap">
          <span>{figure.label}</span>
          {figure.glossaryKey && <SpecExplain glossaryKey={figure.glossaryKey} />}
        </p>
        {figure.source && <ProvenanceChip source={figure.source} className="shrink-0" />}
      </div>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
        <span
          className={`font-bold tabular-nums tracking-tight leading-tight wrap-break-word ${
            figure.missing
              ? 'text-lg text-zinc-400'
              : long
                ? 'text-xl sm:text-2xl text-white'
                : 'text-2xl sm:text-3xl text-white'
          }`}
        >
          {figure.value}
        </span>
        {figure.unit && <span className="text-sm text-zinc-400">{figure.unit}</span>}
      </p>
      {figure.detail && <p className="text-xs text-zinc-500 mt-1">{figure.detail}</p>}
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
 * NHTSA recorded, each marked with its source, and one line saying where the
 * class comparison comes from and where the estimates are.
 */
export default function KeyFigures({
  dashboard,
  hasEstimates,
}: {
  dashboard: CarDashboard;
  /** Whether the page has an estimated-costs section to point to. */
  hasEstimates: boolean;
}) {
  const figures = buildKeyFigures(dashboard);
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
      <div className={`grid grid-cols-2 ${lgCols} gap-px bg-zinc-800 border border-zinc-800`}>
        {figures.map((figure, i) => (
          <FigureCell
            key={figure.id}
            figure={figure}
            wide={figures.length % 2 === 1 && i === figures.length - 1}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-500 mt-2.5 leading-relaxed">
        Each figure is marked with its source
        {cls &&
          (cls.fuel || cls.horsepower) &&
          `, and compared with ${classCount(cls.models, cls.className)} from ${cls.years.min}–${cls.years.max} on the same records`}
        .
        {hasEstimates && (
          <>
            {' '}
            Estimated value and running costs are{' '}
            <a href="#costs" className="underline underline-offset-2 hover:text-zinc-300">
              further down
            </a>
            .
          </>
        )}
      </p>
    </div>
  );
}
