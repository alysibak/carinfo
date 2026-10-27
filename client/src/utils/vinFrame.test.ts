import { describe, expect, it } from 'vitest';
import { guideCrop } from './vinFrame';

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height }) as DOMRect;

describe('guideCrop', () => {
  it('maps the guide onto a picture shown at its own size', () => {
    const crop = guideCrop(
      { videoWidth: 1000, videoHeight: 500 },
      rect(0, 0, 1000, 500),
      rect(100, 200, 800, 100),
      0,
    );
    expect(crop).toEqual({ x: 100, y: 200, width: 800, height: 100 });
  });

  it('allows for the sides cut off when the picture fills a taller frame', () => {
    // 1280×720 shown in 1280×800 is scaled by 10/9 and loses 71 px each side.
    const crop = guideCrop(
      { videoWidth: 1280, videoHeight: 720 },
      rect(0, 0, 1280, 800),
      rect(352, 258, 576, 128),
      0,
    )!;
    expect(crop.x).toBeCloseTo(380.8, 1);
    expect(crop.y).toBeCloseTo(232.2, 1);
    expect(crop.width).toBeCloseTo(518.4, 1);
  });

  it('adds a margin round the guide, kept inside the picture', () => {
    const crop = guideCrop(
      { videoWidth: 1000, videoHeight: 500 },
      rect(0, 0, 1000, 500),
      rect(0, 0, 500, 100),
    )!;
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
    // Cut at the picture's left and top; the right and bottom margins as they were.
    expect(crop.width).toBeCloseTo(560);
    expect(crop.height).toBeCloseTo(112);
  });

  it('gives nothing for a guide outside the picture', () => {
    expect(
      guideCrop(
        { videoWidth: 1000, videoHeight: 500 },
        rect(0, 0, 1000, 500),
        rect(0, 600, 500, 100),
      ),
    ).toBeNull();
  });

  it('gives nothing before the camera has a picture', () => {
    expect(
      guideCrop({ videoWidth: 0, videoHeight: 0 }, rect(0, 0, 100, 100), rect(0, 0, 50, 10)),
    ).toBeNull();
  });
});
