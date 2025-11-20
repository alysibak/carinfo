/**
 * Utility functions for generating car images
 * Using free image services
 */

/**
 * Generate a car image URL using placeholder service
 * Falls back to a color-coded placeholder if no image is available
 */
export function getCarImageUrl(make: string, model: string, year: number): string {
  // Use a free placeholder service with car-related colors
  const makeColors: Record<string, string> = {
    'Toyota': '2c5aa0',
    'Honda': 'cc0000',
    'Ford': '003478',
    'Chevrolet': 'f2a900',
    'BMW': '1c69d4',
    'Mercedes-Benz': '00adef',
    'Porsche': 'd5001c',
    'Audi': 'bb0a30',
    'Tesla': 'e82127',
    'Nissan': 'c3002f',
    'Mazda': 'c8102e',
    'Volkswagen': '001e50',
    'Subaru': '0057a3',
    'Ferrari': 'dc0000',
    'Lamborghini': 'ffc900',
    'Lexus': '000000',
    'Acura': '3e444c',
    'Genesis': '000000',
    'Hyundai': '002c5f',
    'Kia': '05141f',
  };

  const color = makeColors[make] || '1e293b';

  // Use placeholder.com with custom text including year for uniqueness
  return `https://via.placeholder.com/400x300/${color}/ffffff?text=${encodeURIComponent(
    `${year} ${make} ${model}`
  )}`;
}

/**
 * Get a default fallback image
 */
export function getDefaultCarImage(): string {
  return 'https://via.placeholder.com/400x300/1e293b/94a3b8?text=Car+Image';
}

/**
 * Generate multiple car images for a car
 */
export function getCarImages(make: string, model: string, year: number, count: number = 3): string[] {
  const images: string[] = [];
  for (let i = 0; i < count; i++) {
    images.push(getCarImageUrl(make, model, year));
  }
  return images;
}
