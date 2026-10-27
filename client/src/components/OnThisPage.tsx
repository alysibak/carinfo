import { useEffect, useState } from 'react';

/** The car page's sections, in page order, by the ids they render with. */
const SECTIONS: Array<[id: string, label: string]> = [
  ['safety', 'Crash tests'],
  ['recalls', 'Recalls and complaints'],
  ['theft', 'Theft'],
  ['size', 'Size and space'],
  ['costs', 'Running costs'],
  ['specs', 'More specs'],
  ['similar', 'Alternatives'],
];

/**
 * Links to the car page's sections, under its key figures: on a phone the
 * page runs to ten screens. A section shows here once it is on the page (a
 * car with no crash test has none; alternatives load after the rest).
 */
export default function OnThisPage({ pageKey }: { pageKey: string }) {
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

  if (present.length < 3) return null;
  return (
    // One line of chips a thumb swipes along on a phone; wrapped links read as
    // a paragraph and took four lines.
    <nav
      aria-label="On this page"
      className="mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto scrollbar-none sm:flex-wrap sm:overflow-visible overscroll-x-contain"
    >
      <span className="text-[13px] text-zinc-500 shrink-0 mr-1">On this page</span>
      {SECTIONS.filter(([id]) => present.includes(id)).map(([id, label]) => (
        <a key={id} href={`#${id}`} className="chip shrink-0 whitespace-nowrap">
          {label}
        </a>
      ))}
    </nav>
  );
}
