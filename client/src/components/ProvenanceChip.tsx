import type { ProvenanceSource } from '../types/car.types';

const LABELS: Record<ProvenanceSource, string> = {
  epa: 'EPA',
  nhtsa: 'NHTSA',
  estimated: 'Est.',
  curated: 'Curated',
};

/** Monochrome palette — no blue/green accents; fits the archive theme everywhere. */
const STYLES: Record<ProvenanceSource, string> = {
  epa: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  nhtsa: 'bg-zinc-900 text-zinc-400 border-zinc-700',
  estimated: 'bg-zinc-950 text-zinc-500 border-zinc-800 border-dashed',
  curated: 'bg-zinc-900 text-zinc-400 border-zinc-700',
};

interface ProvenanceChipProps {
  source?: ProvenanceSource;
  className?: string;
}

export default function ProvenanceChip({ source, className = '' }: ProvenanceChipProps) {
  if (!source) return null;
  return (
    <span
      className={`inline-block text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 border ${STYLES[source]} ${className}`}
      title={
        source === 'epa'
          ? 'EPA verified via FuelEconomy.gov'
          : source === 'nhtsa'
            ? 'NHTSA verified'
            : source === 'estimated'
              ? 'Estimated value'
              : 'Curated data'
      }
    >
      {LABELS[source]}
    </span>
  );
}
