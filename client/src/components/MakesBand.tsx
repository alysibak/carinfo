/** Makes on file, the ones Canadians buy most first. Every one is in the catalogue. */
const MAKES = [
  'Toyota',
  'Honda',
  'Ford',
  'Chevrolet',
  'Hyundai',
  'Kia',
  'Mazda',
  'Subaru',
  'Nissan',
  'Volkswagen',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Lexus',
  'Tesla',
  'Jeep',
  'Ram',
  'GMC',
  'Porsche',
  'Volvo',
];

/**
 * The makes on file drifting past in large outlined letters, under the home
 * page's hero: a sense of how much is here, not something to read or click
 * (Browse lists every make). Still for reduced motion; it pauses under the
 * pointer.
 */
export default function MakesBand() {
  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-b border-zinc-900 py-6 sm:py-9 select-none [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]"
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {MAKES.map((make) => (
              <li
                key={make}
                className="px-6 sm:px-10 text-5xl sm:text-7xl font-bold tracking-[-0.04em] whitespace-nowrap text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.2)]"
              >
                {make}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
