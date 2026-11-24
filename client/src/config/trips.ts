import type { RegionId } from '@carinfo/config/regional-assumptions';

/** A drive people in a province make, by road, rounded: "about 540 km". */
export interface Trip {
  from: string;
  to: string;
  km: number;
}

/**
 * Two well-known drives per province, for "what does a trip cost in this
 * car": road distances on the usual highway route, rounded to 5 or 10 km,
 * which the page says are approximate.
 */
export const TRIPS: Record<RegionId, [Trip, Trip]> = {
  ontario: [
    { from: 'Toronto', to: 'Ottawa', km: 450 },
    { from: 'Toronto', to: 'Montreal', km: 540 },
  ],
  quebec: [
    { from: 'Montreal', to: 'Quebec City', km: 250 },
    { from: 'Montreal', to: 'Toronto', km: 540 },
  ],
  'british-columbia': [
    { from: 'Vancouver', to: 'Whistler', km: 120 },
    { from: 'Vancouver', to: 'Kelowna', km: 390 },
  ],
  alberta: [
    { from: 'Calgary', to: 'Banff', km: 130 },
    { from: 'Calgary', to: 'Edmonton', km: 300 },
  ],
  manitoba: [
    { from: 'Winnipeg', to: 'Brandon', km: 215 },
    { from: 'Winnipeg', to: 'Regina', km: 570 },
  ],
  saskatchewan: [
    { from: 'Regina', to: 'Saskatoon', km: 240 },
    { from: 'Saskatoon', to: 'Edmonton', km: 525 },
  ],
  'nova-scotia': [
    { from: 'Halifax', to: 'Moncton', km: 260 },
    { from: 'Halifax', to: 'Sydney', km: 400 },
  ],
  'new-brunswick': [
    { from: 'Fredericton', to: 'Saint John', km: 110 },
    { from: 'Moncton', to: 'Fredericton', km: 180 },
  ],
  'prince-edward-island': [
    { from: 'Charlottetown', to: 'Summerside', km: 60 },
    { from: 'Charlottetown', to: 'Moncton', km: 175 },
  ],
  'newfoundland-and-labrador': [
    { from: "St. John's", to: 'Gander', km: 330 },
    { from: "St. John's", to: 'Corner Brook', km: 685 },
  ],
};
