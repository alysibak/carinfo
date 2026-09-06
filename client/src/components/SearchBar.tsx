import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as api from '../services/api';
import type { SearchSuggestion } from '../services/api';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'default' | 'large' | 'hero';
  showButton?: boolean;
  loading?: boolean;
}

interface ListPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const LIST_MAX_HEIGHT = 320;
const LIST_GAP = 8;
const VIEWPORT_MARGIN = 8;

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search make, model, or year, e.g. 2024 Camry',
  autoFocus = false,
  size = 'default',
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
  const [listPosition, setListPosition] = useState<ListPosition | null>(null);

  const updateListPosition = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - LIST_GAP - VIEWPORT_MARGIN;
    setListPosition({
      top: rect.bottom + LIST_GAP,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(LIST_MAX_HEIGHT, Math.max(0, spaceBelow)),
    });
  }, []);

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
    updateListPosition();
    const timer = setTimeout(() => loadSuggestions(value), value ? 120 : 0);
    return () => clearTimeout(timer);
  }, [value, open, loadSuggestions, updateListPosition]);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as Element).closest?.(`[data-search-suggest="${listId}"]`)) return;
      setOpen(false);
    };

    const onScrollOrResize = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom <= 0 || rect.top >= window.innerHeight) {
        setOpen(false);
        return;
      }
      updateListPosition();
    };

    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, listId, updateListPosition]);

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

  const inputClass =
    size === 'hero'
      ? 'w-full h-12 sm:h-14 lg:h-16 pl-11 sm:pl-12 pr-4 bg-zinc-950 border-0 text-white text-base placeholder-zinc-500 focus:outline-none rounded-none min-w-0'
      : size === 'large'
        ? 'w-full pl-12 pr-4 py-4 bg-zinc-950 border border-zinc-700 text-white text-base placeholder-zinc-500 focus:outline-none focus:border-zinc-400 rounded-none transition-colors'
        : 'w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-400 rounded-none transition-colors';

  const buttonClass =
    size === 'hero'
      ? 'h-12 sm:h-14 lg:h-16 px-5 sm:px-8 lg:px-10 bg-white text-black text-sm font-semibold uppercase tracking-wider sm:tracking-widest rounded-none hover:bg-zinc-200 transition-colors disabled:opacity-50 border-0 w-full sm:w-auto'
      : size === 'large'
        ? 'px-8 py-4 bg-white text-black text-sm font-semibold uppercase tracking-wider rounded-none hover:bg-zinc-200 transition-colors disabled:opacity-50'
        : 'px-6 py-3 bg-white text-black text-sm font-semibold uppercase tracking-wider rounded-none hover:bg-zinc-200 transition-colors disabled:opacity-50';

  const iconSize = size === 'default' ? 'w-4 h-4' : 'w-5 h-5';

  const inputEl = (
    <div className="relative flex-1 min-w-0">
      <svg
        className={`absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 ${iconSize}`}
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
  );

  const buttonEl = showButton && (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={loading}
      className={`${buttonClass} ${size === 'hero' ? '' : 'w-full sm:w-auto shrink-0'}`}
    >
      {loading ? '…' : 'Search'}
    </button>
  );

  const suggestList =
    open &&
    listPosition &&
    (suggestions.length > 0 || fetching) &&
    createPortal(
      <ul
        id={listId}
        data-search-suggest={listId}
        role="listbox"
        className="fixed z-[200] overflow-y-auto border border-zinc-700 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        style={{
          top: listPosition.top,
          left: listPosition.left,
          width: listPosition.width,
          maxHeight: listPosition.maxHeight,
        }}
      >
        {fetching && suggestions.length === 0 && (
          <li className="px-4 py-3 text-sm text-zinc-400 opacity-50">Loading suggestions…</li>
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
              {s.sublabel && <p className="text-xs text-zinc-400 mt-0.5">{s.sublabel}</p>}
            </button>
          </li>
        ))}
      </ul>,
      document.body,
    );

  return (
    <div ref={rootRef} className="relative w-full">
      {size === 'hero' && showButton ? (
        <div className="flex flex-col sm:flex-row border border-zinc-700 rounded-none min-w-0">
          {inputEl}
          <div className="border-t sm:border-t-0 sm:border-l border-zinc-700 shrink-0">{buttonEl}</div>
        </div>
      ) : (
        <div className={`flex gap-3 ${showButton ? 'flex-col sm:flex-row' : ''}`}>
          {inputEl}
          {buttonEl}
        </div>
      )}

      {suggestList}
    </div>
  );
}
