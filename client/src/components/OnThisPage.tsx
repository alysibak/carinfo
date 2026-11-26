import { useEffect, useRef } from 'react';
import { t } from '../i18n';
import type { PageSection } from '../hooks/usePageSections';

/** Section links as chips a thumb swipes along on a phone; the one being read is marked. */
export function SectionChips({
  sections,
  small = false,
  current = null,
}: {
  sections: PageSection[];
  small?: boolean;
  current?: string | null;
}) {
  const refs = useRef(new Map<string, HTMLAnchorElement>());
  // Keep the marked chip in view along the strip, without moving the page.
  useEffect(() => {
    const chip = current ? refs.current.get(current) : undefined;
    const strip = chip?.parentElement;
    if (!chip || !strip || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: chip.offsetLeft - 16, behavior: 'smooth' });
  }, [current]);
  return (
    <>
      {sections.map(({ id, label }) => (
        <a
          key={id}
          ref={(el) => {
            if (el) refs.current.set(id, el);
            else refs.current.delete(id);
          }}
          href={`#${id}`}
          aria-current={current === id ? 'location' : undefined}
          className={`chip shrink-0 whitespace-nowrap ${current === id ? 'chip-on' : ''} ${
            small ? 'min-h-[32px]! py-1! text-xs!' : ''
          }`}
        >
          {label}
        </a>
      ))}
    </>
  );
}

/**
 * Links to the car page's chapters, under its verdict: on a phone the page
 * runs to ten screens. The pinned bar carries the same links once these
 * scroll away.
 */
export default function OnThisPage({ sections }: { sections: PageSection[] }) {
  if (sections.length < 3) return null;
  return (
    // One line of chips a thumb swipes along on a phone; wrapped links read as
    // a paragraph and took four lines.
    <nav
      aria-label={t('On this page')}
      className="mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto scrollbar-none sm:flex-wrap sm:overflow-visible overscroll-x-contain"
    >
      <span className="text-[13px] text-zinc-500 shrink-0 mr-1">{t('On this page')}</span>
      <SectionChips sections={sections} />
    </nav>
  );
}
