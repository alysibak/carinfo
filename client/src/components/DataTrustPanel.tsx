import { Link } from 'react-router-dom';
import type { CarDashboard } from '../types/car.types';
import {
  buildProvenanceEntries,
  isVerifiedSource,
  provenanceGlossaryKey,
} from '../utils/dataTrust';
import { ExpandableSection } from './ui';
import { SpecLabel } from './SpecExplain';

const SOURCE_LABEL = {
  epa: 'EPA',
  nhtsa: 'NHTSA',
  curated: 'Curated',
  estimated: 'Estimated',
} as const;

interface DataTrustPanelProps {
  dashboard: CarDashboard;
}

export default function DataTrustPanel({ dashboard }: DataTrustPanelProps) {
  const entries = buildProvenanceEntries(dashboard);
  if (entries.length === 0) return null;

  const verified = entries.filter((e) => isVerifiedSource(e.source)).length;
  const estimated = entries.filter((e) => e.source === 'estimated').length;

  return (
    <section className="border-t border-zinc-900">
      <div className="page-wrap-wide py-4">
        <ExpandableSection
          title="Data sources"
          summary={`${verified} sourced · ${estimated} modeled`}
        >
          <p className="text-xs text-zinc-500 leading-relaxed mb-3">
            Fuel economy and crash ratings come from EPA and NHTSA tests. Value and some
            performance figures are modeled.{' '}
            <Link to="/methodology" className="underline underline-offset-2 hover:text-zinc-300">
              Methodology
            </Link>
          </p>
          <ul className="divide-y divide-zinc-800">
            {entries.map((entry) => (
              <li key={entry.key} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                <span className="min-w-0 text-zinc-400">
                  <SpecLabel label={entry.label} glossaryKey={provenanceGlossaryKey(entry.key)} />
                </span>
                <span className="shrink-0 text-zinc-500">
                  {SOURCE_LABEL[entry.source]}
                </span>
              </li>
            ))}
          </ul>
        </ExpandableSection>
      </div>
    </section>
  );
}
