import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  size?: 'sm' | 'md';
  className?: string;
  id?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
}

const MENU_MAX_HEIGHT = 256;
const MENU_MIN_HEIGHT = 120;
const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;
const TYPEAHEAD_RESET_MS = 600;

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SelectMenu({
  value,
  onChange,
  options,
  size = 'md',
  className = '',
  id,
  'aria-label': ariaLabel,
  disabled = false,
}: SelectMenuProps) {
  const autoId = useId();
  const listId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const typeahead = useRef({ buffer: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];
  const optionId = (index: number) => `${listId}-opt-${index}`;

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;
    const openUp = spaceBelow < MENU_MIN_HEIGHT && spaceAbove > spaceBelow;

    // Never taller than the room actually available, so the list scrolls
    // internally instead of running off the viewport.
    const room = Math.max(openUp ? spaceAbove : spaceBelow, MENU_MIN_HEIGHT);

    setMenuPosition({
      left: rect.left,
      width: rect.width,
      top: openUp ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
      maxHeight: Math.min(MENU_MAX_HEIGHT, room),
      openUp,
    });
  }, []);

  const openMenu = useCallback(() => {
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    updateMenuPosition();
    setOpen(true);
  }, [options, value, updateMenuPosition]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setMenuPosition(null);
    typeahead.current = { buffer: '', at: 0 };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as Element).closest?.(`[data-select-menu-panel="${listId}"]`)) return;
      closeMenu();
    };

    // Follow the trigger while the page moves, but give up once the trigger
    // itself has left the viewport — otherwise the panel hangs on screen
    // detached from the control that owns it.
    const onScrollOrResize = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
        closeMenu();
        return;
      }
      updateMenuPosition();
    };

    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, listId, closeMenu, updateMenuPosition]);

  // Keep the highlighted option inside the scroll box. Without this, arrowing
  // past the visible rows moves a highlight the user cannot see.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const pick = (next: string) => {
    onChange(next);
    closeMenu();
    triggerRef.current?.focus();
  };

  const moveTo = (index: number) => {
    if (options.length === 0) return;
    setActiveIndex(Math.max(0, Math.min(index, options.length - 1)));
  };

  const runTypeahead = (char: string) => {
    const now = Date.now();
    const t = typeahead.current;
    t.buffer = now - t.at > TYPEAHEAD_RESET_MS ? char : t.buffer + char;
    t.at = now;

    const from = t.buffer.length === 1 ? activeIndex + 1 : activeIndex;
    const ordered = options
      .map((option, index) => ({ option, index }))
      .slice(Math.max(from, 0))
      .concat(options.map((option, index) => ({ option, index })).slice(0, Math.max(from, 0)));

    const hit = ordered.find(({ option }) => option.label.toLowerCase().startsWith(t.buffer));
    if (hit) setActiveIndex(hit.index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openMenu();
        else moveTo(activeIndex + 1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openMenu();
        else moveTo(activeIndex - 1);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open && activeIndex >= 0) pick(options[activeIndex].value);
        else openMenu();
        return;
      case 'Escape':
        if (!open) return;
        e.preventDefault();
        closeMenu();
        return;
      case 'Tab':
        // Let focus move on, but never leave the panel behind.
        if (open) closeMenu();
        return;
      case 'Home':
        if (!open) return;
        e.preventDefault();
        moveTo(0);
        return;
      case 'End':
        if (!open) return;
        e.preventDefault();
        moveTo(options.length - 1);
        return;
      default:
        break;
    }

    // Type-to-jump, matching the native <select> these replaced.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const char = e.key.toLowerCase();
      if (!char.trim()) return;
      e.preventDefault();
      if (!open) openMenu();
      runTypeahead(char);
    }
  };

  const triggerClass =
    size === 'sm'
      ? 'min-h-[30px] px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase gap-2'
      : 'min-h-[42px] px-3 py-2 text-sm gap-3';

  optionRefs.current.length = options.length;

  const menu =
    open &&
    menuPosition &&
    createPortal(
      <ul
        ref={listRef}
        id={`${listId}-listbox`}
        data-select-menu-panel={listId}
        role="listbox"
        aria-labelledby={listId}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        className="fixed z-[200] overflow-y-auto border border-zinc-700 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        style={{
          left: menuPosition.left,
          width: menuPosition.width,
          top: menuPosition.top,
          maxHeight: menuPosition.maxHeight,
          transform: menuPosition.openUp ? 'translateY(-100%)' : undefined,
        }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === activeIndex;
          return (
            <li
              key={option.value}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(option.value)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer select-none border-b border-zinc-900 last:border-b-0 transition-colors ${
                size === 'sm'
                  ? 'px-2.5 py-2 text-[10px] tracking-[0.15em] uppercase'
                  : 'px-3 py-2.5 text-sm'
              } ${
                isSelected
                  ? 'bg-zinc-800 text-white'
                  : isActive
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-300'
              }`}
            >
              <span className="flex items-start gap-2">
                <span
                  className={`mt-0.5 shrink-0 w-3 text-zinc-500 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                  aria-hidden
                >
                  ✓
                </span>
                <span className="min-w-0 leading-snug">{option.label}</span>
              </span>
            </li>
          );
        })}
      </ul>,
      document.body,
    );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={listId}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${listId}-listbox` : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        onBlur={() => open && closeMenu()}
        className={`w-full flex items-center justify-between border bg-zinc-950 text-left text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25 disabled:opacity-40 disabled:cursor-not-allowed ${
          open ? 'border-zinc-500' : 'border-zinc-800 hover:border-zinc-600'
        } ${triggerClass}`}
      >
        <span className="truncate min-w-0">{selected?.label ?? 'Select'}</span>
        <ChevronDown
          className={`shrink-0 text-zinc-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}
