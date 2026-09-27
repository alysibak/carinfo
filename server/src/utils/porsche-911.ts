/**
 * A 911 by any of EPA's names for it. EPA files the 2003-2009 cars as
 * "Carrera 2 Coupe", "Carrera 4 S Cabriolet", "Targa", "Turbo" and "Turbo GT2",
 * without "911", so they missed the 911's anchor and resale and were valued at
 * $10,000-15,000, a third of what they sell for. The Carrera GT is not one.
 */
export function isPorsche911(car: { make: string; model: string }): boolean {
  if (car.make.toLowerCase() !== 'porsche') return false;
  return /\b911\b/.test(car.model) || /^(?:carrera [24]\b|targa\b|turbo\b)/i.test(car.model);
}
