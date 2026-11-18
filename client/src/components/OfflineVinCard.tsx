import { vinCheckDigitValid, vinModelYear } from '../utils/vin';
import { t } from '../i18n';

/**
 * A VIN saved while the lookup could not be reached, and what the VIN says by
 * itself meanwhile, worked out on the phone: its model year, and whether its
 * check digit matches, so a misread character is caught at the car, not at
 * home.
 */
export default function OfflineVinCard({
  vin,
  title,
  online,
  onRetry,
}: {
  vin: string;
  /** Its name from an earlier lookup on this phone. */
  title: string | null;
  online: boolean;
  onRetry: () => void;
}) {
  const year = vinModelYear(vin);
  const checked = vin.length === 17 ? vinCheckDigitValid(vin) : null;
  return (
    <section
      aria-live="polite"
      className="mt-8 max-w-2xl border border-amber-900/60 bg-zinc-950 px-5 py-4"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
        {online ? t('Saved: the lookup could not be reached') : t('Saved on this phone')}
      </p>
      <p className="mt-2 font-mono text-lg tracking-[0.12em] text-white break-all">{vin}</p>
      {title && (
        <p className="mt-1 text-sm text-zinc-300">{t('Looked up before as {title}', { title })}</p>
      )}
      {(year || checked != null) && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          {year && (
            <div>
              <dt className="text-xs text-zinc-500">{t('Model year, from its 10th character')}</dt>
              <dd className="mt-0.5 font-semibold text-white tabular-nums">{year}</dd>
            </div>
          )}
          {checked != null && (
            <div>
              <dt className="text-xs text-zinc-500">{t('Check digit, its 9th character')}</dt>
              <dd className={`mt-0.5 font-semibold ${checked ? 'text-white' : 'text-amber-200'}`}>
                {checked
                  ? t('Matches: the VIN reads right')
                  : t('Does not match: check each character against the car')}
              </dd>
            </div>
          )}
        </dl>
      )}
      <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
        {online
          ? t('Try again now, or it is looked up the next time this page opens.')
          : t(
              'It is looked up by itself once there is a connection. Scan or type the next one meanwhile.',
            )}
      </p>
      {online && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-3 text-sm">
          {t('Try again')}
        </button>
      )}
    </section>
  );
}
