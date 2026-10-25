/**
 * CarInfo's mark: a squared C with a point of the accent inside it, the "info"
 * the site is for. The favicon and app icons are drawn from the same shapes
 * (public/favicon.svg).
 */
export default function BrandMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <path
        d="M24 8H8v16h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="square"
      />
      <rect x="18" y="14" width="4" height="4" className="fill-accent" />
    </svg>
  );
}
