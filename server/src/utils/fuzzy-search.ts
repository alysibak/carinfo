/**
 * Lightweight fuzzy helpers for search / autocomplete typo tolerance.
 */

/** Common make/model aliases shoppers type. */
const ALIASES: Record<string, string> = {
  chevy: 'chevrolet',
  chevrolet: 'chevrolet',
  vw: 'volkswagen',
  volkswagen: 'volkswagen',
  benz: 'mercedes-benz',
  mercedes: 'mercedes-benz',
  'mercedes benz': 'mercedes-benz',
  mb: 'mercedes-benz',
  bmw: 'bmw',
  landrover: 'land rover',
  'land rover': 'land rover',
  caddy: 'cadillac',
  cadilac: 'cadillac',
  toyata: 'toyota',
  toyoto: 'toyota',
  hond: 'honda',
  nisssan: 'nissan',
  nisaan: 'nissan',
  subaruu: 'subaru',
  porche: 'porsche',
  porshe: 'porsche',
  tesala: 'tesla',
  hyndai: 'hyundai',
  hyuandai: 'hyundai',
  volkswagon: 'volkswagen',
  chevorlet: 'chevrolet',
  chevroelt: 'chevrolet',
  infiniti: 'infiniti',
  infinity: 'infiniti',
  acura: 'acura',
  akura: 'acura',
  f150: 'f-150',
  'f 150': 'f-150',
  mazda3: 'mazda 3',
  mazda6: 'mazda 6',
  model3: 'model 3',
  modely: 'model y',
  models: 'model s',
  modelx: 'model x',
  rav: 'rav4',
  crv: 'cr-v',
  hrv: 'hr-v',
  // EPA writes "ID.4": "id4" found nothing.
  id4: 'id.4',
  cx5: 'cx-5',
  cx50: 'cx-50',
  cx3: 'cx-3',
  cx9: 'cx-9',
  cx30: 'cx-30',
  cx70: 'cx-70',
  cx90: 'cx-90',
  // EPA dropped "Miata" from the name after 2005; every year is an MX-5.
  miata: 'mx-5',
};

/**
 * Names shoppers use for a model whose EPA name changed between generations.
 * The half-ton Silverado is "Silverado 1500" to 2006, "C15/K15" to 2018,
 * "C10/K10" in 2019 and plain "Silverado" since, so "silverado 1500" matched
 * only the oldest. It now means the whole family (EPA rates no heavy-duty).
 */
const PHRASE_ALIASES: [RegExp, string][] = [
  [/\b(silverado|sierra) 1500\b/g, '$1'],
  // Model codes typed with a space: "rav 4" ("rav" is already "rav4", so the
  // 4 was read as "4WD" and found only the 2001-12 RAV4 4WD), "id 4", "i 4",
  // "a 220". Lexus writes "IS 350" with the space, so that one stays.
  [/\brav4 4\b/g, 'rav4'],
  [/\bid\.? 4\b/g, 'id.4'],
  [/\bi (\d{1,2}|x)\b/g, 'i$1'],
  [/\ba (\d{3})\b/g, 'a$1'],
  // Lineup names EPA never uses, folded into one token that search resolves
  // to the models: "3 series" → "3-series" (BMW 330i, M340i…), "c class" →
  // "c-class" (Mercedes C300, AMG C43…).
  [/\b([1-8]) series\b/g, '$1-series'],
  // Drive, body and induction said in words: "rear wheel drive" found nothing,
  // "four wheel drive" nothing, "station wagon" only names with those words.
  [/\ball[- ]wheel[- ]drive\b/g, 'awd'],
  [/\b(?:four|4)[- ]wheel[- ]drive\b/g, '4wd'],
  [/\bfront[- ]wheel[- ]drive\b/g, 'fwd'],
  [/\brear[- ]wheel[- ]drive\b/g, 'rwd'],
  [/\b(?:two|2)[- ]wheel[- ]drive\b/g, '2wd'],
  [/\bstation wagons?\b/g, 'wagon'],
  [/\b(?:twin|bi)[- ]?turbo(?:charged)?\b/g, 'twin-turbo'],
  [/\bg[ -]?wagon\b/g, 'g-class'],
  [
    /\b(a|b|c|e|g|m|r|s|cl|cla|cle|clk|cls|gl|gla|glb|glc|gle|glk|gls|sl|slc|slk) class\b/g,
    '$1-class',
  ],
];

/** A BMW series or Mercedes class, and the pattern its EPA model names follow. */
export interface Lineup {
  make: string;
  label: string;
  pattern: RegExp;
}

/** Names that cover models filed under different bases. */
const NAMED_LINEUPS: Record<string, Lineup> = {
  // The SVT Lightning (1993-2004) is "Lightning Pickup", the electric truck
  // (2022 on) "F-150 Lightning": "ford lightning" found only the old one.
  lightning: { make: 'Ford', label: 'Lightning', pattern: /^(?:f-?150 )?lightning\b/i },
  // EPA filed the 2003-09 cars as "Carrera 2 Coupe", "Targa" and "Turbo 4 911":
  // "porsche 911" found none of them.
  '911': {
    make: 'Porsche',
    label: '911',
    pattern: /^(?:new )?911\b|^carrera [24]\b|^targa\b|^turbo\b/i,
  },
};

export function lineupForToken(token: string): Lineup | null {
  if (NAMED_LINEUPS[token]) return NAMED_LINEUPS[token];
  const series = /^([1-8])-series$/.exec(token);
  if (series) {
    const n = series[1];
    return {
      make: 'BMW',
      label: `${n} Series`,
      // 318i … 340i, M340i, the M3 itself, ActiveHybrid 3.
      pattern: new RegExp(`^(?:m?${n}\\d\\d[a-z]*|m${n}|activehybrid ${n})\\b`, 'i'),
    };
  }
  const klass = /^([a-z]{1,3})-class$/.exec(token);
  if (klass) {
    // The M-Class is filed as ML350 and so on.
    const letters = klass[1] === 'm' ? 'ml' : klass[1];
    return {
      make: 'Mercedes-Benz',
      label: `${klass[1].toUpperCase()}-Class`,
      // C300, AMG C43, Maybach S580, "G 550", the B-Class Electric Drive.
      pattern: new RegExp(
        `^(?:(?:amg|maybach) )?${letters} ?\\d{2,3}[a-z]*\\b|^${letters}-class\\b`,
        'i',
      ),
    };
  }
  return null;
}

/** Drive / door / config tokens that are not part of the shopper-facing model name. */
const CONFIG_SUFFIX =
  /^(?:\d+-door|\d+dr|\d+wd|awd|fwd|rwd|4x4|4x2|di|automatic|manual|cvt|auto|s\d+|er\d+|sr|pro|platinum|hybrid|phev|ffv|si|type|trd|xse|xle|le|se|ex|lx|base|payload|lt)$/i;

export function normalizeSearchToken(token: string): string {
  const t = token.toLowerCase().trim();
  return ALIASES[t] ?? t;
}

export function normalizeSearchQuery(query: string): string {
  // Alias first (cx5 → cx-5, mazda3 → mazda 3), then re-tokenize so
  // multi-word expansions and human spacing both work.
  const tokens = query
    .toLowerCase()
    // "town & country"
    .replace(/&/g, ' and ')
    .trim()
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(normalizeSearchToken)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
  return PHRASE_ALIASES.reduce((text, [pattern, to]) => text.replace(pattern, to), tokens);
}

/**
 * Shopper-facing model family, e.g. "3 4-Door 2WD" → "3", "Model 3" → "model 3".
 * Used for matching "mazda 3" to modern EPA model strings and collapsing trims.
 */
export function modelFamilyName(model: string): string {
  const parts = model
    .toLowerCase()
    .trim()
    .split(/[\s_/]+/)
    .filter(Boolean);
  const kept: string[] = [];
  for (const part of parts) {
    if (CONFIG_SUFFIX.test(part)) break;
    kept.push(part);
  }
  return (kept.length ? kept : parts.slice(0, 1)).join(' ');
}

/**
 * A trim typed after the model finds it with words between: "911 gts" is the
 * "911 Carrera GTS" and "911 Targa 4 GTS" as well as the 2011-12 "911 GTS".
 * The phrase's first word must begin the name and the rest follow it in order,
 * each a whole word.
 */
export function modelWordsInOrder(model: string, phrase: string): boolean {
  const want = phrase.toLowerCase().trim().split(/\s+/);
  if (want.length < 2) return false;
  const words = model
    .toLowerCase()
    .split(/[\s_/()]+/)
    .filter(Boolean);
  if (words[0] !== want[0]) return false;
  let next = 1;
  for (const word of words.slice(1)) {
    if (word === want[next]) next += 1;
    if (next === want.length) return true;
  }
  return false;
}

/** True when a typed model phrase refers to this EPA model string. */
export function modelPhraseMatches(model: string, phrase: string): boolean {
  const p = phrase.toLowerCase().trim();
  if (!p) return false;
  const modelLower = model.toLowerCase();
  if (modelLower === p) return true;
  if (modelLower.startsWith(`${p} `)) return true;

  const family = modelFamilyName(model);
  if (family === p) return true;
  if (family.startsWith(`${p} `)) return true;

  // Badge-first names: "AMG G63" (the 2013-15 car is "G63 AMG"), "SRT Viper",
  // "Shelby GT500 Mustang".
  const unbadged = modelLower.replace(/^(amg|srt|shelby) /, '');
  if (unbadged !== modelLower && (unbadged === p || unbadged.startsWith(`${p} `))) return true;

  // Hyphens and spaces differ between EPA generations ("F150 Pickup 2WD" but
  // "F-150 Lightning") and between shoppers ("f 150", "f150", "f-150"). Match
  // when the squashed phrase equals the family's first words squashed: "f150"
  // finds both trucks, while "cx-5" still stops short of "cx-50".
  const squash = (s: string) => s.replace(/[\s-]/g, '');
  const target = squash(p);
  let prefix = '';
  for (const word of family.split(' ')) {
    prefix += squash(word);
    if (prefix === target) return true;
    if (prefix.length >= target.length) return false;
  }
  return false;
}

/** Levenshtein distance with early exit when over maxDist. */
export function editDistance(a: string, b: string, maxDist = 2): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = new Array<number>(lb + 1);
  let curr = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

export function maxEditsForToken(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 5) return 1;
  return 2;
}

/** True if haystack contains token, or a word/substring within edit distance. */
export function fuzzyTokenMatch(haystack: string, token: string): boolean {
  if (!token) return true;
  if (haystack.includes(token)) return true;

  const maxDist = maxEditsForToken(token);
  if (maxDist === 0) return false;

  const words = haystack.split(/[\s\-_/]+/).filter(Boolean);
  for (const word of words) {
    if (editDistance(word, token, maxDist) <= maxDist) return true;
    if (word.length > token.length + maxDist) {
      // Prefix / infix window for longer compound model names
      for (let i = 0; i <= word.length - token.length; i++) {
        const slice = word.slice(i, i + token.length);
        if (editDistance(slice, token, maxDist) <= maxDist) return true;
      }
    }
  }
  return false;
}

/** Best (lowest) edit distance from query to a candidate label. */
export function bestFuzzyScore(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (c === q) return 0;
  if (c.startsWith(q) || c.includes(q)) return 0.5;
  return editDistance(q, c, 3);
}
