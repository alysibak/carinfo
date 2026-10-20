import { useState } from 'react';
import type { CarDashboard } from '../types/car.types';
import { complaintPart, recallDate, recallNotice } from '../utils/recalls';

const CANADA_RECALLS = 'https://recalls-rappels.canada.ca/en';
const NHTSA_LOOKUP = 'https://www.nhtsa.gov/recalls';
const SHOWN = 4;

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

const ordinal = (n: number) => {
  const tens = n % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th');
  return `${n}${suffix}`;
};

/** "The most of the Honda CR-V's 31 model years on file." */
function rankSentence(rank: { position: number; of: number }, model = 'model'): string {
  return rank.position === 1
    ? `The most of the ${model}’s ${rank.of} model years on file.`
    : `${ordinal(rank.position)} most of the ${model}’s ${rank.of} model years on file.`;
}

/**
 * Transport Canada's recalls and NHTSA's owner complaints for the car's model
 * year, each with the identifiers the government knows it by. Shown only where
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
  const { recalls, complaints } = dashboard;
  const [showAll, setShowAll] = useState(false);
  if (!recalls && !complaints) return null;
  const shown = showAll ? recalls : recalls?.slice(0, SHOWN);
  const mostParts = complaints?.parts[0]?.[1] ?? 0;

  return (
    <section id="recalls" className="border-b border-zinc-900 scroll-mt-32">
      <div className="page-wrap-wide section-y-tight grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
        {recalls && (
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight mb-1">Recalls in Canada</h2>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              {recalls.length === 0
                ? `Transport Canada lists no recalls for the ${name}.`
                : `Transport Canada lists ${recalls.length} ${recalls.length === 1 ? 'recall' : 'recalls'} for the ${name}.`}{' '}
              A recall can cover only some cars of a model year: check yours by its VIN with the
              maker or Transport Canada.
            </p>
            {shown && shown.length > 0 && (
              <ol className="space-y-4">
                {shown.map((recall) => {
                  const notice = recallNotice(recall.summary);
                  return (
                    <li key={recall.number} className="border-t border-zinc-900 pt-3">
                      <p className="text-sm font-semibold text-white">
                        {complaintPart(recall.system)}
                        {recall.kind === 'compliance' && (
                          <span className="text-zinc-500 font-normal"> · compliance</span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                        {recallDate(recall.date)} · Transport Canada recall {recall.number}
                        {recall.units
                          ? ` · ${recall.units.toLocaleString('en-CA')} vehicles in Canada`
                          : ''}
                      </p>
                      <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed">{notice.issue}</p>
                      {(notice.risk || notice.remedy) && (
                        <details className="mt-1.5 group">
                          <summary className="text-xs text-zinc-400 hover:text-white cursor-pointer select-none">
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
                })}
              </ol>
            )}
            {recalls.length > SHOWN && (
              <button
                type="button"
                onClick={() => setShowAll((all) => !all)}
                className={`mt-4 text-xs ${linkClass}`}
              >
                {showAll ? 'Show fewer' : `Show all ${recalls.length} recalls`}
              </button>
            )}
            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
              <a href={CANADA_RECALLS} target="_blank" rel="noreferrer" className={linkClass}>
                Government of Canada recalls
              </a>{' '}
              · Contains information licensed under the Open Government Licence – Canada.
            </p>
          </div>
        )}

        {complaints && (
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight mb-1">Owner complaints</h2>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
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
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
