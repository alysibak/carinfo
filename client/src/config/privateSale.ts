import type { RegionId } from '@carinfo/config/regional-assumptions';
import { msg } from '../i18n';

/**
 * Where each province's buyer checks a used car for a lien (money still
 * owed on it, which can follow the car to its new owner), from each
 * government's own pages, or the registry it names. Checked November 2026;
 * fees and steps are on the linked page.
 */
export interface LienCheck {
  /** What to do, in a sentence. */
  text: string;
  /** The official page that says how. */
  url: string;
  /** Who runs the page. */
  source: string;
}

const ATLANTIC_LIEN_CHECK =
  'https://www.novascotia.ca/lien-check-find-security-interest-lien-personal-property';

export const LIEN_CHECKS: Record<RegionId, LienCheck> = {
  ontario: {
    text: msg(
      'The seller must give you a Used Vehicle Information Package: it lists the registered owners and any lien on the car.',
    ),
    url: 'https://www.ontario.ca/page/used-vehicle-information-package',
    source: 'ontario.ca',
  },
  quebec: {
    text: msg(
      'Search the Register of Personal and Movable Real Rights (RDPRM) by VIN, for a fee: it shows whether the car secures a loan.',
    ),
    url: 'https://www.opc.gouv.qc.ca/en/consumer/good-service/vehicle/car-purchase/advice/used-private-vendor',
    source: 'Office de la protection du consommateur',
  },
  'british-columbia': {
    text: msg('Search the Personal Property Registry by VIN for a lien, for a fee.'),
    url: 'https://www2.gov.bc.ca/gov/content/employment-business/business/managing-a-business/bc-registry-services-personal-property-registry',
    source: 'gov.bc.ca',
  },
  alberta: {
    text: msg(
      'Any registry agent can search for liens by VIN; a vehicle information report also shows how many liens are registered in Alberta.',
    ),
    url: 'https://www.alberta.ca/buying-vehicle-private-seller',
    source: 'alberta.ca',
  },
  saskatchewan: {
    text: msg('Search the Personal Property Registry by VIN for a lien.'),
    url: 'https://www.isc.ca/SPPR/Pages/SearchLiens.aspx',
    source: 'Information Services Corporation',
  },
  manitoba: {
    text: msg('Search the Personal Property Registry, run by Teranet Manitoba, by VIN for a lien.'),
    url: 'https://teranetmb.zendesk.com/hc/en-ca/articles/4791231831323-How-do-I-search-to-see-if-there-is-a-lien-on-a-vehicle',
    source: 'Teranet Manitoba',
  },
  'nova-scotia': {
    text: msg('Lien Check searches the Personal Property Registry by VIN.'),
    url: ATLANTIC_LIEN_CHECK,
    source: 'novascotia.ca',
  },
  'new-brunswick': {
    text: msg(
      'Lien Check, the Atlantic provinces’ search, finds a lien by VIN: choose New Brunswick as the province.',
    ),
    url: ATLANTIC_LIEN_CHECK,
    source: 'novascotia.ca',
  },
  'prince-edward-island': {
    text: msg(
      'Lien Check, the Atlantic provinces’ search, finds a lien by VIN: choose Prince Edward Island as the province.',
    ),
    url: ATLANTIC_LIEN_CHECK,
    source: 'novascotia.ca',
  },
  'newfoundland-and-labrador': {
    text: msg('Lien Check searches the Personal Property Registry by VIN.'),
    url: 'https://www.gov.nl.ca/dgsnl/registries/personal-property/',
    source: 'gov.nl.ca',
  },
};

/** Why a lien matters, from the Financial Consumer Agency of Canada. */
export const LIEN_RISKS_URL =
  'https://www.canada.ca/en/financial-consumer-agency/services/loans/financing-car/risks-car-liens.html';

/** Checks any private sale needs, wherever it is. */
export const PRIVATE_SALE_CHECKS = [
  msg(
    'The VIN on the dashboard, on the driver’s door label and on the ownership papers all match.',
  ),
  msg('The name on the ownership matches the seller’s photo ID.'),
  msg('A mechanic you choose has inspected it.'),
  msg('A bill of sale with both names, the VIN, the price and the date, signed by you both.'),
  msg('Payment by bank draft or transfer at the bank, not cash.'),
];
