export type DrivetrainPolicy = "identity" | "section";

export interface VehicleIdentity {
  make: string;
  model: string;
  year: number;
  drivetrain: string;
}

export interface ModelYearSlug {
  makeSlug: string;
  modelSlug: string;
  year: number;
  drivetrain: string;
  droppedTrim: string;
  path: string;
}

export interface ModelYearGroup<T extends VehicleIdentity> {
  slug: ModelYearSlug;
  rows: readonly T[];
  rowsByDrivetrain: ReadonlyMap<string, readonly T[]>;
}

export type CollisionCause = "drivetrain" | "specToken" | "trim" | "unexplained";

export interface SlugCollision {
  path: string;
  cause: CollisionCause;
  distinctRawModels: readonly string[];
}

export type SlugWarning =
  | "drivetrainTokenNotTrailing"
  | "unclassifiedParenthetical"
  | "emptyBase";

export interface SlugQualityWarning {
  warning: SlugWarning;
  rawModel: string;
  path: string;
  detail: string;
}

export interface ModelSlugVariant {
  makeSlug: string;
  normalizedForm: string;
  variants: readonly string[];
}

export type ParentheticalDisposition = "strip" | "keep" | "unclassified";

export interface ParentheticalReport {
  inner: string;
  disposition: ParentheticalDisposition;
  rule: string;
  rowCount: number;
}

const PARENTHETICAL = /\(([^)]*)\)/g;

const DRIVETRAIN_TOKEN_ALTERNATION = "awd|4wd|2wd|fwd|rwd|4x4|4x2";
const TRIM_SUFFIX = new RegExp(
  `^(.*?\\b(?:${DRIVETRAIN_TOKEN_ALTERNATION})\\b)\\s+-\\s+(.+)$`,
  "i"
);

const MODEL_EMBEDDED_DRIVETRAINS: ReadonlyMap<string, string> = new Map([
  ["awd", "awd"],
  ["4wd", "4wd"],
  ["4x4", "4wd"],
  ["2wd", "2wd"],
  ["4x2", "2wd"],
  ["fwd", "fwd"],
  ["rwd", "rwd"],
]);

const EXPLICIT_DRIVETRAINS: ReadonlyMap<string, string> = new Map([
  ["awd", "awd"],
  ["all-wheel-drive", "awd"],
  ["4wd", "4wd"],
  ["4-wheel-drive", "4wd"],
  ["four-wheel-drive", "4wd"],
  ["part-time-4-wheel-drive", "4wd"],
  ["4-wheel-or-all-wheel-drive", "4wd"],
  ["fwd", "fwd"],
  ["front-wheel-drive", "fwd"],
  ["rwd", "rwd"],
  ["rear-wheel-drive", "rwd"],
  ["2wd", "2wd"],
  ["2-wheel-drive", "2wd"],
]);

const STRIP_PARENTHETICALS: ReadonlySet<string> = new Set([
  // Fuel system. Stripped for the same reason as FFV: the row survives in the
  // group and fuel type is rendered per row, so a dual-fuel variant is a
  // section on the model-year page, not a near-duplicate page of its own.
  "ffv", "ffv-capable", "flexible-fuel", "flex-fuel",
  "cng", "dedicated-cng", "lpg", "bi-fuel", "bi-fuel-cng", "bifuel",

  // Trim-level range variants. Trims are sections, so these collapse.
  "long-range", "standard-range",

  // Transmission mode counts — the same EPA family as the 2MODE/3MODE trim
  // codes. Closed set of eight, so listed rather than pattern-matched.
  "with-sport-mode", "sport-mode", "sport-off-road",
  "1-mode-tm", "2-mode", "3-mode", "3-mode-tm", "4-mode", "5-mode",

  // Tyre, wheel and chassis codes.
  "2r", "3r", "r22", "x200", "285-35", "falken-tire", "pirelli-tire", "m-s",

  // Engine spec.
  "sohc", "turbo",

  // Editorial annotations about the row, not attributes of the vehicle.
  "puerto-rico-only", "incl-outback", "2006-new-model", "sporty",
  "over-6000-lbs-curb-weight",
]);

const KEEP_PARENTHETICALS: ReadonlySet<string> = new Set([
  // Body style and configuration — these change what the vehicle is.
  "cargo", "passenger", "wagon", "suv", "special-off-road-model",
  "cabriolet", "convertible", "coupe", "station-wagon", "sw", "lwb",
  "2-door", "2-doors", "3-door", "3-doors", "4-door", "4-doors",
  "5-door", "5-doors",
]);

/**
 * Words that may legitimately follow a drivetrain token in a model name. The
 * warning exists to surface unreviewed shapes, so a reviewed trim vocabulary
 * belongs here. Adding a word only silences a warning — it never changes a slug.
 */
const BENIGN_DRIVETRAIN_TAILS: ReadonlySet<string> = new Set([
  // body and configuration
  "cargo", "passenger", "conversion", "van", "wagon", "suv", "pickup",
  "convertible", "coupe", "sedan", "hatchback", "roadster", "hardtop",
  "cab", "double", "extended", "ext", "2", "4",
  // powertrain
  "cng", "phev", "hev", "diesel", "hybrid", "bev", "e", "recharge", "range",
  "lfp", "er1", "er2", "gen2", "awd", "4x", "pro4x",
  // trim and package names
  "a", "spec", "sport", "luxury", "premium", "active", "at4", "at4x",
  "denali", "dynamic", "edition", "elite", "gt", "le", "limited", "line",
  "ltd", "off", "offroad", "per", "perf", "performance", "plat", "platinum",
  "plus", "pro", "r", "road", "rock", "creek", "route", "s", "se", "sl",
  "sr", "ss", "sv", "touring", "trailboss", "trailsport", "trd", "type",
  "woodland", "xl", "xle", "xlt", "xrt", "xse", "black", "blue", "california",
  "drive", "f", "i", "ii", "1", "and",
  "advanced", "v", "series", "zr2", "30t",
]);

const MODEL_SLUG_OVERRIDES: ReadonlyMap<string, string> = new Map([
  // Marketed names that contain a drivetrain token. Without these the token is
  // read as drivetrain and stripped, tearing the name in half.
  ["g550-4x4", "g550-4x4"],
  ["g550-4x4-special-off-road-model", "g550-4x4"],
  ["amg-g-63-4x4-squared", "amg-g63-4x4-squared"],
  ["amg-g63-4x4-squared", "amg-g63-4x4-squared"],

  // One vehicle spelled two ways across years. Canonical form is the
  // manufacturer's own naming, which is not always the fewest-hyphen form
  // proposeVariantOverrides suggests.
  ["300-srt-8", "300-srt8"],
  ["500-x", "500x"],
  ["500-x-awd", "500x"],
  ["maybach-s-600", "maybach-s600"],
  ["rs-3", "rs3"],
  ["stage-3-f150-super-cab-2wd", "stage-3-f-150-supercab"],
  ["stage-3-f150-super-cab-4wd", "stage-3-f-150-supercab"],
  ["stage-3-f150-super-crew-2wd", "stage-3-f-150-supercrew"],
  ["stage-3-f150-super-crew-4wd", "stage-3-f-150-supercrew"],
  ["titan-4wd-pro4x", "titan-pro-4x"],
  ["vitara-2door", "vitara-2-door"],
  ["vitara-2door-2wd", "vitara-2-door"],
  ["vitara-2door-4wd", "vitara-2-door"],
  ["vitara-4door", "vitara-4-door"],
  ["vitara-4door-2wd", "vitara-4-door"],
  ["vitara-4door-4wd", "vitara-4-door"],
  ["x3-sdrive-28i", "x3-sdrive28i"],
  ["x5-xdrive-35d", "x5-xdrive35d"],

  // Source name has a dangling conjunction: "Brooklands and (LWB)".
  ["brooklands-and-lwb", "brooklands-lwb"],

  // EPA test annotations embedded in the model field: payload packages,
  // transmission codes, drive modes, tyre markers. Enumerated rather than
  // pattern-matched because the tokens (LT, MT, M6, 4M, 2.5T) collide with
  // real trim and engine designations on other makes.
  ["f150-2wd-base-payload-lt-tire", "f150"],
  ["f150-2wd-ffv-base-payload-lt", "f150"],
  ["f150-2wd-ffv-base-payload-lt-tire", "f150"],
  ["f150-4wd-base-payload-lt-tire", "f150"],
  ["f150-4wd-ffv-base-payload-lt", "f150"],
  ["f150-4wd-ffv-base-payload-lt-tire", "f150"],
  ["kona-awd-sx2-1-6t-8at-awd", "kona"],
  ["kona-fwd-sx2-1-6t-8at-fwd", "kona"],
  ["santa-cruz-awd-nx4-ob-2-5-awd-8at", "santa-cruz"],
  ["santa-cruz-awd-nx4-ob-2-5t-awd-8at", "santa-cruz"],
  ["sierra-2wd-with-sport-mode", "sierra"],
  ["sierra-4wd-with-sport-mode", "sierra"],
  ["silverado-with-sport-mode-4wd-m6", "silverado"],
  ["silverado-4wd-4m", "silverado"],
  ["silverado-mud-terrain-tires-4wd-4m", "silverado"],
  ["tacoma-4wd-mt", "tacoma"],
  ["tacoma-4wd-d-cab-mt-trd-orp-pro", "tacoma-double-cab-trd-pro"],
  ["charger-2-dr-daytona-scat-pack-track-pack-awd-a-s", "charger-2-dr-daytona-scat-pack-track-pack"],
  ["model-3-long-range-rwd-i-19in-wheels", "model-3-long-range"],
]);

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mentionsBatteryOrPower(inner: string): boolean {
  return /\b\d+(?:\.\d+)?\s*(?:kwh|kw-hr|kw|hp|ah|amp-?\s*hours?)\b/i.test(inner);
}

function mentionsWheelDiameter(inner: string): boolean {
  return /\b\d+(?:\.\d+)?[\s-]*(?:in|inch|inches)\b/i.test(inner);
}

function mentionsChargerRate(inner: string): boolean {
  return /\bcharger\b/i.test(inner) && /\d/.test(inner);
}

export function classifyParenthetical(inner: string): {
  disposition: ParentheticalDisposition;
  rule: string;
} {
  const key = slugify(inner);
  if (KEEP_PARENTHETICALS.has(key)) return { disposition: "keep", rule: "keepList" };
  if (STRIP_PARENTHETICALS.has(key)) return { disposition: "strip", rule: "stripList" };
  if (mentionsBatteryOrPower(inner)) return { disposition: "strip", rule: "batteryOrPower" };
  if (mentionsWheelDiameter(inner)) return { disposition: "strip", rule: "wheelDiameter" };
  if (mentionsChargerRate(inner)) return { disposition: "strip", rule: "chargerRate" };
  return { disposition: "unclassified", rule: "none" };
}

const BARE_SPEC_PATTERNS: readonly RegExp[] = Object.freeze([
  // Wheel and tyre diameter. The leading preposition has to be consumed with
  // the measurement, or "… AWD with 19 inch wheels" leaves a dangling "with"
  // on the slug. Zero-width \s* also covers the source typo "with19 inch".
  /\b(?:with|w\/?)\s*\d+(?:\.\d+)?[\s-]*(?:in|inch|inches)\b(?:\s*(?:wheels?|tires?))?/gi,
  /\b\d+(?:\.\d+)?[\s-]*(?:in|inch|inches)\s*(?:wheels?|tires?)\b/gi,
  /\b(?:wheels?|tires?)\s*\d+(?:\.\d+)?[\s-]*(?:in|inch|inches)\b/gi,
  /\b\d+(?:\.\d+)?[\s-]*(?:in|inch|inches)\b/gi,

  // Tyre size codes: 245/55ZR18, 235/60R18, 305/35ZR20 — with an optional
  // axle position and all-season marker trailing them.
  /\b\d{3}\/\d{2}\s*[a-z]{0,2}\s*r?\d{2}\b(?:\s*(?:front|rear))?(?:\s*a\/s)?/gi,
  // Tyre brands. Continental is deliberately absent — it is a model name
  // (Lincoln, Bentley, Rolls-Royce) and stripping it empties the slug.
  /\b(?:goodyear|nexen|falken|pirelli|michelin|bridgestone)\b/gi,

  // Weight ratings and payload packages — EPA test annotations, not names.
  /\bgvwr\s*[<>=]*\s*\d+\s*lbs?\b/gi,
  /\bpayload(?:\s+package)?\b/gi,
  /\blt\s+tire\b/gi,

  // Battery, charging and drive-mode counts stated without parentheses.
  // "charger" only when a power figure is attached to it — Dodge Charger is a
  // model name and must never be treated as a spec token.
  /\b\d+(?:\.\d+)?\s*kw\s*chargers?\b/gi,
  /\b\d+(?:\.\d+)?\s*(?:kwh|kw-hr|kw|hp|ah|amp-?\s*hours?)\b/gi,
  /\b\d+\s*modes?\b/gi,
  /\bw\/?\s*stop\s*-?\s*start\b/gi,

  /\bffv\b/gi,
  /\bflexible\s+fuel\b/gi,
]);

export function stripSpecTokens(model: string): string {
  const withoutParentheticals = model.replace(PARENTHETICAL, (whole, inner: string) =>
    classifyParenthetical(inner).disposition === "strip" ? " " : whole
  );
  return BARE_SPEC_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, " "),
    withoutParentheticals
  );
}

export function canonicalDrivetrain(value: string): string {
  const key = slugify(value);
  if (key === "") return "";
  return EXPLICIT_DRIVETRAINS.get(key) ?? key;
}

export function isMappedDrivetrain(value: string): boolean {
  const key = slugify(value);
  return key === "" || EXPLICIT_DRIVETRAINS.has(key);
}

export function splitTrimSuffix(model: string): { head: string; trim: string } {
  const match = model.match(TRIM_SUFFIX);
  if (match === null) return { head: model, trim: "" };
  return { head: match[1], trim: match[2] };
}

export interface SplitModel {
  base: string;
  embeddedDrivetrain: string;
  droppedTrim: string;
  warning: SlugWarning | "";
  warningDetail: string;
}

export function splitModel(rawModel: string): SplitModel {
  const override = MODEL_SLUG_OVERRIDES.get(slugify(rawModel));
  if (override !== undefined) {
    return {
      base: override,
      embeddedDrivetrain: "",
      droppedTrim: "",
      warning: "",
      warningDetail: "",
    };
  }

  const unclassified = [...rawModel.matchAll(PARENTHETICAL)]
    .map((match) => match[1])
    .filter((inner) => classifyParenthetical(inner).disposition === "unclassified");

  const withoutSpecs = stripSpecTokens(rawModel);
  const { head, trim } = splitTrimSuffix(withoutSpecs);
  const tokens = slugify(head).split("-").filter(Boolean);

  const kept: string[] = [];
  let embeddedDrivetrain = "";
  let warning: SlugWarning | "" = "";
  let warningDetail = "";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const mapped = MODEL_EMBEDDED_DRIVETRAINS.get(token);
    if (mapped === undefined) {
      kept.push(token);
      continue;
    }
    if (embeddedDrivetrain === "") embeddedDrivetrain = mapped;
    const tail = tokens.slice(index + 1);
    const tailIsBenign = tail.every((word) => BENIGN_DRIVETRAIN_TAILS.has(word));
    if (tail.length > 0 && !tailIsBenign) {
      warning = "drivetrainTokenNotTrailing";
      warningDetail = `${token} followed by ${tail.join(" ")}`;
    }
  }

  const base = kept.join("-");
  if (warning === "" && unclassified.length > 0) {
    warning = "unclassifiedParenthetical";
    warningDetail = unclassified.join(" | ");
  }
  if (base === "") {
    warning = "emptyBase";
    warningDetail = rawModel;
  }

  return { base, embeddedDrivetrain, droppedTrim: trim, warning, warningDetail };
}

export function buildModelYearSlug(
  vehicle: VehicleIdentity,
  policy: DrivetrainPolicy
): ModelYearSlug {
  const makeSlug = slugify(vehicle.make);
  const { base, embeddedDrivetrain, droppedTrim } = splitModel(vehicle.model);
  const explicit = canonicalDrivetrain(vehicle.drivetrain);
  const drivetrain = explicit !== "" ? explicit : embeddedDrivetrain;

  const modelSlug =
    policy === "identity" && drivetrain !== "" ? `${base}-${drivetrain}` : base;

  return {
    makeSlug,
    modelSlug,
    year: vehicle.year,
    drivetrain,
    droppedTrim,
    path: `/${makeSlug}/${modelSlug}/${vehicle.year}`,
  };
}

export function groupByModelYear<T extends VehicleIdentity>(
  vehicles: readonly T[],
  policy: DrivetrainPolicy
): Map<string, ModelYearGroup<T>> {
  const groups = new Map<string, ModelYearGroup<T>>();
  const rowsByPath = new Map<string, T[]>();
  const drivetrainsByPath = new Map<string, Map<string, T[]>>();

  for (const vehicle of vehicles) {
    const slug = buildModelYearSlug(vehicle, policy);
    const rows = rowsByPath.get(slug.path) ?? [];
    const byDrivetrain = drivetrainsByPath.get(slug.path) ?? new Map<string, T[]>();
    const forDrivetrain = byDrivetrain.get(slug.drivetrain) ?? [];

    rows.push(vehicle);
    forDrivetrain.push(vehicle);
    byDrivetrain.set(slug.drivetrain, forDrivetrain);
    rowsByPath.set(slug.path, rows);
    drivetrainsByPath.set(slug.path, byDrivetrain);

    groups.set(slug.path, { slug, rows, rowsByDrivetrain: byDrivetrain });
  }

  return groups;
}

function classifyCollision(distinctRawModels: readonly string[]): CollisionCause {
  const withoutSpecs = new Set(
    distinctRawModels.map((model) => slugify(stripSpecTokens(model)))
  );
  if (withoutSpecs.size === 1) return "specToken";

  const withoutTrim = new Set(
    distinctRawModels.map((model) =>
      slugify(splitTrimSuffix(stripSpecTokens(model)).head)
    )
  );
  if (withoutTrim.size === 1) return "trim";

  const withoutDrivetrain = new Set(
    distinctRawModels.map((model) => splitModel(model).base)
  );
  if (withoutDrivetrain.size === 1) return "drivetrain";

  return "unexplained";
}

export function auditSlugCollisions<T extends VehicleIdentity>(
  vehicles: readonly T[],
  policy: DrivetrainPolicy
): SlugCollision[] {
  const rawModelsByPath = new Map<string, Set<string>>();

  for (const vehicle of vehicles) {
    const { path } = buildModelYearSlug(vehicle, policy);
    const models = rawModelsByPath.get(path) ?? new Set<string>();
    models.add(vehicle.model);
    rawModelsByPath.set(path, models);
  }

  const collisions: SlugCollision[] = [];
  for (const [path, models] of rawModelsByPath) {
    if (models.size < 2) continue;
    const distinctRawModels = [...models].sort();
    collisions.push({
      path,
      cause: classifyCollision(distinctRawModels),
      distinctRawModels,
    });
  }

  return collisions.sort((a, b) => a.path.localeCompare(b.path));
}

export function auditSlugQuality<T extends VehicleIdentity>(
  vehicles: readonly T[],
  policy: DrivetrainPolicy
): SlugQualityWarning[] {
  const seen = new Set<string>();
  const warnings: SlugQualityWarning[] = [];

  for (const vehicle of vehicles) {
    const { warning, warningDetail } = splitModel(vehicle.model);
    if (warning === "") continue;
    const key = `${warning}::${vehicle.model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    warnings.push({
      warning,
      rawModel: vehicle.model,
      path: buildModelYearSlug(vehicle, policy).path,
      detail: warningDetail,
    });
  }

  return warnings.sort((a, b) => a.rawModel.localeCompare(b.rawModel));
}

export function auditModelSlugVariants<T extends VehicleIdentity>(
  vehicles: readonly T[],
  policy: DrivetrainPolicy
): ModelSlugVariant[] {
  const variantsByNormalized = new Map<string, Set<string>>();

  for (const vehicle of vehicles) {
    const { makeSlug, modelSlug } = buildModelYearSlug(vehicle, policy);
    const normalizedForm = `${makeSlug}::${modelSlug.replace(/-/g, "")}`;
    const variants = variantsByNormalized.get(normalizedForm) ?? new Set<string>();
    variants.add(modelSlug);
    variantsByNormalized.set(normalizedForm, variants);
  }

  const results: ModelSlugVariant[] = [];
  for (const [normalizedForm, variants] of variantsByNormalized) {
    if (variants.size < 2) continue;
    const [makeSlug, bareForm] = normalizedForm.split("::");
    results.push({ makeSlug, normalizedForm: bareForm, variants: [...variants].sort() });
  }

  return results.sort((a, b) => a.normalizedForm.localeCompare(b.normalizedForm));
}

export function auditParentheticals<T extends VehicleIdentity>(
  vehicles: readonly T[]
): ParentheticalReport[] {
  const counts = new Map<string, number>();

  for (const vehicle of vehicles) {
    for (const match of vehicle.model.matchAll(PARENTHETICAL)) {
      counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([inner, rowCount]) => {
      const { disposition, rule } = classifyParenthetical(inner);
      return { inner, disposition, rule, rowCount };
    })
    .sort((a, b) => b.rowCount - a.rowCount);
}

export function unmappedDrivetrains<T extends VehicleIdentity>(
  vehicles: readonly T[]
): string[] {
  const unmapped = new Set<string>();
  for (const vehicle of vehicles) {
    if (!isMappedDrivetrain(vehicle.drivetrain)) unmapped.add(vehicle.drivetrain);
  }
  return [...unmapped].sort();
}

export function proposeVariantOverrides<T extends VehicleIdentity>(
  vehicles: readonly T[],
  policy: DrivetrainPolicy
): Array<readonly [string, string]> {
  const canonicalByGroup = new Map<string, string>();
  for (const variant of auditModelSlugVariants(vehicles, policy)) {
    const canonical = [...variant.variants].sort(
      (a, b) => a.split("-").length - b.split("-").length || a.localeCompare(b)
    )[0];
    canonicalByGroup.set(`${variant.makeSlug}::${variant.normalizedForm}`, canonical);
  }

  const overrides = new Map<string, string>();
  for (const vehicle of vehicles) {
    const { makeSlug, modelSlug } = buildModelYearSlug(vehicle, policy);
    const canonical = canonicalByGroup.get(`${makeSlug}::${modelSlug.replace(/-/g, "")}`);
    if (canonical === undefined || canonical === modelSlug) continue;
    overrides.set(slugify(vehicle.model), canonical);
  }

  return [...overrides.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
