import type { TheftRank } from '../types/car.types';
import { theftSentence } from '@carinfo/shared/theft';
import { t } from '../i18n';

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

export default function TheftRecord({ theft }: { theft: TheftRank }) {
  return (
    <section
      id="theft"
      aria-labelledby="theft-heading"
      className="border-b border-zinc-900 scroll-mt-32"
    >
      <div className="page-wrap-wide section-y-tight">
        <div className="max-w-3xl">
          <h2 id="theft-heading" className="block-title mb-1">
            {t('Theft in Canada')}
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">{theftSentence(theft)}</p>
          <p className="text-[13px] text-zinc-400 mt-1.5">
            {t(
              'Ask your insurer what it costs to insure and whether it needs an anti-theft device.',
            )}{' '}
            <a href={theft.url} target="_blank" rel="noreferrer" className={linkClass}>
              {t('Équité’s top {of}', { of: theft.of })}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
