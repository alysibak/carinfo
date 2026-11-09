import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';
import LanguageSwitch from './LanguageSwitch';
import { regionName, useRegionStore } from '../stores/regionStore';
import { locale, msg, t } from '../i18n';
import { rich } from '../i18n/rich';

const linkClass = 'inline-flex items-center min-h-[36px] text-zinc-400 hover:text-white';

const FIND = [
  { to: '/home', label: msg('Search') },
  { to: '/browse', label: msg('Browse') },
  { to: '/compare', label: msg('Compare') },
  { to: '/vin', label: msg('VIN lookup') },
] as const;

const ABOUT = [
  { to: '/methodology', label: msg('Methodology and data policy') },
  { to: '/value-matrix', label: msg('Value chart') },
] as const;

const SOURCES = [
  { href: 'https://www.fueleconomy.gov', label: 'EPA', gives: msg('Fuel use from <0>EPA</0>') },
  {
    href: 'https://www.nhtsa.gov',
    label: 'NHTSA',
    gives: msg('Crash ratings and complaints from <0>NHTSA</0>'),
  },
  {
    href: 'https://recalls-rappels.canada.ca/en',
    hrefFr: 'https://recalls-rappels.canada.ca/fr',
    label: 'Transport Canada',
    gives: msg('Recalls from <0>Transport Canada</0>'),
  },
] as const;

/**
 * Every page's footer, the landing page's included: what CarInfo is, where
 * to go, and where its figures come from. The two pages once had a footer
 * each, laid out and worded differently.
 */
export default function SiteFooter() {
  const regionLabel = t(regionName(useRegionStore((s) => s.region)));
  return (
    <footer className="border-t border-zinc-900 mt-auto">
      <div className="page-wrap py-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] text-sm">
        <div className="col-span-2 md:col-span-1 max-w-sm">
          <p className="inline-flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.18em] text-white">
            <BrandMark className="w-5 h-5 shrink-0" />
            CarInfo
          </p>
          <p className="mt-3 text-zinc-400 leading-relaxed">
            {t(
              'Each car’s recalls in Canada, owners’ complaints, crash ratings and fuel use, from public records. CarInfo sells no cars and lists none for sale.',
            )}
          </p>
        </div>
        <nav aria-label={t('Find a car')}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 mb-2">
            {t('Find a car')}
          </p>
          <ul>
            {FIND.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('About the data')}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 mb-2">
            {t('About the data')}
          </p>
          <ul>
            {ABOUT.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={linkClass}>
                  {t(item.label)}
                </Link>
              </li>
            ))}
            <li>
              <LanguageSwitch className="!px-0 !min-h-[36px]" />
            </li>
          </ul>
        </nav>
      </div>
      <div className="page-wrap pb-8">
        <div className="pt-5 border-t border-zinc-900 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-xs text-zinc-500 leading-relaxed">
          <p>
            {SOURCES.map((source, index) => (
              <span key={source.label}>
                {index > 0 && <span aria-hidden="true"> · </span>}
                {rich(t(source.gives), [
                  (children) => (
                    <a
                      href={'hrefFr' in source && locale() === 'fr' ? source.hrefFr : source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white underline underline-offset-2 decoration-zinc-700"
                    >
                      {children}
                    </a>
                  ),
                ])}
              </span>
            ))}
            <span aria-hidden="true"> · </span>
            {t('Photos from Wikimedia Commons')}
          </p>
          <p>
            {t('Estimates in CAD, for {region}', { region: regionLabel })} · ©{' '}
            {new Date().getFullYear()} CarInfo
            <span aria-hidden="true"> · </span>
            <Link
              to="/privacy"
              className="text-zinc-400 hover:text-white underline underline-offset-2 decoration-zinc-700"
            >
              {t('Privacy')}
            </Link>
            <span aria-hidden="true"> · </span>
            <Link
              to="/terms"
              className="text-zinc-400 hover:text-white underline underline-offset-2 decoration-zinc-700"
            >
              {t('Terms')}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
