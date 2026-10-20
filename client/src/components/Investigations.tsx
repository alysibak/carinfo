import type { NhtsaInvestigation } from '../types/car.types';
import { investigationKind, investigationText, openFirst } from '../utils/investigations';
import { complaintPart, recallDate } from '../utils/recalls';

const NHTSA_LOOKUP = 'https://www.nhtsa.gov/recalls';

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

/**
 * NHTSA's defect investigations covering the model year: what it looked
 * into, when, and the recall it led to, open ones first. Each keeps NHTSA's
 * number, to look up on its site.
 */
export default function Investigations({
  investigations,
  name,
  asOf,
}: {
  investigations: NhtsaInvestigation[];
  /** "2018 Honda CR-V". */
  name: string;
  asOf?: string;
}) {
  const open = investigations.filter((inv) => !inv.closed).length;
  return (
    <div className="min-w-0 md:col-span-2">
      <h2 className="text-base font-bold tracking-tight mb-1">NHTSA investigations</h2>
      <p className="text-xs text-zinc-500 mb-4 leading-relaxed max-w-3xl">
        {investigations.length === 1
          ? `NHTSA (U.S.) has investigated a possible defect in the ${name}`
          : `NHTSA (U.S.) has investigated ${investigations.length} possible defects in the ${name}`}
        {open ? `, ${open === 1 ? 'one' : open} still open` : ''}. An investigation looks into
        owners’ reports and can lead to a recall; it is not a finding that the defect exists.
      </p>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
        {openFirst(investigations).map((inv) => (
          <li key={inv.id} className="border-t border-zinc-900 pt-3 min-w-0">
            <p className="text-sm font-semibold text-white">
              {complaintPart(inv.component)}
              {!inv.closed && <span className="text-amber-400 font-normal"> · open</span>}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
              {investigationKind(inv.kind)} {inv.id} · opened {recallDate(inv.opened)}
              {inv.closed ? ` · closed ${recallDate(inv.closed)}` : ''}
              {inv.recall ? ` · led to recall ${inv.recall}` : ''}
            </p>
            <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed">
              {investigationText(inv.subject)}
            </p>
            {inv.summary && (
              <details className="mt-1.5">
                <summary className="text-xs text-zinc-400 hover:text-white cursor-pointer select-none">
                  What NHTSA looked into
                </summary>
                <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed">
                  {investigationText(inv.summary)}
                </p>
              </details>
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
        <a href={NHTSA_LOOKUP} target="_blank" rel="noreferrer" className={linkClass}>
          Look one up on NHTSA by its number
        </a>
        {asOf ? ` · Records as of ${recallDate(asOf)}.` : ''}
      </p>
    </div>
  );
}
