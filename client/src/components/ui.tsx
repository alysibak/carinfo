import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ProvenanceSource } from '../types/car.types';
import { useModalFocus } from '../hooks/useModalFocus';
import ProvenanceChip from './ProvenanceChip';

/** Consistent trust label: sourced vs estimated, used on cards and detail rows. */
export default function TrustLabel({
  source,
  estimated,
  className = '',
}: {
  source?: ProvenanceSource;
  /** Force "Est." when value is computed even if provenance key is missing */
  estimated?: boolean;
  className?: string;
}) {
  if (estimated) {
    return (
      <span
        className={`text-[9px] tracking-widest text-zinc-400 uppercase border border-dashed border-zinc-700 px-1.5 py-0.5 rounded-none ${className}`}
      >
        Est.
      </span>
    );
  }
  return <ProvenanceChip source={source} className={className} />;
}

export function BackLink({ to, label = 'Back' }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 sm:gap-3 text-xs tracking-[0.25em] sm:tracking-[0.3em] text-zinc-400 hover:text-white transition-colors group min-h-[44px] shrink-0"
    >
      <svg
        className="w-5 h-5 group-hover:-translate-x-1 transition-transform shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center" role="status" aria-live="polite">
        <div className="inline-block w-12 h-12 border-2 border-zinc-800 border-t-zinc-500 mb-4 opacity-60 animate-spin" aria-hidden />
        <p className="text-xs tracking-[0.3em] text-zinc-300 uppercase">{label}</p>
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
  backTo,
  backLabel = 'Back to home',
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="text-center px-6 max-w-md">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tighter mb-3">{title}</h2>
        <p className="text-sm tracking-wide text-zinc-400 mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-primary text-xs tracking-[0.25em]">
              Try again
            </button>
          )}
          {backTo && <BackLink to={backTo} label={backLabel} />}
        </div>
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const containerRef = useModalFocus(open, onClose);
  const titleId = useId();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 md:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-black/95 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-w-2xl w-full bg-black border border-zinc-800 p-6 md:p-8 max-h-[min(90vh,720px)] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 id={titleId} className="text-xl md:text-2xl font-black tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}) {
  const containerRef = useModalFocus(open, onClose);
  const titleId = useId();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 md:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-black/95 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-w-md w-full bg-black border border-zinc-800 p-6 md:p-8"
      >
        <h2 id={titleId} className="text-xl font-black tracking-tight mb-3">
          {title}
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary text-xs tracking-[0.2em]">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`text-xs tracking-[0.2em] px-5 py-2.5 font-medium uppercase transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function InfoTip({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    setOpen((v) => !v);
  };

  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={`relative w-4 h-4 border text-[10px] shrink-0 transition-colors before:absolute before:-inset-2 before:content-[''] ${
          open
            ? 'border-zinc-400 text-white bg-zinc-800'
            : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
        }`}
        aria-label={`What is ${label}?`}
      >
        ?
      </button>
      {open &&
        createPortal(
          <div
            id={panelId}
            role="dialog"
            className={`fixed z-[200] -translate-x-1/2 -translate-y-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 shadow-xl text-[11px] leading-relaxed normal-case tracking-normal ${
              wide ? 'w-72 max-w-[calc(100vw-2rem)]' : 'w-56 max-w-[calc(100vw-2rem)]'
            }`}
            style={{ top: coords.top, left: coords.left }}
          >
            {children}
          </div>,
          document.body,
        )}
    </span>
  );
}

function SectionChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExpandableSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div
      className={`border bg-black rounded-none transition-colors duration-150 ${
        open ? 'border-zinc-600' : 'border-zinc-800'
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-4 text-left hover:bg-zinc-950/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25"
      >
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold tracking-widest text-white uppercase block break-words">{title}</span>
          {summary && !open && (
            <p className="text-[11px] text-zinc-400 mt-1 leading-snug normal-case tracking-normal truncate">
              {summary}
            </p>
          )}
        </div>
        <SectionChevron open={open} />
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4 pt-2 border-t border-zinc-800 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function StatusToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-white text-black text-xs font-black tracking-[0.25em] uppercase"
    >
      {message}
    </div>
  );
}
