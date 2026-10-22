import { useState } from 'react';
import type { CarDashboard } from '../types/car.types';
import { ordinal } from '@carinfo/shared/theft';
import Investigations from './Investigations';
import RecordRow, { CountHeading } from './RecordRow';
import { Chevron, foldSummaryClass } from './ui';
import { complaintPart, recallDate, recallNotice } from '../utils/recalls';
import { powertrainNames, splitRecalls } from '@carinfo/shared/recall-scope';
import type { CanadianRecall } from '../types/car.types';

const CANADA_RECALLS = 'https://recalls-rappels.canada.ca/en';
const NHTSA_LOOKUP = 'https://www.nhtsa.gov/recalls';
const SHOWN = 3;

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

/** "The most of the Honda CR-V's 31 years on file." */
function rankSentence(rank: { position: number; of: number }, model = 'model'): string {
  return rank.position === 1
    ? `The most of the ${model}’s ${rank.of} years on file.`
    : `${ordinal(rank.position)} most of the ${model}’s ${rank.of} years on file.`;
}

function RecallItem({ recall, forOther }: { recall: CanadianRecall; forOther?: string }) {
  const notice = recallNotice(recall.summary);
  return (
    <RecordRow
      title={complaintPart(recall.system)}
      flag={forOther ? <span className="text-zinc-400 font-normal"> · {forOther} only</span> : null}
      meta={
        <>
          {recallDate(recall.date)}
          {recall.units ? ` · ${recall.units.toLocaleString('en-CA')} in Canada` : ''}
        </>
      }
    >
      <p>{notice.issue}</p>
      {notice.risk && (
        <p>
          <span className="text-zinc-500">Risk: </span>
          {notice.risk}
        </p>
      )}
      {notice.remedy && (
        <p>
          <span className="text-zinc-500">Remedy: </span>
          {notice.remedy}
        </p>
      )}
      <p className="text-xs text-zinc-500">
        Transport Canada recall {recall.number}
        {recall.kind === 'compliance' ? ' · compliance' : ''}
      </p>
    </RecordRow>
  );
}

/**
 * Transport Canada's recalls, NHTSA's owner complaints and its defect
 * investigations for the car's model year, each with the identifiers the
 * government knows it by. Shown only where
 * the government's records for the model are matched to the site's: "no
 * recalls listed" from a model whose name never matched would be false.
 */
export default function SafetyRecords({
  dashboard,
  name,
}: {
  dashboard: CarDashboard;
  /** "2018 Toyota Camry". */
  name: string;
}) {
  const { car, recalls, complaints, investigations } = dashboard;
  const [showAll, setShowAll] = useState(false);
  if (!recalls && !complaints && !investigations) return null;
  // The RAV4 Prime's recalls are filed under every 2021 RAV4: listed apart.
  const { applies, other: others } = splitRecalls(recalls ?? [], {
    fuelType: car.engine.fuelType,
    mildHybrid: car.engine.mildHybrid,
  });
  const shown = showAll ? applies : applies.slice(0, SHOWN);
  const mostParts = complaints?.parts[0]?.[1] ?? 0;

  return (
    <section id="recalls" className="border-b border-zinc-900 scroll-mt-32">
      <div className="page-wrap-wide section-y-tight grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
        {recalls && (
          <div className="min-w-0">
            <CountHeading title="Recalls in Canada" count={applies.length} tone="warn" />
            <p className="text-[13px] text-zinc-400 mt-1 mb-3">
              {applies.length > 0
                ? 'Check the VIN with the maker to see if the work was done.'
                : `None listed for this version of the ${name}.`}
            </p>
            {shown.length > 0 && (
              <ol>
                {shown.map((recall) => (
                  <RecallItem key={recall.number} recall={recall} />
                ))}
              </ol>
            )}
            {applies.length > SHOWN && (
              <button
                type="button"
                onClick={() => setShowAll((all) => !all)}
                className={`mt-1 min-h-[44px] text-sm ${linkClass}`}
              >
                {showAll ? 'Show fewer' : `Show all ${applies.length}`}
              </button>
            )}
            {others.length > 0 && (
              <details className="mt-2 border-t border-zinc-900 pt-1 group/other">
                <summary
                  className={`${foldSummaryClass} py-2.5 text-[13px] text-zinc-400 hover:text-white`}
                >
                  <span>
                    {others.length} more for{' '}
                    {[...new Set(others.map((o) => powertrainNames(o.powertrains)))].join(' or ')}{' '}
                    only
                  </span>
                  <Chevron className="w-3.5 h-3.5 text-zinc-500 group-open/other:rotate-180" />
                </summary>
                <ol>
                  {others.map(({ recall, powertrains }) => (
                    <RecallItem
                      key={recall.number}
                      recall={recall}
                      forOther={powertrainNames(powertrains)}
                    />
                  ))}
                </ol>
              </details>
            )}
            <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
              <a href={CANADA_RECALLS} target="_blank" rel="noreferrer" className={linkClass}>
                Transport Canada
              </a>
              {dashboard.recordDates?.recalls &&
                `, as of ${recallDate(dashboard.recordDates.recalls)}`}
              . Contains information licensed under the Open Government Licence – Canada.
            </p>
          </div>
        )}

        {complaints && (
          <div className="min-w-0">
            <CountHeading title="Owner complaints" count={complaints.complaints} />
            <p className="text-[13px] text-zinc-400 mt-1 mb-3">
              {complaints.complaints === 0
                ? `None on file with NHTSA for the ${name}.`
                : dashboard.complaintRank
                  ? rankSentence(dashboard.complaintRank, dashboard.modelPage?.label)
                  : 'Most complained-about parts:'}
            </p>
            {complaints.complaints > 0 && (
              <>
                {complaints.parts.length > 0 && (
                  <ul className="space-y-2.5" aria-label="Parts complained of most">
                    {complaints.parts.map(([part, count]) => (
                      <li key={part}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-zinc-300 min-w-0">{complaintPart(part)}</span>
                          <span className="text-white font-semibold tabular-nums shrink-0">
                            {count.toLocaleString('en-CA')}
                          </span>
                        </div>
                        <div className="h-1 bg-zinc-900 mt-1" aria-hidden>
                          <div
                            className="h-full bg-zinc-400"
                            style={{ width: `${Math.max(4, (100 * count) / mostParts)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {(complaints.crashes > 0 || complaints.fires > 0 || complaints.injuries > 0) && (
                  <p className="text-xs text-zinc-400 mt-4 tabular-nums">
                    {[
                      complaints.crashes > 0 &&
                        `${complaints.crashes.toLocaleString('en-CA')} reporting a crash`,
                      complaints.fires > 0 &&
                        `${complaints.fires.toLocaleString('en-CA')} reporting a fire`,
                      complaints.injuries > 0 &&
                        `${complaints.injuries.toLocaleString('en-CA')} ${complaints.injuries === 1 ? 'injury' : 'injuries'}`,
                      complaints.deaths > 0 &&
                        `${complaints.deaths.toLocaleString('en-CA')} ${complaints.deaths === 1 ? 'death' : 'deaths'}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </>
            )}
            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
              Owners’ reports to{' '}
              <a href={NHTSA_LOOKUP} target="_blank" rel="noreferrer" className={linkClass}>
                NHTSA
              </a>{' '}
              (U.S.), not confirmed defects, and not adjusted for how many were sold
              {dashboard.recordDates?.complaints &&
                `; as of ${recallDate(dashboard.recordDates.complaints)}`}
              .
            </p>
          </div>
        )}

        {investigations && (
          <Investigations
            investigations={investigations}
            name={name}
            asOf={dashboard.recordDates?.investigations}
            car={{ fuelType: car.engine.fuelType, mildHybrid: car.engine.mildHybrid }}
          />
        )}
      </div>
    </section>
  );
}
