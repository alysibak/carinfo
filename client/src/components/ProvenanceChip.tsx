import type { ProvenanceSource } from '../types/car.types';

const LABELS: Record<ProvenanceSource, string> = {
  epa: 'EPA',
  nrcan: 'NRCan',
  nhtsa: 'NHTSA',
  estimated: 'Est.',
  curated: 'Maker',
};

/**
 * A label, not a button: small capitals with no box, which read as a tag a
 * mouse should press. An estimate is set apart in italics.
 */
const STYLES: Record<ProvenanceSource, string> = {
  epa: 'text-zinc-400',
  nrcan: 'text-zinc-400',
  nhtsa: 'text-zinc-400',
  estimated: 'text-zinc-400 italic',
  curated: 'text-zinc-400',
};

interface ProvenanceChipProps {
  source?: ProvenanceSource;
  className?: string;
}

export default function ProvenanceChip({ source, className = '' }: ProvenanceChipProps) {
  if (!source) return null;
  return (
    <span
      // The question-mark cursor: hovering explains where the figure is from.
      className={`inline-block text-[11px] font-semibold uppercase tracking-[0.08em] leading-none cursor-help ${STYLES[source]} ${className}`}
      title={
        source === 'epa'
          ? 'EPA verified via FuelEconomy.gov'
          : source === 'nrcan'
            ? "Natural Resources Canada's fuel consumption ratings (a car EPA never rated)"
            : source === 'nhtsa'
              ? 'NHTSA verified'
              : source === 'estimated'
                ? 'Estimated value'
                : source === 'curated'
                  ? "The manufacturer's published figure"
                  : 'Curated data'
      }
    >
      {LABELS[source]}
    </span>
  );
}
