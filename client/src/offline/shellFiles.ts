/**
 * The files the service worker keeps (client/service-worker.js), in three sets:
 *
 * - shell: stored as it installs. The app's entry with what it imports, its
 *   styles and Latin fonts, which the visit has just loaded anyway. With them
 *   any page opens and says what needs a connection. Images are stored as
 *   they are shown.
 * - vin: stored once the VIN page is opened. The page and everything it can
 *   load, the camera, its worker and the text reader's code among them, so
 *   the page reads a VIN on a lot with no signal. A visitor who never opens
 *   it never fetches them.
 * - garage: stored once someone has saved a car. The garage, the sign-in gate
 *   in front of it, and the car page with what it loads, so saved cars open
 *   with no signal (their data is kept apart, as the app asks).
 *
 * Pure, over the slice of Rollup's output bundle it reads, so it is tested
 * without a build.
 */
export interface BundleFile {
  type: 'chunk' | 'asset';
  fileName: string;
  isEntry?: boolean;
  facadeModuleId?: string | null;
  /** The source modules in a chunk: a page merged with others has no facade, but is listed here. */
  moduleIds?: string[];
  imports?: string[];
  dynamicImports?: string[];
  viteMetadata?: { importedCss?: Set<string> };
}

/** The VIN page, found by its source file. */
const VIN_PAGE = /\/pages\/VinDecoder\.tsx$/;
/** The garage, the gate before it, and the car pages saved cars open. */
const GARAGE_PAGES = [
  /\/pages\/DreamGarage\.tsx$/,
  /\/components\/RequireAccount\.tsx$/,
  /\/pages\/CarDetail\.tsx$/,
];
/** The camera's worker: a build of its own, outside the chunk graph. */
const VIN_ASSETS = [/(^|\/)vinWork\.worker-[\w-]+\.js$/];
/** The type's Latin letters, which French needs too; other alphabets and the older format are left to the browser. */
const SHELL_FONTS = /-latin-\d+-normal-[\w-]+\.woff2$/;

export function shellFiles(bundle: Record<string, BundleFile>): {
  shell: string[];
  vin: string[];
  garage: string[];
} {
  const all = Object.values(bundle);
  const collect = (starts: string[], lazy: (file: BundleFile) => boolean, skip: Set<string>) => {
    const files = new Set<string>();
    const seen = new Set<string>();
    const visit = (fileName: string) => {
      const file = bundle[fileName];
      if (!file || seen.has(fileName) || skip.has(`/${fileName}`)) return;
      seen.add(fileName);
      files.add(`/${fileName}`);
      for (const css of file.viteMetadata?.importedCss ?? []) files.add(`/${css}`);
      for (const next of file.imports ?? []) visit(next);
      if (lazy(file)) for (const next of file.dynamicImports ?? []) visit(next);
    };
    starts.forEach(visit);
    return files;
  };

  const entries = all.filter((file) => file.type === 'chunk' && file.isEntry);
  const shell = collect(
    entries.map((file) => file.fileName),
    () => false,
    new Set(),
  );
  for (const file of all) if (SHELL_FONTS.test(file.fileName)) shell.add(`/${file.fileName}`);

  const chunksOf = (patterns: RegExp[]) =>
    all
      .filter(
        (file) =>
          file.type === 'chunk' &&
          [file.facadeModuleId ?? '', ...(file.moduleIds ?? [])].some((id) =>
            patterns.some((pattern) => pattern.test(id)),
          ),
      )
      .map((file) => file.fileName);

  // From the VIN page, every lazy import too, but not back through the shell,
  // whose lazy imports are the other pages.
  const vin = collect(chunksOf([VIN_PAGE]), () => true, shell);
  for (const file of all)
    if (VIN_ASSETS.some((pattern) => pattern.test(file.fileName))) vin.add(`/${file.fileName}`);

  const garage = collect(chunksOf(GARAGE_PAGES), () => true, shell);

  return { shell: [...shell].sort(), vin: [...vin].sort(), garage: [...garage].sort() };
}
