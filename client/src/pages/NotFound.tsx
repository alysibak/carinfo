import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import { useNoIndex, usePageMeta } from '../utils/pageMeta';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

/** Where most people were headed, in their words. */
const WAYS_ON = [
  { to: '/browse', label: 'Start from what you need' },
  { to: '/compare', label: 'Compare cars' },
  { to: '/vin', label: 'Look up a VIN' },
] as const;

export default function NotFound() {
  usePageMeta('Page not found', 'This CarInfo page does not exist.');
  useNoIndex();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const search = (q: string) => {
    const trimmed = q.trim();
    if (VIN_PATTERN.test(trimmed)) {
      navigate(`/vin?vin=${encodeURIComponent(trimmed.toUpperCase())}`);
      return;
    }
    navigate(trimmed ? `/home?q=${encodeURIComponent(trimmed)}&sort=relevance` : '/home');
  };

  return (
    <div className="min-h-[60vh] bg-black text-white flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">
        <h1 className="page-title mb-3">Page not found</h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          The address may be mistyped, or the page has moved. Search for the car instead.
        </p>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={search}
          placeholder="Make, model, or VIN"
        />
        <ul className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 text-sm">
          {WAYS_ON.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="text-zinc-200 underline underline-offset-4 decoration-zinc-600 min-h-[44px] inline-flex items-center"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
