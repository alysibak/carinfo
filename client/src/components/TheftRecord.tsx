import type { TheftRank } from '../types/car.types';
import { theftSentence } from '@carinfo/shared/theft';

const linkClass =
  'text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500';

/**
 * The model's place on Équité Association's list of Canada's most stolen
 * vehicles, with what it means for a buyer: insurers price and ask for
 * anti-theft devices by it. Only for a model on the list; one off it is not
 * thereby safe from thieves, so nothing is said of those.
 */
export default function TheftRecord({ theft }: { theft: TheftRank }) {
  return (
    <section
      id="theft"
      aria-labelledby="theft-heading"
      className="border-b border-zinc-900 scroll-mt-32"
    >
      <div className="page-wrap-wide section-y-tight">
        <div className="max-w-3xl">
          <h2 id="theft-heading" className="text-base font-bold tracking-tight mb-1">
            Theft in Canada
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">{theftSentence(theft)}</p>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            Équité, the insurance industry’s body for fraud and crime, ranks models by how many were
            stolen, so a model with many on the road ranks higher. Before you buy, ask your insurer
            what it would cost to insure and whether it requires an anti-theft device, such as a
            tracker.{' '}
            <a href={theft.url} target="_blank" rel="noreferrer" className={linkClass}>
              Équité’s top {theft.of}, with the counts
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
