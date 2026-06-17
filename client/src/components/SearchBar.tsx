import { useCallback, useEffect, useId, useRef, useState } from 'react';
import * as api from '../services/api';
import type { SearchSuggestion } from '../services/api';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'default' | 'large';
  variant?: 'default' | 'luxury';
  showButton?: boolean;
  loading?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search make, model, or year — e.g. 2024 Camry',
  autoFocus = false,
  size = 'default',
  variant = 'default',
  showButton = true,
  loading = false,
}: SearchBarProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [fetching, setFetching] = useState(false);

  const loadSuggestions = useCallback(async (q: string) => {
    setFetching(true);
    try {
      const data = await api.getSearchSuggestions(q);
      setSuggestions(data);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => loadSuggestions(value), value ? 180 : 0);
    return () => clearTimeout(timer);
  }, [value, open, loadSuggestions]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pickSuggestion = (s: SearchSuggestion) => {
    onChange(s.query);
    onSubmit(s.query);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleSubmit = () => {
    onSubmit(value.trim());
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        pickSuggestion(suggestions[activeIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const isLuxury = variant === 'luxury';

  const inputClass = isLuxury
    ? size === 'large'
      ? 'w-full pl-12 pr-4 py-4 bg-transparent border-b border-[rgba(196,165,116,0.25)] text-ivory text-base placeholder-stone focus:outline-none focus:border-champagne/60 transition-colors font-light'
      : 'w-full pl-11 pr-4 py-3 bg-transparent border-b border-[rgba(196,165,116,0.25)] text-ivory text-sm placeholder-stone focus:outline-none focus:border-champagne/60 transition-colors'
    : size === 'large'
      ? 'w-full pl-12 pr-4 py-4 bg-zinc-950 border border-zinc-700 text-white text-base placeholder-zinc-500 focus:outline-none focus:border-zinc-400 rounded-xl transition-colors'
      : 'w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-400 rounded-xl transition-colors';

  const buttonClass = isLuxury
    ? size === 'large'
      ? 'px-8 py-4 border border-champagne/50 text-champagne text-xs font-medium uppercase tracking-[0.2em] hover:bg-champagne/10 transition-colors disabled:opacity-50'
      : 'px-6 py-3 border border-champagne/50 text-champagne text-xs font-medium uppercase tracking-[0.2em] hover:bg-champagne/10 transition-colors disabled:opacity-50'
    : size === 'large'
      ? 'px-8 py-4 bg-white text-black text-sm font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50'
      : 'px-6 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50';

  return (
    <div ref={rootRef} className="relative w-full">
      <div className={`flex gap-3 ${showButton ? '' : ''}`}>
        <div className="relative flex-1">
          <svg
            className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLuxury ? 'text-champagne/60' : 'text-zinc-400'} ${size === 'large' ? 'w-5 h-5' : 'w-4 h-4'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoFocus={autoFocus}
            placeholder={placeholder}
            className={inputClass}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              if (suggestions.length === 0) loadSuggestions(value);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        {showButton && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={buttonClass}
          >
            {loading ? '…' : isLuxury ? 'Search' : 'Search'}
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || fetching) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 border border-zinc-700 bg-zinc-950 shadow-2xl max-h-80 overflow-y-auto rounded-xl"
        >
          {fetching && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-zinc-400">Loading suggestions…</li>
          )}
          {suggestions.map((s, index) => (
            <li key={s.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(s)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-900 last:border-0 transition-colors ${
                  index === activeIndex ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                }`}
              >
                <p className="text-sm font-semibold text-white">{s.label}</p>
                {s.sublabel && (
                  <p className="text-xs text-zinc-400 mt-0.5">{s.sublabel}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
