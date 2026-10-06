import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import FilterSidebar from './FilterSidebar';
import { useModalFocus } from '../hooks/useModalFocus';

/**
 * Every filter, full screen, on a phone or tablet: filters apply as they are
 * tapped, and the button at the bottom says how many cars they leave. It
 * replaced a "Show" link above the results that pushed a 6,000-pixel panel in
 * front of them and scrolled away as soon as the results did.
 */
export default function FilterSheet({
  open,
  onClose,
  onFiltersApplied,
  resultLabel,
  updating,
}: {
  open: boolean;
  onClose: () => void;
  onFiltersApplied: (text?: string) => void;
  /** "309 models", or null before anything has been searched. */
  resultLabel: string | null;
  updating: boolean;
}) {
  const containerRef = useModalFocus(open, onClose);
  const titleId = useId();

  // The page behind stays put while the sheet scrolls.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-60 flex flex-col bg-black"
    >
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-14 border-b border-zinc-800 shrink-0">
        <h2 id={titleId} className="text-lg font-bold tracking-tight">
          Filters
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white"
          aria-label="Close filters"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5">
        <FilterSidebar variant="sheet" onFiltersApplied={onFiltersApplied} />
      </div>

      <div className="shrink-0 border-t border-zinc-800 px-4 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button type="button" onClick={onClose} className="btn-primary w-full" aria-live="polite">
          {updating ? 'Updating…' : resultLabel ? `Show ${resultLabel}` : 'Done'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
