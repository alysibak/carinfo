import { beforeAll, describe, expect, it } from 'vitest';
import type { CanadianRecall, Car } from '../types/car.types.js';
import { getAllCars } from './car.service.js';
import { newRecalls, recallsForCar, renderRecallAlert } from './recall-alerts.service.js';

let recalled: { car: Car; recalls: CanadianRecall[] };

beforeAll(() => {
  // A car whose model year has at least two recalls that cover its powertrain.
  const car = getAllCars().find((c) => (recallsForCar(c.id)?.recalls.length ?? 0) >= 2)!;
  recalled = recallsForCar(car.id)!;
});

describe('newRecalls', () => {
  it('returns what is listed and not yet noted', () => {
    const [first, ...rest] = recalled.recalls;
    const noted = new Map([[recalled.car.id, new Set(rest.map((r) => r.number))]]);
    const found = newRecalls([recalled.car.id], noted);
    expect(found.map((item) => item.recall.number)).toEqual([first.number]);
    expect(newRecalls([recalled.car.id], new Map()).length).toBe(recalled.recalls.length);
  });

  it('skips cars no longer on file', () => {
    expect(recallsForCar('no-such-car')).toBeNull();
    expect(newRecalls(['no-such-car'], new Map())).toEqual([]);
  });
});

describe('renderRecallAlert', () => {
  const origin = 'https://carinfo.example';
  const item = (recall: Partial<CanadianRecall>, car = recalled.car) => ({
    carId: car.id,
    car,
    recall: { ...recalled.recalls[0], ...recall },
  });

  it('names the car and the recall, links to it, and says how to stop', () => {
    const message = renderRecallAlert({
      to: 'a@example.com',
      items: [item({})],
      origin,
      token: 'abc.def',
    });
    expect(message.subject).toMatch(/^A new recall for your \d{4} /);
    expect(message.text).toContain(`Recall ${recalled.recalls[0].number}`);
    expect(message.text).toContain(`${origin}/car/${recalled.car.id}#recalls`);
    expect(message.text).toContain(`To stop them: ${origin}/unsubscribe?token=abc.def`);
    expect(message.headers).toEqual({
      'List-Unsubscribe': `<${origin}/api/alerts/unsubscribe?token=abc.def>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });

  it('counts recalls for one car, and cars for several', () => {
    const two = renderRecallAlert({
      to: 'a@example.com',
      items: [item({ number: '1' }), item({ number: '2' })],
      origin,
      token: 't',
    });
    expect(two.subject).toMatch(/^2 new recalls for your /);
    const other = getAllCars().find((c) => c.id !== recalled.car.id)!;
    const cars = renderRecallAlert({
      to: 'a@example.com',
      items: [item({ number: '1' }), item({ number: '2' }, other)],
      origin,
      token: 't',
    });
    expect(cars.subject).toBe('New recalls for 2 cars in your garage');
  });

  it('escapes the notice in HTML and shortens a long one', () => {
    const message = renderRecallAlert({
      to: 'a@example.com',
      items: [item({ summary: `<script>alert(1)</script> ${'word '.repeat(200)}` })],
      origin,
      token: 't',
    });
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.text.length).toBeLessThan(1500);
    expect(message.text).toContain('…');
  });
});
