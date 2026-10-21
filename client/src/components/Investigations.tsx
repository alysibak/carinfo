import type { FuelType, NhtsaInvestigation } from '../types/car.types';
import { splitInvestigations } from '@carinfo/shared/recall-scope';
import {
  investigationKind,
  investigationPart,
  investigationText,
  openFirst,
} from '../utils/investigations';
import { recallDate } from '../utils/recalls';

const NHTSA_LOOKUP = 'https://www.nhtsa.gov/recalls';

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

function InvestigationItem({ inv, forOther }: { inv: NhtsaInvestigation; forOther?: boolean }) {
  return (
    <li className="border-t border-zinc-900 pt-3 min-w-0">
      <p className="text-sm font-semibold text-white">
        {investigationPart(inv.component)}
        {!inv.closed && !forOther && <span className="text-amber-400 font-normal"> · open</span>}
        {!inv.closed && forOther && <span className="text-zinc-400 font-normal"> · open</span>}
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
          <summary className="py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer select-none">
            What NHTSA looked into
          </summary>
          <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed">
            {investigationText(inv.summary)}
          </p>
        </details>
      )}
    </li>
  );
}

/**
 * NHTSA's defect investigations covering the model year: what it looked
 * into, when, and the recall it led to, open ones first. Those for another
 * powertrain (the EcoDiesel's fuel pump on a gasoline Grand Cherokee) are
 * listed apart. Each keeps NHTSA's number, to look up on its site.
 */
export default function Investigations({
  investigations,
  name,
  asOf,
  car,
}: {
  investigations: NhtsaInvestigation[];
  /** "2018 Honda CR-V". */
  name: string;
  asOf?: string;
  car: { fuelType: FuelType; mildHybrid?: boolean };
}) {
  const { applies, other } = splitInvestigations(investigations, car);
  const open = applies.filter((inv) => !inv.closed).length;
  return (
    <div className="min-w-0 md:col-span-2">
      <h2 className="text-base font-bold tracking-tight mb-1">NHTSA investigations</h2>
      <p className="text-xs text-zinc-500 mb-4 leading-relaxed max-w-3xl">
        {applies.length === 0
          ? `NHTSA (U.S.) has no investigation on file for this version of the ${name}`
          : applies.length === 1
            ? `NHTSA (U.S.) has investigated a possible defect in the ${name}`
            : `NHTSA (U.S.) has investigated ${applies.length} possible defects in the ${name}`}
        {open ? `, ${open === 1 ? 'one' : open} still open` : ''}
        {other.length
          ? `; ${other.length === 1 ? 'one' : other.length} ${applies.length ? 'more ' : ''}${other.length === 1 ? 'was' : 'were'} for another version`
          : ''}
        . An investigation looks into owners’ reports and can lead to a recall; it is not a finding
        that the defect exists.
      </p>
      {applies.length > 0 && (
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
          {openFirst(applies).map((inv) => (
            <InvestigationItem key={inv.id} inv={inv} />
          ))}
        </ol>
      )}
      {other.length > 0 && (
        <details className="mt-4 border-t border-zinc-900 pt-3">
          <summary className="py-2.5 text-sm text-zinc-300 hover:text-white cursor-pointer select-none">
            {other.length} for other versions (diesel, hybrid or electric)
          </summary>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 mt-2">
            {openFirst(other).map((inv) => (
              <InvestigationItem key={inv.id} inv={inv} forOther />
            ))}
          </ol>
        </details>
      )}
      <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
        <a href={NHTSA_LOOKUP} target="_blank" rel="noreferrer" className={linkClass}>
          Look one up on NHTSA by its number
        </a>
        {asOf ? ` · Records as of ${recallDate(asOf)}.` : ''}
      </p>
    </div>
  );
}
