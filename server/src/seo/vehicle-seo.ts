import type { Car } from '../types/car.types.js';
import { displayListingSubtitle } from '../utils/trim-label.js';
import { escapeHtml } from './html.js';
import { absoluteUrl } from './site.js';

export interface PageSeo {
  title: string;
  description: string;
  /** Path only; made absolute when SITE_URL is known. */
  canonicalPath: string;
  ogType: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
  /** Server-rendered, crawlable body shown until the SPA mounts. */
  bodyHtml?: string;
  noindex?: boolean;
}

const FUEL_LABEL: Record<string, string> = {
  gasoline: 'Gasoline',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  'plug-in hybrid': 'Plug-in hybrid',
  electric: 'Electric',
  hydrogen: 'Hydrogen fuel cell',
  'natural gas': 'Natural gas (CNG)',
};

/** schema.org wants a URL or free text; these are the closest standard terms. */
const SCHEMA_FUEL: Record<string, string> = {
  gasoline: 'Gasoline',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  'plug-in hybrid': 'Plug-in hybrid electric',
  electric: 'Electricity',
  hydrogen: 'Hydrogen',
  'natural gas': 'Compressed natural gas',
};

const DRIVE_SCHEMA: Record<string, string> = {
  FWD: 'https://schema.org/FrontWheelDriveConfiguration',
  RWD: 'https://schema.org/RearWheelDriveConfiguration',
  AWD: 'https://schema.org/AllWheelDriveConfiguration',
  '4WD': 'https://schema.org/FourWheelDriveConfiguration',
};

function isElectrified(car: Car): boolean {
  return car.engine.fuelType === 'electric' || car.engine.fuelType === 'hydrogen';
}

export function vehicleName(car: Car): string {
  return `${car.year} ${car.make} ${car.model}`;
}

function efficiencyPhrase(car: Car): string | null {
  const combined = car.fuelEconomy?.combined;
  if (!combined) return null;
  return `${Math.round(combined)} ${isElectrified(car) ? 'MPGe' : 'MPG'} combined`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * "5.0L V8", "2.0L 4-cylinder turbo": configurations of one model and year
 * often differ only here, and each has its own page.
 */
function engineSummary(car: Car): string | null {
  const { displacement, configuration, cylinders, aspiration } = car.engine;
  if (!displacement) return null;
  const layout = configuration ?? (cylinders ? `${cylinders}-cylinder` : null);
  const induction =
    aspiration === 'turbocharged'
      ? 'turbo'
      : aspiration === 'supercharged'
        ? 'supercharged'
        : aspiration
          ? 'turbo + supercharged'
          : null;
  return [`${displacement}L`, layout, induction].filter(Boolean).join(' ');
}

/**
 * Title and description mirror what CarDetail's usePageMeta sets once the SPA
 * loads, so a crawler and a user see the same page identity.
 */
export function vehicleSeo(car: Car): PageSeo {
  const name = vehicleName(car);
  const fuel = FUEL_LABEL[car.engine.fuelType] ?? car.engine.fuelType;
  const efficiency = efficiencyPhrase(car);

  const facts = [
    engineSummary(car),
    efficiency,
    `${fuel.toLowerCase()} ${car.bodyStyle}`,
    car.driveType,
  ]
    .filter(Boolean)
    .join(', ');

  const description =
    `${name}: ${facts}. EPA-verified specs, NHTSA safety when on file, and clearly ` +
    `labeled Canadian ownership-cost estimates.`;

  const path = `/car/${encodeURIComponent(car.id)}`;
  const url = absoluteUrl(path);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name,
    brand: { '@type': 'Brand', name: car.make },
    manufacturer: { '@type': 'Organization', name: car.make },
    model: car.model,
    vehicleModelDate: String(car.year),
    bodyType: car.bodyStyle,
    fuelType: SCHEMA_FUEL[car.engine.fuelType] ?? car.engine.fuelType,
    ...(car.transmission?.type ? { vehicleTransmission: car.transmission.type } : {}),
    ...(DRIVE_SCHEMA[car.driveType]
      ? { driveWheelConfiguration: DRIVE_SCHEMA[car.driveType] }
      : {}),
    ...(car.fuelEconomy?.combined
      ? {
          fuelEfficiency: {
            '@type': 'QuantitativeValue',
            value: Math.round(car.fuelEconomy.combined),
            unitText: isElectrified(car) ? 'MPGe' : 'mpg',
          },
        }
      : {}),
    ...(car.engine.displacement || car.engine.horsepower
      ? {
          vehicleEngine: {
            '@type': 'EngineSpecification',
            fuelType: SCHEMA_FUEL[car.engine.fuelType] ?? car.engine.fuelType,
            ...(car.engine.aspiration ? { engineType: capitalize(car.engine.aspiration) } : {}),
            ...(car.engine.displacement
              ? {
                  engineDisplacement: {
                    '@type': 'QuantitativeValue',
                    value: car.engine.displacement,
                    unitCode: 'LTR',
                  },
                }
              : {}),
            ...(car.engine.horsepower
              ? {
                  enginePower: {
                    '@type': 'QuantitativeValue',
                    value: car.engine.horsepower,
                    unitCode: 'BHP',
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(url ? { url } : {}),
    // Deliberately no `offers`. Our prices are model estimates, and schema.org
    // Offer asserts a real price at which the vehicle is for sale — marking an
    // estimate up that way would misrepresent it to search engines.
  };

  return {
    title: name,
    description,
    canonicalPath: path,
    ogType: 'article',
    jsonLd,
    bodyHtml: vehicleSummaryHtml(car, efficiency, fuel),
  };
}

/**
 * A plain, readable summary of the record. Crawlers index it, visitors without
 * JavaScript get something useful, and React replaces it the moment the app
 * mounts (createRoot discards existing children).
 */
function vehicleSummaryHtml(car: Car, efficiency: string | null, fuel: string): string {
  const rows: Array<[string, string]> = [
    ['Body style', car.bodyStyle],
    ['Drive', car.driveType],
    ['Fuel', fuel],
  ];
  if (efficiency) rows.push(['Fuel economy (EPA)', efficiency]);
  if (car.fuelEconomy?.city && car.fuelEconomy?.highway) {
    rows.push([
      'City / highway',
      `${Math.round(car.fuelEconomy.city)} / ${Math.round(car.fuelEconomy.highway)}`,
    ]);
  }
  if (car.engine.displacement) rows.push(['Displacement', `${car.engine.displacement} L`]);
  if (car.engine.cylinders) rows.push(['Cylinders', String(car.engine.cylinders)]);
  if (car.engine.aspiration) rows.push(['Induction', capitalize(car.engine.aspiration)]);
  if (car.engine.horsepower) rows.push(['Horsepower', `${car.engine.horsepower} hp`]);
  if (car.transmission?.type) {
    rows.push([
      'Transmission',
      car.transmission.speeds
        ? `${car.transmission.speeds}-speed ${car.transmission.type}`
        : car.transmission.type,
    ]);
  }
  if (car.safetyRating?.overall) rows.push(['NHTSA overall', `${car.safetyRating.overall} / 5`]);

  const list = rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('');
  const configuration = displayListingSubtitle(car);

  return (
    `<main class="seo-prerender">` +
    `<h1>${escapeHtml(vehicleName(car))}</h1>` +
    // The human label the client also shows ("6-Speed Manual"), never the raw
    // EPA trim slug.
    `<p>${escapeHtml(configuration ? `${configuration}. ` : '')}Specifications from the U.S. EPA fuel-economy dataset.</p>` +
    `<dl>${list}</dl>` +
    `<p><a href="/">CarInfo</a> · <a href="/methodology">How this data is sourced</a></p>` +
    `</main>`
  );
}
