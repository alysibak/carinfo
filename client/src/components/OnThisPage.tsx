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
    <nav
      aria-label="On this page"
      className="mt-3 flex flex-wrap items-baseline gap-x-4 text-[13px]"
    >
      <span className="text-zinc-500">On this page</span>
      {SECTIONS.filter(([id]) => present.includes(id)).map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          className="inline-block py-1.5 text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
