import { t } from '../i18n';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import ShareButton from './ShareButton';
import { HEADER_SLOT_ID } from './SiteHeader';
import { SectionChips } from './OnThisPage';
import { useCurrentSection, type PageSection } from '../hooks/usePageSections';
/**
 * A slim bar under the site header once the car page's figures scroll away:
 * the car, what it is worth and costs a year, and the two things a reader
 * does next. Rendered only while shown, so it is never in the tab order hidden.
 */
export default function PinnedCarBar({
  title,
  figures,
  inCompare = false,
  onCompare,
  onGarage,
  shareUrl,
  checklistPath,
  action,
  sections = [],
}: {
  title: string;
  figures: string | null;
  inCompare?: boolean;
  /** Absent on a model's page, which compares and saves its versions instead. */
  onCompare?: () => void;
  onGarage?: () => void;
  /** The page's own address, to hand on. */
  shareUrl?: string;
  /** The car's checklist, for the walk round it. */
  checklistPath?: string;
  /** A page's one next step where it has no compare: "See the 2026". */
  action?: { label: string; to: string };
  /** The page's sections, a tap away however far down the reader is. */
  sections?: PageSection[];
}) {
  const jump = sections.length >= 3;
  const current = useCurrentSection(jump ? sections : []);
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
        {checklistPath && (
          <Link
            to={checklistPath}
            className="hidden md:inline-flex btn-ghost min-h-[36px]! py-1.5! px-2! text-[13px]"
          >
            {t('Checklist')}
          </Link>
        )}
        {shareUrl && (
          <ShareButton
            url={shareUrl}
            title={title}
            className="hidden sm:inline-flex btn-ghost min-h-[36px]! py-1.5! px-2! text-[13px]"
          />
        )}
        {onGarage && (
          <button
            type="button"
            onClick={onGarage}
            className="hidden sm:inline-flex btn-secondary min-h-[36px]! py-1.5! px-3! text-[13px]"
          >
            {t('Save to garage')}
          </button>
        )}
        {onCompare && (
          <button
            type="button"
            onClick={onCompare}
            className={`${inCompare ? 'btn-secondary' : 'btn-primary'} min-h-[36px]! py-1.5! px-3! text-[13px] shrink-0`}
          >
            {inCompare ? t('In compare') : t('Add to compare')}
          </button>
        )}
        {action && (
          <Link
            to={action.to}
            className="btn-primary min-h-[36px]! py-1.5! px-3! text-[13px] shrink-0"
          >
            {action.label}
          </Link>
        )}
      </div>
      {jump && (
        <nav
          aria-label={t('On this page')}
          className="page-wrap-wide pb-2 -mt-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none"
        >
          <SectionChips sections={sections} small current={current} />
        </nav>
      )}
    </div>
  );
  // On a phone the actions sit at the foot of the screen, under the thumb, and
  // the sections in a slim strip under the header.
  const strip = jump && (
    <nav
      aria-label={t('On this page')}
      className="hidden tabbar-shown:flex fixed inset-x-0 z-40 border-b border-zinc-800 bg-black/90 backdrop-blur-md animate-pin-in px-4 py-1.5 gap-1.5 overflow-x-auto scrollbar-none overscroll-x-contain [@media(max-height:500px)]:hidden"
      style={{ top: 'var(--header-height)' }}
    >
      <SectionChips sections={sections} small current={current} />
    </nav>
  );
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
        {shareUrl && (
          <ShareButton
            url={shareUrl}
            title={title}
            iconOnly
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-zinc-300 hover:text-white active:bg-zinc-900 shrink-0"
          />
        )}
        {onGarage && (
          <button
            type="button"
            onClick={onGarage}
            className="btn-secondary min-h-[44px]! py-2! px-3! text-[13px] shrink-0"
          >
            {t('Save')}
          </button>
        )}
        {onCompare && (
          <button
            type="button"
            onClick={onCompare}
            className={`${inCompare ? 'btn-secondary' : 'btn-primary'} min-h-[44px]! py-2! px-3.5! text-[13px] shrink-0`}
          >
            {inCompare ? t('In compare') : t('+ Compare')}
          </button>
        )}
        {action && (
          <Link
            to={action.to}
            className="btn-primary min-h-[44px]! py-2! px-3.5! text-[13px] shrink-0"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
  return (
    <>
      {slot ? createPortal(top, slot) : top}
      {strip}
      {bottom}
    </>
  );
}
