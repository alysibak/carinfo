import { useEffect, useState } from 'react';
import { msg, t } from '../i18n';

/** The car page's sections, in page order, by the ids they render with. */
const SECTIONS: Array<[id: string, label: string]> = [
  ['safety', msg('Crash tests')],
  ['recalls', msg('Recalls and complaints')],
  ['theft', msg('Theft')],
  ['size', msg('Size and space')],
  ['costs', msg('Running costs')],
  ['specs', msg('More specs')],
  ['similar', msg('Alternatives')],
];

export interface PageSection {
  id: string;
  label: string;
}

/**
 * The sections on the page now, in order: a car with no crash test has
 * none, and alternatives load after the rest.
 */
export function usePageSections(pageKey: string): PageSection[] {
  const [present, setPresent] = useState<string[]>([]);

  useEffect(() => {
    const check = () => {
      const found = SECTIONS.map(([id]) => id).filter((id) => document.getElementById(id));
      setPresent((prev) => (prev.join() === found.join() ? prev : found));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pageKey]);

  return SECTIONS.filter(([id]) => present.includes(id)).map(([id, label]) => ({
    id,
    label: t(label),
  }));
}

/**
 * The section being read: the last whose top has passed under the header
 * and the pinned links. Checked on scroll, a frame at a time.
 */
export function useCurrentSection(sections: PageSection[], offset = 150): string | null {
  const [current, setCurrent] = useState<string | null>(null);
  const ids = sections.map((section) => section.id).join();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let found: string | null = null;
      for (const id of ids.split(',')) {
        const el = id ? document.getElementById(id) : null;
        if (el && el.getBoundingClientRect().top <= offset) found = id;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids, offset]);

  return current;
}
