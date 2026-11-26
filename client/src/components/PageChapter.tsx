import type { ReactNode } from 'react';

/**
 * A chapter of the car page: its sections under one name, which the chips
 * under the verdict and the pinned bar jump to. Fifteen sections, some a
 * line long, read as five parts. Shown only where a section in it has
 * something to say.
 */
export default function PageChapter({
  id,
  label,
  showLabel = true,
  children,
}: {
  id: string;
  label: string;
  /** Off where the chapter's first heading says the same ("Alternatives"). */
  showLabel?: boolean;
  children: ReactNode;
}) {
  return (
    // Hidden only where nothing in it rendered; a browser without :has()
    // shows the chapter rather than hide what is in it.
    <div id={id} className="[&:not(:has(section))]:hidden scroll-mt-28">
      {showLabel && (
        <div className="page-wrap-wide pt-10 sm:pt-12 -mb-4 sm:-mb-6">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {label}
          </p>
        </div>
      )}
      {children}
    </div>
  );
}
