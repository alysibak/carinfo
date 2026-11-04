import type { ReactNode } from 'react';

/** The privacy policy's and terms' shared frame, in the Methodology page's layout. */
export default function LegalPage({
  eyebrow,
  title,
  updatedLabel,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  /** "Last updated November 4, 2026". */
  updatedLabel: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-black text-white">
      <div className="border-b border-zinc-900">
        <div className="page-wrap section-y max-w-3xl">
          <p className="text-xs text-zinc-400 mb-3">{eyebrow}</p>
          <h1 className="page-title mb-4">{title}</h1>
          <p className="text-sm text-zinc-300 leading-relaxed">{intro}</p>
          <p className="text-xs text-zinc-500 mt-4">{updatedLabel}</p>
        </div>
      </div>
      <div className="page-wrap section-y max-w-3xl space-y-10 md:space-y-12">{children}</div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="block-title mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">{children}</div>
    </section>
  );
}
