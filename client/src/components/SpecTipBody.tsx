import type { SpecGlossaryKey } from '../utils/specGlossary';
import { getSpecEntry } from '../utils/specGlossary';

/** Two-line tooltip: definition + why it matters. */
export function SpecTipBody({ glossaryKey }: { glossaryKey: SpecGlossaryKey }) {
  const { what, why } = getSpecEntry(glossaryKey);
  return (
    <>
      <span className="block text-zinc-300">{what}</span>
      {why && <span className="block mt-1.5 text-zinc-400">{why}</span>}
    </>
  );
}
