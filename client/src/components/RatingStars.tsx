/**
 * NHTSA's stars, drawn: the stars earned lit, the rest dim. Beside a figure
 * that says the rating in numbers, so the drawing is for the eye alone.
 */
export default function RatingStars({
  stars,
  className = 'w-3.5 h-3.5',
}: {
  stars: number;
  /** The size of each star. */
  className?: string;
}) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden data-stars={stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`${className} ${i <= stars ? 'fill-accent' : 'fill-zinc-700'}`}
        >
          <path d="M10 1.6l2.5 5.4 5.9.7-4.4 4 1.2 5.8L10 14.6l-5.2 2.9 1.2-5.8-4.4-4 5.9-.7z" />
        </svg>
      ))}
    </span>
  );
}
