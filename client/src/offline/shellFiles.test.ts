import { describe, expect, it } from 'vitest';
import { shellFiles, type BundleFile } from './shellFiles';

const chunk = (fileName: string, extra: Partial<BundleFile> = {}): BundleFile => ({
  type: 'chunk',
  fileName,
  ...extra,
});
const asset = (fileName: string): BundleFile => ({ type: 'asset', fileName });

function bundleOf(files: BundleFile[]): Record<string, BundleFile> {
  return Object.fromEntries(files.map((file) => [file.fileName, file]));
}

describe('shellFiles', () => {
  const bundle = bundleOf([
    chunk('assets/index-a.js', {
      isEntry: true,
      imports: ['assets/vendor-b.js'],
      dynamicImports: [
        'assets/Compare-c.js',
        'assets/VinDecoder-d.js',
        'assets/DreamGarage-m.js',
        'assets/CarDetail-n.js',
      ],
      viteMetadata: { importedCss: new Set(['assets/index-a.css']) },
    }),
    chunk('assets/vendor-b.js'),
    chunk('assets/Compare-c.js', { facadeModuleId: '/app/src/pages/Compare.tsx' }),
    // Merged with other modules, so no facade: found by what it holds. It
    // imports the entry, as Vite's chunks do.
    chunk('assets/VinDecoder-d.js', {
      facadeModuleId: null,
      moduleIds: ['/app/src/pages/VinDecoder.tsx', '/app/src/utils/vinReader.ts'],
      imports: ['assets/index-a.js', 'assets/vendor-b.js', 'assets/CarCard-l.js'],
      dynamicImports: ['assets/VinScanner-e.js'],
    }),
    chunk('assets/CarCard-l.js'),
    chunk('assets/VinScanner-e.js', { dynamicImports: ['assets/tesseract-f.js'] }),
    chunk('assets/tesseract-f.js'),
    asset('assets/vinWork.worker-g.js'),
    asset('assets/archivo-latin-400-normal-h.woff2'),
    asset('assets/archivo-latin-ext-400-normal-i.woff2'),
    asset('assets/archivo-latin-400-normal-j.woff'),
    asset('index.html'),
    chunk('assets/DreamGarage-m.js', {
      facadeModuleId: '/app/src/pages/DreamGarage.tsx',
      imports: ['assets/index-a.js', 'assets/CarCard-l.js'],
    }),
    chunk('assets/CarDetail-n.js', {
      facadeModuleId: '/app/src/pages/CarDetail.tsx',
      imports: ['assets/index-a.js'],
      dynamicImports: ['assets/TCOCalculator-o.js'],
    }),
    chunk('assets/TCOCalculator-o.js'),
  ]);

  it('keeps the shell: the entry, its imports, styles and Latin fonts', () => {
    expect(shellFiles(bundle).shell).toEqual([
      '/assets/archivo-latin-400-normal-h.woff2',
      '/assets/index-a.css',
      '/assets/index-a.js',
      '/assets/vendor-b.js',
    ]);
  });

  it('keeps the VIN page with all it loads, apart from the shell', () => {
    expect(shellFiles(bundle).vin).toEqual([
      '/assets/CarCard-l.js',
      '/assets/VinDecoder-d.js',
      '/assets/VinScanner-e.js',
      '/assets/tesseract-f.js',
      '/assets/vinWork.worker-g.js',
    ]);
  });

  it('does not take the other pages in through the entry', () => {
    const { shell, vin } = shellFiles(bundle);
    expect([...shell, ...vin]).not.toContain('/assets/Compare-c.js');
  });

  it('keeps the garage and the car page saved cars open, with what they load', () => {
    expect(shellFiles(bundle).garage).toEqual([
      '/assets/CarCard-l.js',
      '/assets/CarDetail-n.js',
      '/assets/DreamGarage-m.js',
      '/assets/TCOCalculator-o.js',
    ]);
  });
});
