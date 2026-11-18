import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProvenanceSource } from '../types/car.types';
import { t } from '../i18n';

const LABELS: Record<ProvenanceSource, string> = {
  epa: 'EPA',
  nrcan: 'NRCan',
  nhtsa: 'NHTSA',
  estimated: 'Est.',
  curated: 'Maker',
};

/**
 * A label, not a button: small capitals with no box, which read as a tag a
 * mouse should press. An estimate is set apart in italics.
 */
const STYLES: Record<ProvenanceSource, string> = {
  epa: 'text-zinc-400',
  nrcan: 'text-zinc-400',
  nhtsa: 'text-zinc-400',
  estimated: 'text-zinc-400 italic',
  curated: 'text-zinc-400',
};

/** Where a figure marked with this source came from, in a sentence. */
function explanation(source: ProvenanceSource): string {
  switch (source) {
    case 'epa':
      return t('Measured by the U.S. EPA and published on FuelEconomy.gov.');
    case 'nrcan':
      return t(
        'From Natural Resources Canada’s fuel consumption ratings, for a car EPA never rated.',
      );
    case 'nhtsa':
      return t('From NHTSA, the U.S. road safety agency.');
    case 'estimated':
      return t('Our estimate from the records on file: not a quote or an appraisal.');
    case 'curated':
      return t('The maker’s published figure, read from its own pages.');
  }
}

interface ProvenanceChipProps {
  source?: ProvenanceSource;
  className?: string;
  /**
   * A tap shows where the figure is from: for a chip not inside a link or a
   * button, where a phone has no hover to show the title.
   */
  explain?: boolean;
}

export default function ProvenanceChip({
  source,
  className = '',
  explain = false,
}: ProvenanceChipProps) {
  // Fixed on the page and kept on screen: a card's blur would clip or
  // misplace a panel positioned inside it.
  const [at, setAt] = useState<{ top: number; left: number; width: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!button.current?.contains(target) && !panel.current?.contains(target)) close();
    };
    const scrolling = { passive: true, capture: true };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('scroll', close, scrolling);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('scroll', close, scrolling);
      window.removeEventListener('resize', close);
    };
  }, [at]);
  if (!source) return null;
  const chip = `inline-block text-[11px] font-semibold uppercase tracking-[0.08em] leading-none ${STYLES[source]}`;
  if (!explain) {
    return (
      <span className={`${chip} cursor-help ${className}`} title={explanation(source)}>
        {LABELS[source]}
      </span>
    );
  }
  const toggle = () => {
    if (at || !button.current) return setAt(null);
    const rect = button.current.getBoundingClientRect();
    const width = Math.min(240, window.innerWidth - 32);
    setAt({
      top: rect.bottom + 4,
      left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
      width,
    });
  };
  return (
    <span className={`inline-flex ${className}`}>
      <button
        ref={button}
        type="button"
        aria-expanded={!!at}
        aria-controls={at ? panelId : undefined}
        onClick={toggle}
        className={`${chip} -m-2 p-2 underline decoration-dotted underline-offset-[3px] decoration-zinc-600 hover:text-white`}
      >
        {LABELS[source]}
      </button>
      {at &&
        createPortal(
          <span
            ref={panel}
            id={panelId}
            role="note"
            style={{ top: at.top, left: at.left, width: at.width }}
            className="fixed z-200 block border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs leading-relaxed text-zinc-200 shadow-xl"
          >
            {explanation(source)}
          </span>,
          document.body,
        )}
    </span>
  );
}
