import type { BodyStyle } from '../types/car.types';
import sedanImg from '../assets/body-types/sedan.png';
import suvImg from '../assets/body-types/suv.png';
import truckImg from '../assets/body-types/truck.png';
import coupeImg from '../assets/body-types/coupe.png';
import hatchbackImg from '../assets/body-types/hatchback.png';
import wagonImg from '../assets/body-types/wagon.png';
import minivanImg from '../assets/body-types/minivan.png';
import vanImg from '../assets/body-types/van.png';

/** Cropped silhouettes for each browse body type. */
export const BODY_TYPE_IMAGES: Partial<Record<BodyStyle, string>> = {
  sedan: sedanImg,
  suv: suvImg,
  truck: truckImg,
  coupe: coupeImg,
  hatchback: hatchbackImg,
  wagon: wagonImg,
  minivan: minivanImg,
  van: vanImg,
};

export function getBodyTypeImage(bodyStyle: BodyStyle | string): string | undefined {
  return BODY_TYPE_IMAGES[bodyStyle as BodyStyle];
}

/** Brand accent colors for local placeholders (hex, no #). */
const MAKE_ACCENT: Record<string, string> = {
  Toyota: '2c5aa0',
  Honda: 'cc0000',
  Ford: '003478',
  Chevrolet: 'f2a900',
  BMW: '1c69d4',
  'Mercedes-Benz': '00adef',
  Porsche: 'd5001c',
  Audi: 'bb0a30',
  Tesla: 'e82127',
  Nissan: 'c3002f',
  Mazda: 'c8102e',
  Volkswagen: '001e50',
  Subaru: '0057a3',
  Ferrari: 'dc0000',
  Lamborghini: 'ffc900',
  Lexus: '525252',
  Acura: '3e444c',
  Genesis: '525252',
  Hyundai: '002c5f',
  Kia: '05141f',
  GMC: '6b7280',
  Rivian: '4ade80',
};

export function getMakeAccentColor(make: string): string {
  return MAKE_ACCENT[make] ?? '52525b';
}

/** SVG silhouette path per body style (viewBox 0 0 400 120, centered). */
export function getBodySilhouettePath(bodyStyle: BodyStyle | string): string {
  switch (bodyStyle) {
    case 'suv':
      return 'M40 85 L55 55 L95 45 L305 45 L345 55 L360 85 L360 95 L40 95 Z M70 95 L75 75 L325 75 L330 95 M110 75 A18 18 0 1 1 110 74 M290 75 A18 18 0 1 1 290 74';
    case 'truck':
      return 'M40 90 L55 50 L130 50 L130 70 L280 70 L280 50 L355 50 L370 90 L370 98 L40 98 Z M75 98 L80 72 L115 72 L115 98 M285 98 L290 72 L325 72 L325 98 M130 70 L280 70 L280 98 L130 98';
    case 'coupe':
    case 'convertible':
      return 'M45 88 L70 52 L120 42 L280 42 L330 52 L355 88 L355 96 L45 96 Z M85 96 L92 68 L308 68 L315 96 M115 68 A16 16 0 1 1 115 67 M285 68 A16 16 0 1 1 285 67';
    case 'hatchback':
      return 'M45 88 L65 50 L110 42 L290 42 L335 50 L355 88 L355 96 L45 96 Z M90 96 L98 70 L302 70 L310 96 M120 70 A15 15 0 1 1 120 69 M280 70 A15 15 0 1 1 280 69';
    case 'wagon':
      return 'M40 88 L58 48 L105 40 L295 40 L342 48 L360 88 L360 96 L40 96 Z M82 96 L90 68 L310 68 L318 96 M118 68 A15 15 0 1 1 118 67 M282 68 A15 15 0 1 1 282 67';
    case 'minivan':
    case 'van':
      return 'M35 88 L45 45 L355 45 L365 88 L365 96 L35 96 Z M75 96 L82 72 L318 72 L325 96 M105 72 A14 14 0 1 1 105 71 M295 72 A14 14 0 1 1 295 71';
    default:
      return 'M45 88 L68 50 L115 42 L285 42 L332 50 L355 88 L355 96 L45 96 Z M88 96 L95 70 L305 70 L312 96 M118 70 A15 15 0 1 1 118 69 M282 70 A15 15 0 1 1 282 69';
  }
}
