import { createPortal } from 'react-dom';
import { HEADER_SLOT_ID } from './SiteHeader';
/**
 * A slim bar under the site header once the car page's figures scroll away:
 * the car, what it is worth and costs a year, and the two things a reader
 * does next. Rendered only while shown, so it is never in the tab order hidden.
 */
export default function PinnedCarBar({
  title,
  figures,
  inCompare,
  onCompare,
  onGarage,
}: {
  title: string;
  figures: string | null;
  inCompare: boolean;
  onCompare: () => void;
  onGarage: () => void;
}) {
  // On a wide screen, hung from the site header, so header and bar move
  // together: fixed under it, a Mac's bounce at the end of a page moved the
  // header and not the bar, and the page showed through between them.
  const slot = document.getElementById(HEADER_SLOT_ID);
  const top = (
    <div
      className={`${slot ? '' : 'fixed inset-x-0 z-40'} tabbar-shown:hidden border-b border-zinc-800 bg-black/90 backdrop-blur-md animate-pin-in [@media(max-height:500px)]:hidden`}
      style={slot ? undefined : { top: 'var(--header-height)' }}
    >
      <div className="page-wrap-wide py-2 flex items-center gap-3 min-h-[52px]">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          {figures && <p className="text-xs text-zinc-400 tabular-nums truncate">{figures}</p>}
        </div>
        <button
          type="button"
          onClick={onGarage}
          className="hidden sm:inline-flex btn-secondary min-h-[36px]! py-1.5! px-3! text-[13px]"
        >
          Save to garage
        </button>
        <button
          type="button"
          onClick={onCompare}
          className={`${inCompare ? 'btn-secondary' : 'btn-primary'} min-h-[36px]! py-1.5! px-3! text-[13px] shrink-0`}
        >
          {inCompare ? 'In compare' : 'Add to compare'}
        </button>
      </div>
    </div>
  );
  // On a phone, at the foot of the screen over the tab bar, under the thumb.
  const bottom = (
    <div
      className="hidden tabbar-shown:block fixed inset-x-0 z-40 border-t border-white/10 bg-black/95 backdrop-blur-xl animate-pin-up"
      style={{ bottom: 'var(--tabbar-height)' }}
    >
      <div className="page-wrap-wide py-2 flex items-center gap-2 min-h-[56px]">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white truncate">{title}</p>
          {figures && <p className="text-[11px] text-zinc-400 tabular-nums truncate">{figures}</p>}
        </div>
        <button
          type="button"
          onClick={onGarage}
          className="btn-secondary min-h-[44px]! py-2! px-3! text-[13px] shrink-0"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCompare}
          className={`${inCompare ? 'btn-secondary' : 'btn-primary'} min-h-[44px]! py-2! px-3.5! text-[13px] shrink-0`}
        >
          {inCompare ? 'In compare' : '+ Compare'}
        </button>
      </div>
    </div>
  );
  return (
    <>
      {slot ? createPortal(top, slot) : top}
      {bottom}
    </>
  );
}
