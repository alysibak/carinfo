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
  openUp: boolean;
}

const MENU_MAX_HEIGHT = 256;
const MENU_GAP = 4;

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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const spaceAbove = rect.top - MENU_GAP;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;

    setMenuPosition({
      left: rect.left,
      width: rect.width,
      top: openUp ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
      openUp,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as Element).closest?.(`[data-select-menu-panel="${listId}"]`)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, listId]);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      setActiveIndex(-1);
      return;
    }

    updateMenuPosition();
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, options, value, updateMenuPosition]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open && activeIndex >= 0) {
        pick(options[activeIndex].value);
      } else {
        setOpen(true);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Home' && open) {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End' && open) {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    }
  };

  const triggerClass =
    size === 'sm'
      ? 'min-h-[30px] px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase gap-2'
      : 'min-h-[42px] px-3 py-2 text-sm gap-3';

  const menu =
    open &&
    menuPosition &&
    createPortal(
      <ul
        id={`${listId}-listbox`}
        data-select-menu-panel={listId}
        role="listbox"
        aria-labelledby={listId}
        className="fixed z-[200] overflow-y-auto border border-zinc-700 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        style={{
          left: menuPosition.left,
          width: menuPosition.width,
          top: menuPosition.top,
          maxHeight: MENU_MAX_HEIGHT,
          transform: menuPosition.openUp ? 'translateY(-100%)' : undefined,
        }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === activeIndex;
          return (
            <li key={option.value} role="option" aria-selected={isSelected}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(option.value)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full text-left border-b border-zinc-900 last:border-b-0 transition-colors ${
                  size === 'sm'
                    ? 'px-2.5 py-2 text-[10px] tracking-[0.15em] uppercase'
                    : 'px-3 py-2.5 text-sm'
                } ${
                  isSelected
                    ? 'bg-zinc-800 text-white'
                    : isActive
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
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
              </button>
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
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
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
