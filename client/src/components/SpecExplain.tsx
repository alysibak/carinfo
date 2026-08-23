import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SpecGlossaryKey } from '../utils/specGlossary';
import { getSpecEntry } from '../utils/specGlossary';

/** Click-to-open spec definition — fixed position, no layout shift. */
export function SpecExplain({ glossaryKey }: { glossaryKey: SpecGlossaryKey }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { what, why } = getSpecEntry(glossaryKey);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={`w-4 h-4 border text-[10px] shrink-0 transition-colors ${
          open
            ? 'border-zinc-400 text-white bg-zinc-800'
            : 'border-zinc-700 text-zinc-600 hover:text-white hover:border-zinc-500'
        }`}
        aria-label="Explain this spec"
      >
        ?
      </button>
      {open &&
        createPortal(
          <div
            id={panelId}
            role="dialog"
            className="fixed z-[200] w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 shadow-xl text-[11px] leading-relaxed"
            style={{ top: coords.top, left: coords.left }}
          >
            <p className="text-zinc-300">{what}</p>
            {why && <p className="text-zinc-500 mt-1.5">{why}</p>}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Label with optional click-to-explain button. */
export function SpecLabel({
  label,
  glossaryKey,
}: {
  label: string;
  glossaryKey?: SpecGlossaryKey;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {glossaryKey && <SpecExplain glossaryKey={glossaryKey} />}
    </span>
  );
}
