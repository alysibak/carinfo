import { useEffect, useRef, useState } from 'react';

/**
 * A whole number that counts up from nothing the first time it comes into
 * view, then stays. Screen readers and anyone who asked for less motion get
 * the number as it is.
 */
export default function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
    if (!el || still || typeof IntersectionObserver === 'undefined') {
      setShown(value);
      return;
    }
    let frame = 0;
    setShown(0);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // Fast at first, settling into the figure.
          setShown(Math.round(value * (1 - (1 - t) ** 3)));
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  // One element throughout, watched from the start: counted, it holds plain
  // text; while counting, a screen reader hears the figure itself rather than
  // every step on the way.
  return (
    <span ref={ref}>
      {shown === value ? (
        value.toLocaleString('en-CA')
      ) : (
        <>
          <span className="sr-only">{value.toLocaleString('en-CA')}</span>
          <span aria-hidden>{shown.toLocaleString('en-CA')}</span>
        </>
      )}
    </span>
  );
}
