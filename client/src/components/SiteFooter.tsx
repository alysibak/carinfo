import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';
import { regionName, useRegionStore } from '../stores/regionStore';

const linkClass = 'inline-flex items-center min-h-[36px] text-zinc-400 hover:text-white';

const FIND = [
  { to: '/home', label: 'Search' },
  { to: '/browse', label: 'Browse' },
  { to: '/compare', label: 'Compare' },
  { to: '/vin', label: 'VIN lookup' },
] as const;

const ABOUT = [
  { to: '/methodology', label: 'Methodology and data policy' },
  { to: '/value-matrix', label: 'Value chart' },
] as const;

const SOURCES = [
  { href: 'https://www.fueleconomy.gov', label: 'EPA', gives: 'fuel use' },
  { href: 'https://www.nhtsa.gov', label: 'NHTSA', gives: 'crash ratings and complaints' },
  {
    href: 'https://recalls-rappels.canada.ca/en',
    label: 'Transport Canada',
    gives: 'recalls',
  },
] as const;

/**
 * Every page's footer, the landing page's included: what CarInfo is, where
 * to go, and where its figures come from. The two pages once had a footer
 * each, laid out and worded differently.
 */
export default function SiteFooter() {
  const regionLabel = regionName(useRegionStore((s) => s.region));
  return (
    <footer className="border-t border-zinc-900 mt-auto">
      <div className="page-wrap py-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] text-sm">
        <div className="col-span-2 md:col-span-1 max-w-sm">
          <p className="inline-flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.18em] text-white">
            <BrandMark className="w-5 h-5 shrink-0" />
            CarInfo
          </p>
          <p className="mt-3 text-zinc-400 leading-relaxed">
            Each car&rsquo;s recalls in Canada, owners&rsquo; complaints, crash ratings and fuel
            use, from public records. CarInfo sells no cars and lists none for sale.
          </p>
        </div>
        <nav aria-label="Find a car">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 mb-2">
            Find a car
          </p>
          <ul>
            {FIND.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="About the data">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 mb-2">
            About the data
          </p>
          <ul>
            {ABOUT.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="page-wrap pb-8">
        <div className="pt-5 border-t border-zinc-900 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-xs text-zinc-500 leading-relaxed">
          <p>
            {SOURCES.map((source, index) => (
              <span key={source.label}>
                {index > 0 && <span aria-hidden="true"> · </span>}
                {source.gives[0].toUpperCase() + source.gives.slice(1)} from{' '}
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white underline underline-offset-2 decoration-zinc-700"
                >
                  {source.label}
                </a>
              </span>
            ))}
            <span aria-hidden="true"> · </span>
            Photos from Wikimedia Commons
          </p>
          <p>
            Estimates in CAD, for {regionLabel} · © {new Date().getFullYear()} CarInfo
          </p>
        </div>
      </div>
    </footer>
  );
}
