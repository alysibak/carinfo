import { describe, expect, it } from 'vitest';
import { investigationsFor, isAboutTheCar } from './safety-records.service.js';

describe('NHTSA investigations', () => {
  it('leaves out audits of dealers, rental fleets and paperwork, and keeps defects', () => {
    expect(isAboutTheCar({ kind: 'AQ', subject: 'Hertz/Vehicles Rented with Open Recalls' })).toBe(
      false,
    );
    expect(isAboutTheCar({ kind: 'AQ', subject: 'Healey Brothers Ford / Open Recall Sale' })).toBe(
      false,
    );
    expect(
      isAboutTheCar({
        kind: 'AQ',
        subject: 'Compliance with Standing General Order 2021-01 Reporting Requirements',
      }),
    ).toBe(false);
    expect(isAboutTheCar({ kind: 'AQ', subject: 'Hyundai and Kia ABS Module Fires' })).toBe(true);
    expect(isAboutTheCar({ kind: 'PE', subject: 'Seat Belt Retraction' })).toBe(true);
  });

  it('lists a model year’s investigations, newest first, where the file is on hand', () => {
    const crv = investigationsFor('honda|cr-v', 2017);
    if (!crv.length) return; // data/investigations.json not built here
    expect(crv.map((inv) => inv.id)).toContain('EA24002');
    const opened = crv.map((inv) => inv.opened);
    expect([...opened].sort().reverse()).toEqual(opened);
    expect(investigationsFor('nissan|altima', 2019).some((inv) => /Hertz/.test(inv.subject))).toBe(
      false,
    );
  });
});
