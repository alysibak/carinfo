import { useState } from 'react';
import type { CarDashboard } from '../types/car.types';
import { ordinal } from '@carinfo/shared/theft';
import Investigations from './Investigations';
import { complaintPart, recallDate, recallNotice } from '../utils/recalls';
import { powertrainNames, splitRecalls, type RecallPowertrain } from '@carinfo/shared/recall-scope';
import type { CanadianRecall } from '../types/car.types';

const CANADA_RECALLS = 'https://recalls-rappels.canada.ca/en';
const NHTSA_LOOKUP = 'https://www.nhtsa.gov/recalls';
const SHOWN = 4;

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

/** "The most of the Honda CR-V's 31 model years on file." */
function rankSentence(rank: { position: number; of: number }, model = 'model'): string {
  return rank.position === 1
    ? `The most of the ${model}’s ${rank.of} model years on file.`
    : `${ordinal(rank.position)} most of the ${model}’s ${rank.of} model years on file.`;
}

/**
 * "Transport Canada lists 5 recalls for the 2021 Toyota RAV4: 2 can cover this
 * version, and 3 are for the plug-in hybrid alone."
 */
function recallSummary(
  total: number,
  applies: number,
  others: Array<{ powertrains: RecallPowertrain[] }>,
  name: string,
): string {
  if (total === 0) return `Transport Canada lists no recalls for the ${name}.`;
  const listed = `Transport Canada lists ${total} ${total === 1 ? 'recall' : 'recalls'} for the ${name}`;
  if (!others.length) return `${listed}.`;
  const names = [...new Set(others.map((o) => powertrainNames(o.powertrains)))].join(' or ');
  return `${listed}: ${applies === 0 ? 'none' : applies} can cover this version, and ${others.length} ${others.length === 1 ? 'is' : 'are'} for ${names} alone.`;
}

function RecallItem({ recall, forOther }: { recall: CanadianRecall; forOther?: string }) {
  const notice = recallNotice(recall.summary);
  return (
    <li className="border-t border-zinc-900 pt-3">
      <p className="text-sm font-semibold text-white">
        {complaintPart(recall.system)}
        {recall.kind === 'compliance' && (
          <span className="text-zinc-500 font-normal"> · compliance</span>
        )}
        {forOther && <span className="text-zinc-400 font-normal"> · for {forOther}</span>}
      </p>
      <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
        {recallDate(recall.date)} · Transport Canada recall {recall.number}
        {recall.units ? ` · ${recall.units.toLocaleString('en-CA')} vehicles in Canada` : ''}
      </p>
      <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed">{notice.issue}</p>
      {(notice.risk || notice.remedy) && (
        <details className="mt-1.5 group">
          <summary className="py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer select-none">
            Risk and remedy
          </summary>
          {notice.risk && (
            <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed">
              <span className="text-zinc-500">Safety risk: </span>
              {notice.risk}
            </p>
          )}
          {notice.remedy && (
            <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed">
              <span className="text-zinc-500">Remedy: </span>
              {notice.remedy}
            </p>
          )}
        </details>
      )}
    </li>
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
            <h2 className="text-base font-bold tracking-tight mb-1">Recalls in Canada</h2>
            <p className="text-[13px] text-zinc-400 mb-4 leading-relaxed">
              {recallSummary(recalls.length, applies.length, others, name)} A recall can cover only
              some cars of a model year: check yours by its VIN with the maker or Transport Canada.
            </p>
            {shown.length > 0 && (
              <ol className="space-y-4">
                {shown.map((recall) => (
                  <RecallItem key={recall.number} recall={recall} />
                ))}
              </ol>
            )}
            {applies.length > SHOWN && (
              <button
                type="button"
                onClick={() => setShowAll((all) => !all)}
                className={`mt-4 min-h-[44px] text-sm ${linkClass}`}
              >
                {showAll ? 'Show fewer' : `Show all ${applies.length} recalls`}
              </button>
            )}
            {others.length > 0 && (
              <details className="mt-4 border-t border-zinc-900 pt-3">
                <summary className="py-2.5 text-sm text-zinc-300 hover:text-white cursor-pointer select-none">
                  {others.length} {others.length === 1 ? 'recall' : 'recalls'} for other versions
                </summary>
                <ol className="space-y-4 mt-2">
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
            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
              <a href={CANADA_RECALLS} target="_blank" rel="noreferrer" className={linkClass}>
                Government of Canada recalls
              </a>{' '}
              · Contains information licensed under the Open Government Licence – Canada.
              {dashboard.recordDates?.recalls &&
                ` Records as of ${recallDate(dashboard.recordDates.recalls)}.`}
            </p>
          </div>
        )}

        {complaints && (
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight mb-1">Owner complaints</h2>
            <p className="text-[13px] text-zinc-400 mb-4 leading-relaxed">
              {complaints.complaints === 0
                ? `No owner complaints about the ${name} on file with NHTSA (U.S.).`
                : `${complaints.complaints.toLocaleString('en-CA')} owner ${complaints.complaints === 1 ? 'complaint' : 'complaints'} about the ${name} to NHTSA (U.S.).`}{' '}
              {dashboard.complaintRank && (
                <>{rankSentence(dashboard.complaintRank, dashboard.modelPage?.label)} </>
              )}
              Each is an owner’s report, not a confirmed defect, and counts are not adjusted for how
              many were sold: compare a model’s years on its page.
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
              <a href={NHTSA_LOOKUP} target="_blank" rel="noreferrer" className={linkClass}>
                Look it up on NHTSA
              </a>{' '}
              · Complaints NHTSA received from U.S. owners, by part.
              {dashboard.recordDates?.complaints &&
                ` Records as of ${recallDate(dashboard.recordDates.complaints)}.`}
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
