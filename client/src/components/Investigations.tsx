import type { FuelType, NhtsaInvestigation } from '../types/car.types';
import { splitInvestigations } from '@carinfo/shared/recall-scope';
import {
  investigationKind,
  investigationPart,
  investigationText,
  openFirst,
} from '../utils/investigations';
import { recallDate } from '../utils/recalls';
import RecordRow from './RecordRow';
import { Chevron, foldSummaryClass } from './ui';

const NHTSA_LOOKUP = 'https://www.nhtsa.gov/recalls';

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

function InvestigationItem({ inv, forOther }: { inv: NhtsaInvestigation; forOther?: boolean }) {
  return (
    <RecordRow
      title={investigationPart(inv.component)}
      flag={
        !inv.closed ? (
          <span className={forOther ? 'text-zinc-400 font-normal' : 'text-amber-300 font-normal'}>
            {' '}
            · open
          </span>
        ) : null
      }
      meta={
        <>
          {recallDate(inv.opened)}
          {inv.closed ? ` to ${recallDate(inv.closed)}` : ''}
          {inv.recall ? ` · led to recall ${inv.recall}` : ''}
        </>
      }
    >
      <p>{investigationText(inv.subject)}</p>
      {inv.summary && <p>{investigationText(inv.summary)}</p>}
      <p className="text-xs text-zinc-500">
        {investigationKind(inv.kind)} {inv.id}
      </p>
    </RecordRow>
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
  if (applies.length === 0 && other.length === 0) return null;
  return (
    <div className="min-w-0 md:col-span-2">
      {/* Folded to a line: an investigation is not a finding, and most closed long ago. */}
      <details className="group/inv border-t border-zinc-800">
        <summary className={`${foldSummaryClass} gap-4 py-3`}>
          <span className="min-w-0">
            <span className="block text-base font-bold tracking-tight">NHTSA investigations</span>
            <span className="block text-[13px] text-zinc-400 mt-0.5">
              {applies.length === 0
                ? `None for this version of the ${name}`
                : `${applies.length} possible ${applies.length === 1 ? 'defect' : 'defects'} looked into`}
              {open ? `, ${open} still open` : ''}
              {other.length ? ` · ${other.length} for other versions` : ''}
            </span>
          </span>
          <Chevron className="w-4 h-4 text-zinc-500 group-hover/inv:text-white group-open/inv:rotate-180" />
        </summary>
        <p className="text-[13px] text-zinc-400 mb-2 max-w-3xl">
          NHTSA (U.S.) looks into owners’ reports; an investigation can lead to a recall, and is not
          a finding that the defect exists.
        </p>
        {applies.length > 0 && (
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
            {openFirst(applies).map((inv) => (
              <InvestigationItem key={inv.id} inv={inv} />
            ))}
          </ol>
        )}
        {other.length > 0 && (
          <details className="mt-2 border-t border-zinc-900 pt-1 group/other">
            <summary
              className={`${foldSummaryClass} py-2.5 text-[13px] text-zinc-400 hover:text-white`}
            >
              {other.length} for other versions (diesel, hybrid or electric)
              <Chevron className="w-3.5 h-3.5 text-zinc-500 group-open/other:rotate-180" />
            </summary>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
              {openFirst(other).map((inv) => (
                <InvestigationItem key={inv.id} inv={inv} forOther />
              ))}
            </ol>
          </details>
        )}
        <p className="text-xs text-zinc-500 mt-3 mb-1">
          <a href={NHTSA_LOOKUP} target="_blank" rel="noreferrer" className={linkClass}>
            Look one up on NHTSA by its number
          </a>
          {asOf ? `; as of ${recallDate(asOf)}.` : ''}
        </p>
      </details>
    </div>
  );
}
