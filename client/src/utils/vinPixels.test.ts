import { describe, expect, it } from 'vitest';
import { greyOf, levelled, PASSES, slantOf, stretched, strokesOnly, toPgm } from './vinPixels';

/**
 * A white picture with two rows of dark "characters" (short bars), the rows
 * rising to the right at `degrees`, as a VIN plate seen at a slant.
 */
function slantedRows(width: number, height: number, degrees: number): Uint8ClampedArray {
  const grey = new Uint8ClampedArray(width * height).fill(230);
  const tan = Math.tan((degrees * Math.PI) / 180);
  for (const baseline of [height * 0.4, height * 0.7]) {
    for (let start = 30; start + 16 < width - 30; start += 26) {
      for (let x = start; x < start + 16; x++) {
        const middle = baseline - (x - width / 2) * tan;
        for (let y = Math.round(middle - 9); y <= Math.round(middle + 9); y++) {
          if (y >= 0 && y < height) grey[y * width + x] = 20;
        }
      }
    }
  }
  return grey;
}

describe('slantOf', () => {
  it('finds no slant in level print', () => {
    expect(slantOf(slantedRows(700, 160, 0), 700, 160)).toBe(0);
  });

  it('finds how far print rises to the right, or falls', () => {
    expect(slantOf(slantedRows(700, 160, 8), 700, 160)).toBeCloseTo(8, 0);
    expect(slantOf(slantedRows(700, 160, -12), 700, 160)).toBeCloseTo(-12, 0);
  });

  it('says nothing of a blank picture', () => {
    expect(slantOf(new Uint8ClampedArray(700 * 160).fill(230), 700, 160)).toBe(0);
  });
});

describe('levelled', () => {
  it('turns slanted print level', () => {
    const slanted = slantedRows(700, 160, 8);
    const level = levelled(slanted, 700, 160, slantOf(slanted, 700, 160));
    expect(slantOf(level, 700, 160)).toBe(0);
  });

  it('fills what it turns in from beyond the edges with the edge’s own shade', () => {
    const black = new Uint8ClampedArray(100 * 50);
    const turned = levelled(black, 100, 50, 10);
    expect(turned[0]).toBe(0);
    expect(turned[25 * 100 + 50]).toBe(0);
  });

  it('finds the slant of light print on a dark plate, and of a plate on a dark dashboard', () => {
    const light = slantedRows(700, 160, 9).map((v) => 255 - v);
    expect(slantOf(light, 700, 160)).toBeCloseTo(9, 0);
  });
});

describe('the passes', () => {
  it('stretches grey to full contrast', () => {
    const out = stretched(new Uint8ClampedArray([100, 100, 120, 140, 160, 160]));
    expect(out[0]).toBe(0);
    expect(out[5]).toBe(255);
  });

  it('keeps light print on a darker plate, dark on white, and drops the plate', () => {
    // A grey plate (120) with one light stroke (220) three pixels wide.
    const width = 40;
    const height = 30;
    const grey = new Uint8ClampedArray(width * height).fill(120);
    for (let y = 5; y < 25; y++) for (let x = 18; x < 21; x++) grey[y * width + x] = 220;
    const out = strokesOnly(grey, width, height, true, 6);
    expect(out[15 * width + 19]).toBe(0);
    expect(out[15 * width + 5]).toBe(255);
  });

  it('offers three ways', () => {
    expect(PASSES).toHaveLength(3);
  });

  it('makes RGBA pixels grey', () => {
    expect([...greyOf(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]))]).toEqual([
      255, 0,
    ]);
  });
});

describe('toPgm', () => {
  it('writes a PGM header and the grey values after it', () => {
    const file = toPgm(new Uint8ClampedArray([0, 128, 255, 7]), 2, 2);
    const header = 'P5\n2 2\n255\n';
    expect(new TextDecoder().decode(file.slice(0, header.length))).toBe(header);
    expect([...file.slice(header.length)]).toEqual([0, 128, 255, 7]);
  });
});
