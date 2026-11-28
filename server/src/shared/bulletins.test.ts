import { describe, expect, it } from 'vitest';
import { bulletinKind, bulletinSystem, bulletinText } from './bulletins';

describe('bulletinText', () => {
  it('puts NHTSA’s capitals in sentence case, keeping the shop’s abbreviations', () => {
    expect(bulletinText('SOME VEHICLES MAY HAVE A CVT JUDDER. REPROGRAM THE PCM.')).toBe(
      'Some vehicles may have a CVT judder. Reprogram the PCM.',
    );
    expect(bulletinText('A/C BLOWS WARM AIR AT IDLE; REPLACE THE HVAC CONTROL MODULE.')).toBe(
      'A/C blows warm air at idle; replace the HVAC control module.',
    );
  });

  it('keeps codes, numbers and the car’s own names as written', () => {
    expect(
      bulletinText('2016-2018 CIVIC 2.0L: MIL ON WITH DTC P0420. SEE BULLETIN 19-001.', [
        'Honda',
        'Civic',
      ]),
    ).toBe('2016-2018 Civic 2.0L: MIL on with DTC P0420. See bulletin 19-001.');
  });

  it('leaves text that already has lowercase alone', () => {
    expect(bulletinText('  Rattle from the  dash at 40 km/h ')).toBe(
      'Rattle from the dash at 40 km/h',
    );
  });

  it('reads plain words that look like abbreviations in lowercase', () => {
    expect(bulletinText('THE CAMERA CAN SHOW A BLANK MAP SCREEN.')).toBe(
      'The camera can show a blank map screen.',
    );
  });
});

describe('bulletinKind', () => {
  it('finds a warranty extension in the makers’ words', () => {
    expect(bulletinKind('WARRANTY EXTENSION: AIR CONDITIONING CONDENSER')).toBe('warranty');
    expect(bulletinKind('SPECIAL COVERAGE ADJUSTMENT - FUEL PUMP')).toBe('warranty');
    expect(bulletinKind('HONDA IS EXTENDING... EXTENDED WARRANTY ON THE CVT TO 7 YEARS')).toBe(
      'warranty',
    );
    expect(bulletinKind('THIS NOTICE EXTENDS THE POWERTRAIN WARRANTY')).toBe('warranty');
  });

  it('finds a free repair program', () => {
    expect(bulletinKind('CUSTOMER SATISFACTION PROGRAM 19N02 - REAR SEAT LATCH')).toBe('program');
    expect(bulletinKind('LIMITED SERVICE CAMPAIGN: ENGINE MOUNT')).toBe('program');
  });

  it('is not fooled by a bulletin that says it is neither', () => {
    expect(bulletinKind('THIS IS NOT A WARRANTY EXTENSION. REPLACE THE GASKET.')).toBeUndefined();
    expect(bulletinKind('IF THE VEHICLE IS OUT OF WARRANTY, CUSTOMER PAYS')).toBeUndefined();
    expect(bulletinKind('ROUGH IDLE AFTER COLD START: REPROGRAM THE ECM')).toBeUndefined();
  });
});

describe('bulletinSystem', () => {
  it('takes the system from NHTSA’s component path', () => {
    expect(bulletinSystem('POWER TRAIN:AUTOMATIC TRANSMISSION')).toBe('POWER TRAIN');
    expect(bulletinSystem('ELECTRICAL SYSTEM')).toBe('ELECTRICAL SYSTEM');
    expect(bulletinSystem('')).toBe('UNKNOWN OR OTHER');
  });
});
