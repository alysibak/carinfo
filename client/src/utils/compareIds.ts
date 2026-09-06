export const MAX_COMPARE = 5;

/** Parse a comma-separated compare/share list. Dedupes and caps at max. */
export function parseCompareIds(raw: string | null | undefined, max = MAX_COMPARE): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= max) break;
  }
  return ids;
}

export function formatCompareIds(ids: string[], max = MAX_COMPARE): string {
  return parseCompareIds(ids.join(','), max).join(',');
}
