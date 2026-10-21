import { Link } from 'react-router-dom';
import type { CarDashboard, CarSpecs, NhtsaRating } from '../types/car.types';
import { availabilityLabel, rolloverRiskText, testedLabel } from '../utils/safetyTech';
import { recallDate } from '../utils/recalls';
import { SpecLabel } from './SpecExplain';

const NHTSA_RATINGS = 'https://www.nhtsa.gov/ratings';

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

const SCORES = [
  ['overall', 'Overall'],
  ['frontal', 'Frontal'],
  ['side', 'Side'],
  ['rollover', 'Rollover'],
] as const;

const TECH = [
  ['esc', 'Stability control', 'stabilityControl'],
  ['fcw', 'Forward collision warning', 'collisionWarning'],
  ['ldw', 'Lane departure warning', 'laneDepartureWarning'],
] as const;

/** "Overall 4 · Frontal 3 · Side 5 · Rollover 4", or what NHTSA left unrated. */
function scoreLine(test: NhtsaRating): string {
  const scores = SCORES.filter(([key]) => test[key]).map(
    ([key, label]) => `${label} ${test[key]}/5`,
  );
  return scores.length ? scores.join(' · ') : 'No star ratings';
}

/**
 * NHTSA's 5-Star Safety Ratings for the car's model year, from the tests of
 * its body and drivetrain (the server's utils/nhtsa-ratings.ts), with the
 * safety technology NHTSA lists. Where several tests describe the car (a
 * pickup's cabs, a year rated twice), each is listed and the scores shown
 * are the lowest.
 */
export default function CrashTests({ dashboard, car }: { dashboard: CarDashboard; car: CarSpecs }) {
  const tests = dashboard.nhtsaTests ?? [];
  const rating = car.safetyRating;
  if (!tests.length && !rating?.overall) return null;
  const scores = SCORES.filter(([key]) => rating?.[key]);
  const tech = car.safetyTech;
  const several = tests.length > 1;

  return (
    <section id="safety" className="border-b border-zinc-900 scroll-mt-32">
      <div className="page-wrap-wide section-y-tight grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight mb-1">Crash tests</h2>
          <p className="text-[13px] text-zinc-400 mb-3 leading-relaxed">
            {scores.length
              ? several
                ? `NHTSA’s 5-Star Safety Ratings (U.S.). NHTSA tested ${tests.length} versions that match this car; each score shown is the lowest any of them got.`
                : 'NHTSA’s 5-Star Safety Ratings (U.S.) for the version it tested.'
              : 'NHTSA lists this version but has not given it star ratings.'}
          </p>
          {scores.length > 0 && (
            <div
              className={`grid gap-px bg-zinc-800 ${scores.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : scores.length === 3 ? 'grid-cols-3' : scores.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
            >
              {scores.map(([key, label]) => (
                <div key={key} className="bg-black px-2 sm:px-3 py-3.5 sm:py-4 text-center min-w-0">
                  <p className="text-xs text-zinc-500 mb-1">{label}</p>
                  <p className="text-lg sm:text-xl font-bold tabular-nums">
                    {rating![key]}
                    <span className="text-xs text-zinc-500">/5</span>
                  </p>
                </div>
              ))}
            </div>
          )}
          {rating?.rolloverRisk != null && (
            <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
              <SpecLabel
                label="Chance of rolling over in a single-vehicle crash:"
                glossaryKey="rolloverRisk"
              />{' '}
              <span className="font-semibold text-white tabular-nums">
                {rolloverRiskText(rating.rolloverRisk)}
              </span>
              <span className="text-zinc-500">
                {several ? ' (the highest of the versions tested)' : ''}
              </span>
            </p>
          )}
          {tests.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-1.5">
                {several ? 'Versions NHTSA tested' : 'Version NHTSA tested'}
              </p>
              <ul className="space-y-1.5">
                {tests.map((test) => (
                  <li key={test.id} className="text-sm leading-snug">
                    <span className="text-zinc-300" title={`NHTSA: ${test.tested}`}>
                      {testedLabel(test.tested)}
                    </span>
                    {several && (
                      <span className="block text-xs text-zinc-500 tabular-nums">
                        {scoreLine(test)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {tech && (
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight mb-1">Safety technology</h2>
            <p className="text-[13px] text-zinc-400 mb-3 leading-relaxed">
              What NHTSA lists for {several ? 'the versions' : 'the version'} it tested. “Not
              listed” means NHTSA does not list it, not that the car lacks it.
            </p>
            <dl className="divide-y divide-zinc-900 border-y border-zinc-900">
              {TECH.map(([key, label, glossaryKey]) => (
                <div key={key} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                  <dt className="text-zinc-400 min-w-0">
                    <SpecLabel label={label} glossaryKey={glossaryKey} />
                  </dt>
                  <dd
                    className={`text-right shrink-0 ${tech[key] ? 'text-white font-medium' : 'text-zinc-500'}`}
                  >
                    {availabilityLabel(tech[key])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {dashboard.saferAlternatives && dashboard.saferAlternatives.length > 0 && (
          <div className="md:col-span-2 min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1">
              Rated higher among cars shopped against it
            </h3>
            <ul className="space-y-1">
              {dashboard.saferAlternatives.map((alt) => (
                <li key={alt.id} className="text-sm">
                  <Link to={`/car/${encodeURIComponent(alt.id)}`} className={linkClass}>
                    {alt.label}
                  </Link>
                  <span className="text-zinc-500">: {alt.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="md:col-span-2 text-xs text-zinc-500 leading-relaxed">
          <a href={NHTSA_RATINGS} target="_blank" rel="noreferrer" className={linkClass}>
            NHTSA 5-Star Safety Ratings
          </a>{' '}
          · Frontal crash ratings compare only vehicles of similar size and weight. NHTSA’s ratings
          before 2011 used other tests and are not shown.
          {dashboard.recordDates?.ratings &&
            ` Ratings as of ${recallDate(dashboard.recordDates.ratings)}.`}
        </p>
      </div>
    </section>
  );
}
