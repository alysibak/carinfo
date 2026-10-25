import type { ReactNode } from 'react';
import { Chevron, foldSummaryClass } from './ui';

/**
 * One record in a list (a recall, an investigation): its name and date on a
 * line, the rest a tap away. Recalls ran a paragraph each, the section
 * several screens on a phone.
 */
export default function RecordRow({
  title,
  meta,
  flag,
  lead,
  children,
}: {
  title: ReactNode;
  /** "May 21, 2026 · 12,371 in Canada". */
  meta: ReactNode;
  /** "Open", beside the title. */
  flag?: ReactNode;
  /** What it is, in a line, under the title: a recall's fault. */
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="border-t border-zinc-900">
      <details className="group/row">
        <summary className={`${foldSummaryClass} py-3 hover:bg-zinc-950 -mx-2 px-2`}>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-white">
              {title}
              {flag}
            </span>
            {lead && (
              <span className="block text-[13px] text-zinc-300 mt-0.5 leading-snug">{lead}</span>
            )}
            <span className="block text-xs text-zinc-500 mt-0.5 tabular-nums">{meta}</span>
          </span>
          <Chevron className="w-3.5 h-3.5 text-zinc-500 group-hover/row:text-white group-open/row:rotate-180" />
        </summary>
        <div className="pb-4 text-sm text-zinc-300 leading-relaxed space-y-2">{children}</div>
      </details>
    </li>
  );
}

/** A section's title with its count beside it, large: "Recalls in Canada  5". */
export function CountHeading({
  id,
  title,
  count,
  tone = 'neutral',
}: {
  id?: string;
  title: string;
  count: number | null;
  /** Amber for a count to look into: recalls, an open investigation. */
  tone?: 'neutral' | 'warn';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="block-title">
        {title}
      </h2>
      {count != null && (
        <span
          className={`text-2xl font-bold tabular-nums leading-none ${
            tone === 'warn' && count > 0 ? 'text-amber-300' : 'text-white'
          }`}
        >
          {count.toLocaleString('en-CA')}
        </span>
      )}
    </div>
  );
}
