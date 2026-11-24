/** A make's page: "Mercedes-Benz" → "/makes/mercedes-benz", as its model pages' paths spell it. */
export function makePath(make: string): string {
  return `/makes/${make
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}
