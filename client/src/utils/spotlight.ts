/**
 * Tells a `.spotlight` card where the pointer is on it, as --mx and --my, so
 * its light follows (see the spotlight utility in index.css). One listener for
 * the page, a frame at a time; a mouse only, as a finger has nothing to follow.
 */
export function installSpotlight(): void {
  if (typeof window === 'undefined' || !window.matchMedia?.('(hover: hover)').matches) return;
  let frame = 0;
  let last: PointerEvent | null = null;
  const place = () => {
    frame = 0;
    const event = last;
    if (!event) return;
    const card = (event.target as Element | null)?.closest?.<HTMLElement>('.spotlight');
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - box.left}px`);
    card.style.setProperty('--my', `${event.clientY - box.top}px`);
  };
  document.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      last = event;
      if (!frame) frame = requestAnimationFrame(place);
    },
    { passive: true },
  );
}
