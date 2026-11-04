import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, expect, it } from 'vitest';
import fr from './fr';

/**
 * Every text marked for translation has a French entry, and each entry keeps
 * its English's placeholders ({count}) and element tags (<0>…</0>). Only
 * literal text can be checked, which is why labels kept in lists are marked
 * with msg('…') where they are written.
 */
const SRC = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // i18n/ itself only shows how to call t() in its comments.
    if (statSync(path).isDirectory()) {
      return ['i18n', 'test'].includes(name) ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function unescape(body: string): string {
  return body.replace(/\\(u\{?[0-9a-fA-F]+\}?|.)/g, (_, code: string) => {
    if (code === 'n') return '\n';
    if (code === 't') return '\t';
    if (code[0] === 'u') return String.fromCodePoint(parseInt(code.replace(/[u{}]/g, ''), 16));
    return code;
  });
}

const STRING = String.raw`(['"\x60])((?:\\.|(?!\1)[^\\])*?)\1`;
const MARKED = new RegExp(String.raw`\b(?:t|msg)\(\s*${STRING}`, 'g');
const PLURAL = new RegExp(
  String.raw`\btp\(\s*[^,()]+,\s*${STRING}\s*,\s*${STRING.replace(/\\1/g, '\\3')}`,
  'g',
);

function marked(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    const code = readFileSync(file, 'utf8');
    const where = relative(SRC, file);
    for (const match of code.matchAll(MARKED)) {
      if (match[1] === '`' && match[2].includes('${')) continue;
      found.set(unescape(match[2]), where);
    }
    for (const match of code.matchAll(PLURAL)) {
      found.set(unescape(match[2]), where);
      found.set(unescape(match[4]), where);
    }
  }
  return found;
}

const shape = (text: string) => [...text.matchAll(/\{(\w+)\}|<\/?(\d+)>/g)].map((m) => m[0]).sort();

describe('French coverage', () => {
  it('has a French entry for every text marked for translation', () => {
    const missing = [...marked()].filter(([text]) => !(text in fr));
    expect(missing.map(([text, file]) => `${file}: ${text}`)).toEqual([]);
  });

  it('keeps each entry’s placeholders and element tags', () => {
    const broken = Object.entries(fr).filter(([en, french]) => {
      return JSON.stringify(shape(en)) !== JSON.stringify(shape(french));
    });
    expect(broken.map(([en]) => en)).toEqual([]);
  });
});
