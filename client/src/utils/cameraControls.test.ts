import { describe, expect, it } from 'vitest';
import {
  backLenses,
  clampZoom,
  frameLook,
  stepFor,
  TroubleWatch,
  troubleOf,
  zoomRange,
  zoomSteps,
} from './cameraControls';

describe('zoomRange', () => {
  it('uses the camera’s own zoom where it offers one', () => {
    expect(zoomRange({ min: 1, max: 10 })).toEqual({ min: 1, max: 6, own: true });
  });

  it('enlarges the picture on screen where the camera offers none', () => {
    expect(zoomRange(undefined)).toEqual({ min: 1, max: 4, own: false });
    expect(zoomRange({ min: 1, max: 1 })).toEqual({ min: 1, max: 4, own: false });
  });
});

describe('zoom steps', () => {
  const range = zoomRange({ min: 1, max: 4 });

  it('keeps a zoom within the range, to a tenth', () => {
    expect(clampZoom(2.345, range)).toBe(2.3);
    expect(clampZoom(9, range)).toBe(4);
    expect(clampZoom(0.2, range)).toBe(1);
    expect(clampZoom(Number.NaN, range)).toBe(1);
  });

  it('offers the steps the range reaches', () => {
    expect(zoomSteps(range)).toEqual([1, 2, 3]);
    expect(zoomSteps(zoomRange({ min: 1, max: 8 }))).toEqual([1, 2, 3, 5]);
  });

  it('lights the step a zoom falls under', () => {
    expect(stepFor(1, [1, 2, 3])).toBe(1);
    expect(stepFor(2.4, [1, 2, 3])).toBe(2);
    expect(stepFor(1.98, [1, 2, 3])).toBe(2);
  });
});

describe('backLenses', () => {
  const camera = (label: string, deviceId = label) => ({ kind: 'videoinput', deviceId, label });

  it('names an iPhone’s back lenses and leaves out the front one', () => {
    const lenses = backLenses([
      camera('Front Camera'),
      camera('Back Camera'),
      camera('Back Ultra Wide Camera'),
      camera('Back Telephoto Camera'),
      { kind: 'audioinput', deviceId: 'mic', label: 'iPhone Microphone' },
    ]);
    expect(lenses.map((lens) => lens.name)).toEqual(['Main', 'Ultra wide', 'Telephoto']);
  });

  it('numbers an Android phone’s back cameras', () => {
    const lenses = backLenses([
      camera('camera2 0, facing back'),
      camera('camera2 1, facing front'),
      camera('camera2 2, facing back'),
    ]);
    expect(lenses.map((lens) => lens.name)).toEqual(['Camera 1', 'Camera 2']);
  });

  it('offers a computer’s webcams by name', () => {
    expect(
      backLenses([camera('Logitech BRIO'), camera('Integrated Webcam')]).map((l) => l.name),
    ).toEqual(['Logitech BRIO', 'Integrated Webcam']);
  });
});

describe('frameLook and troubleOf', () => {
  const pixels = (values: number[]) => new Uint8ClampedArray(values.flatMap((v) => [v, v, v, 255]));

  it('finds a dark picture dark', () => {
    const look = frameLook(pixels([10, 20, 30, 40]), 2, 2);
    expect(look.light).toBe(25);
    expect(look.contrast).toBeCloseTo(11.18, 1);
    expect(troubleOf(look)).toBe('dark');
  });

  it('finds no trouble in a black plate’s bright print', () => {
    const look = frameLook(pixels([5, 5, 5, 5, 5, 5, 5, 120]), 8, 1);
    expect(look.light).toBeLessThan(35);
    expect(troubleOf(look)).toBeNull();
  });

  it('finds a reflection where part of the picture is blown white', () => {
    const look = frameLook(pixels([255, 255, 120, 120, 120, 120, 120, 120, 120, 120]), 10, 1);
    expect(look.glare).toBeCloseTo(0.2);
    expect(troubleOf(look)).toBe('glare');
  });

  it('finds no reflection in a white label filling the picture', () => {
    const look = frameLook(pixels([255, 255, 255, 255, 255, 255, 255, 255, 20, 20]), 10, 1);
    expect(troubleOf(look)).toBeNull();
  });

  it('finds nothing wrong with a clear picture', () => {
    expect(troubleOf(frameLook(pixels([200, 40, 200, 40]), 2, 2))).toBeNull();
  });
});

describe('TroubleWatch', () => {
  it('says a trouble once most recent frames show it, and unsays it the same way', () => {
    const watch = new TroubleWatch(6, 4);
    expect(watch.add('dark')).toBeNull();
    watch.add('dark');
    watch.add(null);
    // Three dark frames of four: not yet.
    expect(watch.add('dark')).toBeNull();
    expect(watch.add('dark')).toBe('dark');
    // Light again: said until four of the last six are clear.
    watch.add(null);
    expect(watch.add(null)).toBe('dark');
    expect(watch.add(null)).toBeNull();
  });
});
