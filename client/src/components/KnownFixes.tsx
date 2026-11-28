import type { CarDashboard, ServiceBulletin } from '../types/car.types';
import RecordRow, { CountHeading } from './RecordRow';
import { bulletinGroups, bulletinReading } from '../utils/bulletins';
import { complaintPart, recallDate } from '../utils/recalls';
import { t, tp } from '../i18n';
import { fmtNumber } from '../i18n/format';

const NHTSA_LOOKUP = 'https://www.nhtsa.gov/recalls';
const CAMVAP = 'https://www.camvap.ca/';

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

function BulletinItem({ bulletin, names }: { bulletin: ServiceBulletin; names: string[] }) {
  const { headline, rest } = bulletinReading(bulletin, names);
  return (
    <RecordRow
      title={headline}
      flag={
        // Said once: "Warranty extension: A/C condenser" needs no flag saying so.
        bulletin.kind && !/warrant|coverage|campaign|program/i.test(headline) ? (
          <span className="text-accent font-normal">
            {bulletin.kind === 'warranty' ? t(' · warranty extended') : t(' · free repair')}
          </span>
        ) : null
      }
      meta={
        <>
          {bulletin.kind ? `${complaintPart(bulletin.parts[0] ?? 'UNKNOWN OR OTHER')} · ` : ''}
          {bulletin.date ? recallDate(bulletin.date) : ''}
          {bulletin.number
            ? `${bulletin.date ? ' · ' : ''}${t('bulletin {number}', { number: bulletin.number })}`
            : ''}
        </>
      }
    >
      {rest && <p>{rest}</p>}
      <p className="text-xs text-zinc-500">{t('NHTSA item {id}', { id: bulletin.id })}</p>
    </RecordRow>
  );
}

/**
 * The makers' service bulletins for the model year: their repair
 * instructions to dealers for problems they know about. Any warranty
 * extension or free repair program comes first, then the newest bulletins on
 * the parts owners complain about most. A bulletin is not a recall, which is
 * said; neither is the file complete, which is said too.
 */
export default function KnownFixes({ dashboard }: { dashboard: CarDashboard }) {
  const { bulletins, car, complaints } = dashboard;
  if (!bulletins) return null;
  const names = [car.make, dashboard.modelPage?.label.replace(car.make, '').trim() ?? car.model];
  const { programs, fromComplaints, byPart, otherParts } = bulletinGroups(
    bulletins,
    complaints?.parts.map(([part]) => part),
  );
  // CAMVAP takes a car in its current model year or the four before.
  const recent = car.year >= new Date().getFullYear() - 4;

  return (
    <section id="fixes" className="border-b border-zinc-900 scroll-mt-32">
      <div className="page-wrap-wide section-y-tight">
        <CountHeading title={t('Known fixes')} count={bulletins.total} />
        <p className="text-[13px] text-zinc-400 mt-1 mb-4 max-w-3xl">
          {t(
            'Service bulletins: the maker’s repair instructions to dealers, for problems it knows about. A bulletin is not a recall: the repair is free only under warranty, or in a program the maker runs.',
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
          {programs.length > 0 && (
            <div className="min-w-0 md:col-span-2">
              <h3 className="text-sm font-semibold text-white">
                {t('Warranty extensions and free repairs')}
              </h3>
              <ol className="mt-2">
                {programs.map((b) => (
                  <BulletinItem key={b.id} bulletin={b} names={names} />
                ))}
              </ol>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {t(
                  'These are the maker’s U.S. programs. Ask a Canadian dealer whether the same applies here, and whether this car has had the work.',
                )}
              </p>
            </div>
          )}

          {byPart.length > 0 && (
            <div className="min-w-0 md:col-span-2">
              <h3 className="text-sm font-semibold text-white">
                {fromComplaints
                  ? t('On the parts owners complain about most')
                  : t('On the parts with the most bulletins')}
              </h3>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                {byPart.map(({ part, count, items }) => (
                  <div key={part} className="min-w-0">
                    <p className="flex items-baseline justify-between gap-3 text-sm py-1">
                      <span className="text-zinc-300">{complaintPart(part)}</span>
                      <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                        {tp(count, '{count} bulletin', '{count} bulletins', {
                          count: fmtNumber(count),
                        })}
                      </span>
                    </p>
                    <ol>
                      {items.map((b) => (
                        <BulletinItem key={b.id} bulletin={b} names={names} />
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {otherParts.length > 0 && (
          <p className="text-[13px] text-zinc-400 mt-5 leading-relaxed">
            {t('Also on file: {parts}.', {
              parts: otherParts
                .slice(0, 6)
                .map(
                  ([part, count]) => `${complaintPart(part).toLowerCase()} (${fmtNumber(count)})`,
                )
                .join(', '),
            })}
          </p>
        )}

        {recent && (
          <p className="text-[13px] text-zinc-300 mt-5 max-w-3xl leading-relaxed border-l-2 border-accent/60 pl-3">
            {t(
              'A defect the maker won’t fix? The Canadian Motor Vehicle Arbitration Plan (CAMVAP) settles it for free, for a car in its current model year or the four before, with under 160,000 km.',
            )}{' '}
            <a href={CAMVAP} target="_blank" rel="noreferrer" className={linkClass}>
              {t('Check if it qualifies')}
            </a>
          </p>
        )}

        <p className="text-xs text-zinc-500 mt-5 leading-relaxed">
          {t('The makers’ bulletins on file with')}{' '}
          <a href={NHTSA_LOOKUP} target="_blank" rel="noreferrer" className={linkClass}>
            NHTSA
          </a>{' '}
          {t(
            '(U.S.). Its file is not complete and leaves out recall bulletins. A dealer can look one up by its number',
          )}
          {dashboard.recordDates?.bulletins
            ? t('; as of {date}.', { date: recallDate(dashboard.recordDates.bulletins) })
            : '.'}
        </p>
      </div>
    </section>
  );
}
